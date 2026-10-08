// Notifications Web Push : reçues même application fermée, tant que l'utilisateur est connecté sur l'appareil.
// Les clés VAPID viennent de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, sinon sont générées une fois et gardées en base.
import webpush from 'web-push';
import { db } from './db.mjs';
import { HttpError } from './httpError.mjs';

const BATCH = 25; // envois simultanés
const TTL_S = 24 * 3600; // un message non livré en 24 h est abandonné
const MAX_SUBSCRIPTIONS_PER_USER = 10;
const LANGS = new Set(['fr', 'en', 'es']);

let sender = (subscription, payload, options) =>
  webpush.sendNotification(subscription, payload, options);
/** Réservé aux tests : remplace l'envoi réel. */
export const setPushSender = (fn) => {
  sender = fn;
};

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

/** Contact transmis aux services de push (obligatoire) : VAPID_SUBJECT, sinon le premier administrateur. */
const subject = () => {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit && /^(mailto:|https:\/\/)/.test(explicit)) return explicit;
  const admin = adminEmails()[0];
  return admin ? `mailto:${admin}` : null;
};

let keysPromise = null;
const loadKeys = () => {
  keysPromise ??= (async () => {
    const contact = subject();
    if (!contact) {
      console.warn(
        '[push] Désactivé : définissez ADMIN_EMAILS ou VAPID_SUBJECT (mailto:… ou https://…).',
      );
      return null;
    }
    let publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    let privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey) {
      const rows = await db
        .prepare("SELECT key, value FROM meta WHERE key IN ('vapid_public', 'vapid_private')")
        .all();
      publicKey = rows.find((r) => r.key === 'vapid_public')?.value;
      privateKey = rows.find((r) => r.key === 'vapid_private')?.value;
      if (!publicKey || !privateKey) {
        const fresh = webpush.generateVAPIDKeys();
        // ON CONFLICT : deux instances qui démarrent ensemble gardent la même paire
        for (const [key, value] of [
          ['vapid_public', fresh.publicKey],
          ['vapid_private', fresh.privateKey],
        ])
          await db
            .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING')
            .run(key, value);
        const stored = await db
          .prepare("SELECT key, value FROM meta WHERE key IN ('vapid_public', 'vapid_private')")
          .all();
        publicKey = stored.find((r) => r.key === 'vapid_public').value;
        privateKey = stored.find((r) => r.key === 'vapid_private').value;
      }
    }
    webpush.setVapidDetails(contact, publicKey, privateKey);
    return { publicKey };
  })().catch((err) => {
    keysPromise = null; // nouvel essai à la prochaine demande
    throw err;
  });
  return keysPromise;
};

/** Clé publique à transmettre au navigateur, ou null si le push est désactivé. */
export const getPublicKey = async () => (await loadKeys())?.publicKey ?? null;

// Le serveur envoie une requête à l'URL d'abonnement fournie par le client : seuls les services de push
// des navigateurs sont acceptés, pour qu'un abonnement ne puisse pas viser un service interne (SSRF).
const PUSH_HOSTS = [
  'fcm.googleapis.com', // Chrome, Edge, Opera, Brave, Android
  'android.googleapis.com',
  '.push.services.mozilla.com', // Firefox
  '.push.apple.com', // Safari (macOS, iOS)
  '.notify.windows.com', // Edge (Windows)
  ...(process.env.PUSH_EXTRA_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
];

export const isAllowedEndpoint = (endpoint) => {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443'))
      return false;
    const host = u.hostname.toLowerCase();
    return PUSH_HOSTS.some((h) => (h.startsWith('.') ? host.endsWith(h) : host === h));
  } catch {
    return false;
  }
};

const b64url = /^[A-Za-z0-9_-]{16,200}$/;

/** Enregistre (ou transfère) l'abonnement d'un appareil au compte connecté. */
export const saveSubscription = async (user, body) => {
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (
    typeof endpoint !== 'string' ||
    endpoint.length > 1000 ||
    !isAllowedEndpoint(endpoint) ||
    !b64url.test(p256dh ?? '') ||
    !b64url.test(auth ?? '')
  )
    throw new HttpError(400, 'Abonnement invalide');
  const lang = LANGS.has(body.lang) ? body.lang : 'fr';
  // Un même appareil peut changer de compte : l'abonnement suit le dernier utilisateur connecté
  await db
    .prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, lang) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, lang = EXCLUDED.lang`,
    )
    .run(user.id, endpoint, p256dh, auth, lang);
  // Borne le nombre d'appareils par compte : on garde les plus récents
  await db
    .prepare(
      `DELETE FROM push_subscriptions WHERE user_id = ? AND id NOT IN
       (SELECT id FROM push_subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT ${MAX_SUBSCRIPTIONS_PER_USER})`,
    )
    .run(user.id, user.id);
};

/** Supprime l'abonnement d'un appareil, uniquement s'il appartient à l'utilisateur. */
export const removeSubscription = async (user, endpoint) => {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return;
  await db
    .prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .run(endpoint, user.id);
};

export const countSubscriptions = async () =>
  (await db.prepare('SELECT COUNT(*) AS cnt FROM push_subscriptions').get()).cnt;

/**
 * Envoie une notification à tous les abonnés (sauf exceptUserId).
 * build(lang) retourne { title, body, url, tag }. Retourne { sent, removed, failed }.
 */
export const pushToAll = async (build, { exceptUserId, urgency = 'normal' } = {}) => {
  const stats = { sent: 0, removed: 0, failed: 0 };
  if (!(await loadKeys())) return stats;
  const rows = exceptUserId
    ? await db
        .prepare(
          'SELECT id, endpoint, p256dh, auth, lang FROM push_subscriptions WHERE user_id <> ?',
        )
        .all(exceptUserId)
    : await db.prepare('SELECT id, endpoint, p256dh, auth, lang FROM push_subscriptions').all();

  const payloads = new Map();
  const payloadFor = (lang) => {
    if (!payloads.has(lang)) payloads.set(lang, JSON.stringify(build(lang)));
    return payloads.get(lang);
  };

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(
      rows.slice(i, i + BATCH).map(async (row) => {
        try {
          await sender(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payloadFor(LANGS.has(row.lang) ? row.lang : 'fr'),
            { TTL: TTL_S, urgency },
          );
          stats.sent += 1;
        } catch (err) {
          // 404/410 : l'appareil s'est désabonné ou l'abonnement a expiré
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(row.id);
            stats.removed += 1;
          } else {
            stats.failed += 1;
          }
        }
      }),
    );
  }
  return stats;
};

/** Lance un envoi sans bloquer la requête qui l'a déclenché. */
export const pushInBackground = (build, options) => {
  pushToAll(build, options).catch((err) =>
    console.error('[push] Envoi impossible :', err instanceof Error ? err.message : err),
  );
};

// ---------- Textes des notifications ----------
const pick = (lang, fr, en, es) => (lang === 'en' ? en : lang === 'es' ? es : fr);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export const communityPostPush =
  ({ author, excerpt }) =>
  (lang) => ({
    title: pick(lang, 'Communauté CyberSens', 'CyberSens Community', 'Comunidad CyberSens'),
    body: pick(
      lang,
      `${author} a publié : « ${excerpt} »`,
      `${author} posted: “${excerpt}”`,
      `${author} publicó: «${excerpt}»`,
    ),
    url: '/?tab=community',
    tag: 'community',
  });

export const newsPush =
  ({ count, items }) =>
  (lang) => ({
    title: pick(lang, 'Actualité cyber', 'Cyber news', 'Noticias de ciberseguridad'),
    body:
      count === 1 && items[0]
        ? clip(items[0].title, 140)
        : pick(
            lang,
            `${count} nouvelles actualités cyber`,
            `${count} new cybersecurity articles`,
            `${count} nuevas noticias de ciberseguridad`,
          ),
    url: '/?tab=news',
    tag: 'news',
  });

export const announcementPush =
  ({ title, body }) =>
  () => ({
    title: clip(title, 80),
    body: clip(body, 200),
    url: '/',
    tag: 'announce',
  });
