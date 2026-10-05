# Avis sur l'accueil et notifications en temps réel — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Afficher sur l'Accueil public les avis de vrais utilisateurs et le nombre de membres, et notifier en direct les utilisateurs connectés des nouveaux posts de la Communauté et des nouvelles actualités.

**Architecture :** Une table `reviews` et trois routes dans `server/api.mjs` (lecture publique, écriture connectée). Un module serveur `server/liveFeed.mjs` tient les connexions SSE (même technique que `server/rooms.mjs`) et diffuse deux événements : `community_post` (publié par la création d'un post) et `news` (détecté par `server/news.mjs` à chaque rafraîchissement du cache). Côté client, un hook `useLiveFeed` transforme chaque événement en toast `cyber-notify` existant.

**Tech Stack :** Node 24 (ESM `.mjs`), PostgreSQL / PGlite via `server/db.mjs`, `node --test`, React 19 + TypeScript, Tailwind, lucide-react.

**Spec :** `docs/superpowers/specs/2026-10-05-avis-et-notifications-temps-reel-design.md`

## Écarts assumés par rapport à la spec

Trois simplifications décidées après lecture du code. La spec est mise à jour dans la Task 6.

- L'écriture/mise à jour d'un avis se fait par `POST /api/reviews` (upsert) et non `PUT` : `services/apiClient.ts` ne gère que GET/POST/PATCH/DELETE.
- Le réglage « notifications en direct » est une préférence **locale à l'appareil** (`localStorage`), pas `settings` serveur : aucun impact sur la synchronisation du profil.
- Le toast `cyber-notify` n'a pas d'action cliquable : le message est suffisant, et il reste dans l'historique de la cloche.

## Global Constraints

- Réponses, textes d'interface et commentaires en français ; textes d'interface en trois langues via `useL()` (FR / EN / ES).
- Migrations : **ne jamais modifier** une migration existante de `server/db.mjs`, en ajouter une à la fin du tableau `MIGRATIONS`.
- Avis : une note entière de 1 à 5, texte de 10 à 500 caractères, un seul avis par compte (`UNIQUE (user_id)`).
- Texte utilisateur rendu uniquement comme texte React, jamais en HTML.
- Flux SSE : maximum **3** connexions par utilisateur ; ping `: ping` toutes les 20 s ; l'auteur d'un post ne reçoit pas sa propre notification.
- Actualités : au plus **3** articles listés par événement `news`, aucun événement au premier remplissage du cache.
- `members` = `SELECT COUNT(*) FROM users`, mis en cache 5 min, aucun autre détail exposé.
- Avant commit : `git status`, `git diff`, aucun fichier sensible. Commits terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Tests : `npm test` (`node --test "tests/**/*.test.mjs"`), puis `npm run check` (lint, typecheck, tests, build).

## Review Focus

Cas que la spec sous-entend sans les nommer ; chacun est épinglé par un test dans la tâche indiquée.

1. Texte d'avis contenant du HTML (`<script>…`) : stocké tel quel, renvoyé en chaîne, jamais interprété (Task 1 test « HTML » ; rendu React échappé en Task 5).
2. Note hors bornes ou mal typée (`0`, `6`, `3.5`, `"5"`) et texte trop court/long : refus `400` (Task 1).
3. Appel anonyme : `POST /api/reviews` et `GET /api/live/stream` répondent `401`, `GET /api/reviews` fonctionne sans cookie avec zéro avis (Tasks 1 et 2).
4. Utilisateur qui ouvre plus de 3 onglets : la plus ancienne connexion est fermée, pas d'accumulation (Task 2).
5. Démarrage du serveur ou sources d'actualités toutes en échec : aucune rafale de notifications, cache précédent conservé (Task 3).

---

### Task 1 : Table `reviews`, API des avis et nombre de membres

**Files:**

- Create: `tests/helpers/apiHarness.mjs`
- Create: `tests/reviews.test.mjs`
- Modify: `server/db.mjs` (ajouter une migration à la fin de `MIGRATIONS`, après `ALTER TABLE sessions …`)
- Modify: `server/api.mjs` (routes après `'DELETE /api/community/comments'`, helper `resetMembersCache` exporté près de `resetRateLimits`)

**Interfaces:**

- Produces (pour Tasks 2 et 5) :
  - `startHarness(prefix: string, env?: Record<string,string>) → { BASE, client(), register(name, email), resetMembersCache(), stop() }` ; `client()` → `{ call(method, url, body?) → { status, data }, cookie: string }`.
  - `GET /api/reviews` → `{ members: number, average: number, count: number, reviews: { id, rating, body, author, authorLevel, createdAt }[] }` (6 plus récents, public).
  - `GET /api/reviews/mine` → `{ review: { id, rating, body } | null }`.
  - `POST /api/reviews` body `{ rating, body }` → `{ ok: true }` (upsert).
  - `DELETE /api/reviews` (son propre avis) ou `DELETE /api/reviews?id=N` (admin) → `{ ok: true }`.
  - `export const resetMembersCache = () => void` dans `server/api.mjs`.

- [ ] **Step 1 : Écrire le harnais de test partagé**

Créer `tests/helpers/apiHarness.mjs` (le glob `tests/**/*.test.mjs` ne l'exécute pas) :

```js
// Démarre l'API sur une base PGlite temporaire pour les tests d'intégration.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PASSWORD = 'soleil-riviere-mangue-7';

export const startHarness = async (prefix, env = {}) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `cybersens-${prefix}-`));
  process.env.DB_PATH = path.join(tmpDir, 'pglite');
  Object.assign(process.env, env);

  const apiMod = await import('../../server/api.mjs');
  const { closeDb } = await import('../../server/db.mjs');

  const server = http.createServer(async (req, res) => {
    if (!(await apiMod.handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const BASE = `http://127.0.0.1:${server.address().port}`;

  const client = () => {
    let cookie = '';
    const call = async (method, url, body) => {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (cookie) headers.Cookie = cookie;
      const res = await fetch(BASE + url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* pas de corps */
      }
      return { status: res.status, data };
    };
    return {
      call,
      get cookie() {
        return cookie;
      },
    };
  };

  const register = async (name, email) => {
    apiMod.resetRateLimits('register:');
    const c = client();
    const r = await c.call('POST', '/api/auth/register', {
      acceptTerms: true,
      name,
      email,
      password: PASSWORD,
      role: 'Étudiant',
    });
    assert.equal(r.status, 201, `inscription de ${email} : ${JSON.stringify(r.data)}`);
    return c;
  };

  return {
    BASE,
    client,
    register,
    resetMembersCache: apiMod.resetMembersCache,
    stop: async () => {
      server.closeAllConnections?.();
      server.close();
      await closeDb();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
};
```

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `tests/reviews.test.mjs` :

```js
// Avis des utilisateurs et nombre de membres : npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let awa;
let bob;
before(async () => {
  h = await startHarness('reviews', { ADMIN_EMAILS: 'admin@test.bf' });
});
after(async () => {
  await h.stop();
});

test('GET /api/reviews est public : vide au départ, compte les membres', async () => {
  const anon = h.client();
  let r = await anon.call('GET', '/api/reviews');
  assert.equal(r.status, 200);
  assert.deepEqual(
    {
      count: r.data.count,
      average: r.data.average,
      reviews: r.data.reviews,
      members: r.data.members,
    },
    { count: 0, average: 0, reviews: [], members: 0 },
  );
  awa = await h.register('Awa Traoré', 'awa@test.bf');
  h.resetMembersCache();
  r = await anon.call('GET', '/api/reviews');
  assert.equal(r.data.members, 1);
});

test('POST /api/reviews : authentification et validation', async () => {
  const anon = h.client();
  assert.equal(
    (await anon.call('POST', '/api/reviews', { rating: 5, body: 'Très bonne plateforme.' })).status,
    401,
  );
  const text = 'Très bonne plateforme.';
  for (const rating of [0, 6, 3.5, '5', null]) {
    const r = await awa.call('POST', '/api/reviews', { rating, body: text });
    assert.equal(r.status, 400, `note ${JSON.stringify(rating)} refusée`);
  }
  assert.equal((await awa.call('POST', '/api/reviews', { rating: 5, body: 'court' })).status, 400);
  assert.equal(
    (await awa.call('POST', '/api/reviews', { rating: 5, body: 'x'.repeat(501) })).status,
    400,
  );
  assert.equal((await awa.call('GET', '/api/reviews/mine')).data.review, null);
});

test('un seul avis par compte (mise à jour) et moyenne', async () => {
  bob = await h.register('Bob Diallo', 'bob@test.bf');
  assert.equal(
    (
      await awa.call('POST', '/api/reviews', {
        rating: 5,
        body: 'Excellente plateforme pour apprendre.',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await awa.call('POST', '/api/reviews', {
        rating: 4,
        body: 'Excellente plateforme, mise à jour.',
      })
    ).status,
    200,
  );
  assert.equal(
    (await bob.call('POST', '/api/reviews', { rating: 3, body: 'Utile mais quelques bugs.' }))
      .status,
    200,
  );

  const mine = (await awa.call('GET', '/api/reviews/mine')).data.review;
  assert.equal(mine.rating, 4);
  assert.equal(mine.body, 'Excellente plateforme, mise à jour.');

  const r = await h.client().call('GET', '/api/reviews');
  assert.equal(r.data.count, 2);
  assert.equal(r.data.average, 3.5);
  assert.equal(r.data.reviews[0].author, 'Bob D.', 'le plus récent en premier, nom abrégé');
  assert.ok(!('email' in r.data.reviews[0]) && !('userId' in r.data.reviews[0]));
});

test('un texte HTML est stocké et renvoyé tel quel (échappé à l’affichage)', async () => {
  const carol = await h.register('Carol Sy', 'carol@test.bf');
  const html = '<script>alert(1)</script> super formation';
  assert.equal((await carol.call('POST', '/api/reviews', { rating: 5, body: html })).status, 200);
  const r = await h.client().call('GET', '/api/reviews');
  assert.equal(r.data.reviews[0].body, html);
  assert.equal(r.data.count, 3);
  assert.equal(r.data.average, 4);
});

test('suppression : son avis, par un admin, interdite aux autres', async () => {
  const anon = h.client();
  const list = (await anon.call('GET', '/api/reviews')).data.reviews;
  const carolId = list.find((x) => x.author === 'Carol S.').id;
  const bobId = list.find((x) => x.author === 'Bob D.').id;

  assert.equal((await bob.call('DELETE', `/api/reviews?id=${carolId}`)).status, 403);
  assert.equal((await awa.call('DELETE', '/api/reviews')).status, 200);
  assert.equal((await anon.call('GET', '/api/reviews')).data.count, 2);

  const admin = await h.register('Admin Test', 'admin@test.bf');
  assert.equal((await admin.call('DELETE', '/api/reviews?id=999999')).status, 404);
  assert.equal((await admin.call('DELETE', `/api/reviews?id=${bobId}`)).status, 200);
  assert.equal((await anon.call('GET', '/api/reviews')).data.count, 1);
});
```

- [ ] **Step 3 : Lancer les tests, vérifier l'échec**

Run : `node --test tests/reviews.test.mjs`
Expected : FAIL (`h.resetMembersCache is not a function` ou route inconnue `404`).

- [ ] **Step 4 : Ajouter la migration**

Dans `server/db.mjs`, ajouter une entrée à la fin du tableau `MIGRATIONS` (après la migration `ALTER TABLE sessions ADD COLUMN admin_unlocked_until TEXT;`) :

```js
  // Avis des utilisateurs (affichés sur l'accueil public) : un seul avis par compte
  `
  CREATE TABLE reviews (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    updated_at TEXT NOT NULL DEFAULT (${NOW})
  );
  `,
```

- [ ] **Step 5 : Ajouter le helper et les routes dans `server/api.mjs`**

Juste après `resetRateLimits` (près de la ligne 139), ajouter :

```js
// Nombre total de comptes affiché sur l'accueil public (mis en cache 5 min)
const MEMBERS_TTL_MS = 5 * 60_000;
let membersCache = { at: 0, value: 0 };
const memberCount = async () => {
  if (Date.now() - membersCache.at > MEMBERS_TTL_MS) {
    const row = await db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
    membersCache = { at: Date.now(), value: Number(row.cnt) };
  }
  return membersCache.value;
};

/** Réservé aux tests : oublie le nombre de membres en cache. */
export const resetMembersCache = () => {
  membersCache = { at: 0, value: 0 };
};
```

Puis, après la route `'DELETE /api/community/comments'` (avant le commentaire « Administration (DevOps) »), ajouter :

```js
  // Avis des utilisateurs : lecture publique (accueil), écriture réservée aux comptes
  'GET /api/reviews': async ({ res, ip }) => {
    rateLimit(`reviews:${ip}`, 60, 60_000);
    const stats = await db
      .prepare('SELECT COUNT(*) AS cnt, AVG(rating)::float8 AS avg FROM reviews')
      .get();
    const rows = await db
      .prepare(
        `SELECT r.id, r.rating, r.body, r.created_at, u.name, u.points
         FROM reviews r JOIN users u ON u.id = r.user_id
         ORDER BY r.id DESC LIMIT 6`,
      )
      .all();
    send(
      res,
      200,
      {
        members: await memberCount(),
        average: Math.round(Number(stats.avg || 0) * 10) / 10,
        count: Number(stats.cnt),
        reviews: rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          author: publicName(r.name),
          authorLevel: levelFor(r.points),
          createdAt: r.created_at.replace(' ', 'T') + 'Z',
        })),
      },
      { 'Cache-Control': 'no-store' },
    );
  },

  'GET /api/reviews/mine': async ({ req, res }) => {
    const user = await requireUser(req);
    const row = await db
      .prepare('SELECT id, rating, body FROM reviews WHERE user_id = ?')
      .get(user.id);
    send(res, 200, { review: row || null });
  },

  // Création ou mise à jour de son avis (un seul par compte)
  'POST /api/reviews': async ({ req, res, body }) => {
    const user = await requireUser(req);
    rateLimit(`review-write:${user.id}`, 10, 10 * 60_000);
    const rating = int(body.rating, 1, 5, 'Note');
    const text = longText(body.body, { min: 10, max: 500, field: 'Avis' });
    await db
      .prepare(
        `INSERT INTO reviews (user_id, rating, body) VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE
         SET rating = EXCLUDED.rating, body = EXCLUDED.body,
             updated_at = to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')`,
      )
      .run(user.id, rating, text);
    send(res, 200, { ok: true });
  },

  // Sans ?id : supprime son propre avis. Avec ?id : réservé aux administrateurs.
  'DELETE /api/reviews': async ({ req, res, url }) => {
    const user = await requireUser(req);
    const idParam = url.searchParams.get('id');
    if (idParam === null) {
      await db.prepare('DELETE FROM reviews WHERE user_id = ?').run(user.id);
    } else {
      if (!isAdmin(user)) throw new HttpError(403, 'Action non autorisée');
      const id = int(Number(idParam), 1, Number.MAX_SAFE_INTEGER, 'Avis');
      const { changes } = await db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
      if (!changes) throw new HttpError(404, 'Avis introuvable');
    }
    send(res, 200, { ok: true });
  },
```

- [ ] **Step 6 : Lancer les tests, vérifier le succès**

Run : `node --test tests/reviews.test.mjs`
Expected : 5 tests PASS.

- [ ] **Step 7 : Lancer toute la suite**

Run : `npm test`
Expected : tout PASS (les tests existants ne sont pas affectés).

- [ ] **Step 8 : Commit**

```bash
git status
git diff --stat
git add server/db.mjs server/api.mjs tests/helpers/apiHarness.mjs tests/reviews.test.mjs
git commit -m "feat: API des avis (table reviews, lecture publique, nombre de membres)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Flux temps réel (SSE) et diffusion des posts de la Communauté

**Files:**

- Create: `server/liveFeed.mjs`
- Create: `tests/live.test.mjs`
- Modify: `server/api.mjs` (import, route `GET /api/live/stream`, publication dans `POST /api/community/posts`)
- Modify: `server/index.mjs` (fermer les flux à l'arrêt)

**Interfaces:**

- Consumes : `startHarness`, `client().cookie` (Task 1).
- Produces (pour Tasks 3 et 4) :
  - `openLiveStream(req, res, user) → void` ; `publish(event: string, data: object, opts?: { exceptUserId?: number }) → void` ; `announceNews(fresh: {id,title,source}[]) → void` (publie `news` `{ count, items(≤3) }`) ; `closeLiveStreams() → void`.
  - Événements SSE : `community_post` `{ id, topic, author, excerpt }` ; `news` `{ count, items: { id, title, source }[] }`.
  - Route `GET /api/live/stream` (401 sans session).

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `tests/live.test.mjs` :

```js
// Flux temps réel (SSE) : posts de la Communauté et actualités. npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startHarness } from './helpers/apiHarness.mjs';

let h;
let awa;
let bob;
const opened = [];

before(async () => {
  h = await startHarness('live');
  awa = await h.register('Awa Traoré', 'awa@test.bf');
  bob = await h.register('Bob Diallo', 'bob@test.bf');
});
after(async () => {
  opened.forEach((s) => s.close());
  await h.stop();
});

const openSse = (cookie) =>
  new Promise((resolve, reject) => {
    const req = http.get(h.BASE + '/api/live/stream', { headers: { Cookie: cookie } }, (res) => {
      const events = [];
      let buf = '';
      let ended = false;
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const ev = /^event: (.+)$/m.exec(block);
          const da = /^data: (.+)$/m.exec(block);
          if (ev && da) events.push({ event: ev[1], data: JSON.parse(da[1]) });
        }
      });
      res.on('close', () => (ended = true));
      const stream = {
        status: res.statusCode,
        events,
        get ended() {
          return ended;
        },
        close: () => req.destroy(),
      };
      opened.push(stream);
      resolve(stream);
    });
    req.on('error', reject);
  });

const waitFor = async (fn, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  return null;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

test('le flux exige une session', async () => {
  const res = await fetch(h.BASE + '/api/live/stream');
  assert.equal(res.status, 401);
});

test('un post de la Communauté est diffusé aux autres, pas à son auteur', async () => {
  const sAwa = await openSse(awa.cookie);
  const sBob = await openSse(bob.cookie);
  assert.equal(sBob.status, 200);

  const long = 'x'.repeat(200);
  const created = await awa.call('POST', '/api/community/posts', { topic: 'astuce', body: long });
  assert.equal(created.status, 201);

  const got = await waitFor(() => sBob.events.find((e) => e.event === 'community_post'));
  assert.ok(got, 'Bob reçoit la notification');
  assert.equal(got.data.author, 'Awa T.');
  assert.equal(got.data.topic, 'astuce');
  assert.equal(got.data.id, created.data.id);
  assert.equal(got.data.excerpt.length, 80);

  await pause(300);
  assert.equal(sAwa.events.length, 0, 'l’auteur ne reçoit pas sa propre notification');
});

test('au plus 3 connexions par utilisateur : la plus ancienne est fermée', async () => {
  const first = await openSse(bob.cookie); // s'ajoute à celle du test précédent (2)
  await openSse(bob.cookie); // 3
  await openSse(bob.cookie); // 4 → la plus ancienne (du test précédent) est fermée
  const closed = await waitFor(() => opened.filter((s) => s.ended).length >= 1);
  assert.ok(closed, 'une connexion a été fermée');
  assert.equal(first.ended, false, 'les plus récentes restent ouvertes');
});

test('announceNews : un seul événement, 3 articles listés au plus', async () => {
  const { announceNews } = await import('../server/liveFeed.mjs');
  const sAwa = await openSse(awa.cookie);
  const fresh = Array.from({ length: 5 }, (_, i) => ({
    id: `S:${i}`,
    title: `Titre ${i}`,
    source: 'CERT-FR',
    extra: 'ignoré',
  }));
  announceNews(fresh);
  const got = await waitFor(() => sAwa.events.find((e) => e.event === 'news'));
  assert.ok(got);
  assert.equal(got.data.count, 5);
  assert.equal(got.data.items.length, 3);
  assert.deepEqual(Object.keys(got.data.items[0]).sort(), ['id', 'source', 'title']);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --test tests/live.test.mjs`
Expected : FAIL (`/api/live/stream` renvoie 404, module `liveFeed.mjs` introuvable).

- [ ] **Step 3 : Écrire `server/liveFeed.mjs`**

```js
// Flux temps réel (Server-Sent Events) : notifications de la Communauté et des actualités.
// Même technique que server/rooms.mjs : une réponse HTTP gardée ouverte, ping périodique.
import { getNews, onNewArticles } from './news.mjs';

const MAX_STREAMS_PER_USER = 3;
const PING_MS = 20_000;
const NEWS_POLL_MS = 10 * 60_000 + 5_000; // juste après l'expiration du cache des actualités
const MAX_NEWS_ITEMS = 3;

/** userId → connexions ouvertes (une par onglet) */
const streams = new Map();

const write = (res, chunk) => {
  try {
    res.write(chunk);
  } catch {
    /* connexion déjà fermée : le nettoyage se fait sur « close » */
  }
};

export const openLiveStream = (req, res, user) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let set = streams.get(user.id);
  if (!set) streams.set(user.id, (set = new Set()));
  while (set.size >= MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value;
    set.delete(oldest);
    oldest.end();
  }
  set.add(res);

  write(res, 'retry: 3000\n\n');
  const heartbeat = setInterval(() => write(res, ': ping\n\n'), PING_MS);
  req.on('close', () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (!set.size && streams.get(user.id) === set) streams.delete(user.id);
  });
};

/** Diffuse un événement à toutes les connexions, sauf celles de exceptUserId. */
export const publish = (event, data, { exceptUserId } = {}) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [userId, set] of streams) {
    if (userId === exceptUserId) continue;
    for (const res of set) write(res, payload);
  }
};

/** Un seul événement pour toutes les nouvelles actualités, avec au plus 3 titres. */
export const announceNews = (fresh) => {
  publish('news', {
    count: fresh.length,
    items: fresh
      .slice(0, MAX_NEWS_ITEMS)
      .map((a) => ({ id: a.id, title: a.title, source: a.source })),
  });
};

/** Surveille les flux d'actualités : le premier chargement amorce la liste connue sans rien notifier. */
export const startNewsWatcher = () => {
  onNewArticles(announceNews);
  const tick = () =>
    getNews().catch((err) => console.error('[live] Actualités indisponibles :', err.message));
  void tick();
  setInterval(tick, NEWS_POLL_MS).unref();
};

/** Arrêt propre : termine les flux pour que server.close() puisse aboutir. */
export const closeLiveStreams = () => {
  for (const set of streams.values()) for (const res of set) res.end();
  streams.clear();
};
```

- [ ] **Step 4 : Brancher dans `server/api.mjs`**

Ajouter l'import à côté de celui de `news.mjs` (ligne 9) :

```js
import { openLiveStream, publish } from './liveFeed.mjs';
```

Ajouter la route juste après `'GET /api/rooms/stream'` :

```js
  // Notifications en direct (nouveaux posts de la Communauté, nouvelles actualités)
  'GET /api/live/stream': async ({ req, res }) => {
    const user = await requireUser(req);
    rateLimit(`live-stream:${user.id}`, 30, 60_000);
    openLiveStream(req, res, user);
  },
```

Dans `'POST /api/community/posts'`, remplacer la fin du handler :

```js
const { id } = await db
  .prepare('INSERT INTO posts (user_id, topic, body) VALUES (?, ?, ?) RETURNING id')
  .get(user.id, topic, text);
publish(
  'community_post',
  { id, topic, author: publicName(user.name), excerpt: text.replace(/\s+/g, ' ').slice(0, 80) },
  { exceptUserId: user.id },
);
send(res, 201, { id });
```

- [ ] **Step 5 : Fermer les flux à l'arrêt dans `server/index.mjs`**

Ajouter l'import à côté de `handleApi` : `import { closeLiveStreams } from './liveFeed.mjs';`
Dans la fonction `shutdown`, ajouter `closeLiveStreams();` juste avant `server.close(async () => {` .

- [ ] **Step 6 : Lancer, vérifier le succès**

Run : `node --test tests/live.test.mjs`
Expected : 4 tests PASS.

- [ ] **Step 7 : Suite complète**

Run : `npm test`
Expected : tout PASS.

- [ ] **Step 8 : Commit**

```bash
git status
git diff --stat
git add server/liveFeed.mjs server/api.mjs server/index.mjs tests/live.test.mjs
git commit -m "feat: flux temps réel SSE et diffusion des nouveaux posts de la Communauté

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Détection des nouvelles actualités

**Files:**

- Modify: `server/news.mjs` (fonction `refresh`, nouveaux exports)
- Modify: `server/index.mjs` (démarrer la surveillance)
- Create: `tests/news.test.mjs`

**Interfaces:**

- Consumes : `startNewsWatcher`, `announceNews` (Task 2).
- Produces : `onNewArticles(fn: (fresh: Article[]) => void) → void` ; `_expireCacheForTest() → void` dans `server/news.mjs`.

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `tests/news.test.mjs` :

```js
// Détection des nouvelles actualités (sans réseau : fetch simulé). npm test
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const news = await import('../server/news.mjs');
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const rss = (titles) =>
  `<?xml version="1.0"?><rss><channel>${titles
    .map(
      (t, i) =>
        `<item><title>${t}</title><link>https://exemple.test/${t}</link>` +
        `<pubDate>Mon, 05 Oct 2026 10:0${i}:00 GMT</pubDate><description>Résumé</description></item>`,
    )
    .join('')}</channel></rss>`;

// Seule la source CERT-FR répond ; les autres échouent (HTTP 500)
const serve = (titles) => {
  globalThis.fetch = async (url) =>
    String(url).includes('cert.ssi.gouv.fr')
      ? new Response(rss(titles), { status: 200 })
      : new Response('', { status: 500 });
};

const seen = [];
news.onNewArticles((fresh) => seen.push(fresh.map((a) => a.title)));

test('aucune notification au premier remplissage, puis seulement les nouveaux articles', async () => {
  serve(['A', 'B']);
  await news.getNews();
  assert.deepEqual(seen, [], 'le premier chargement amorce la liste sans notifier');

  news._expireCacheForTest();
  serve(['A', 'B', 'C']);
  await news.getNews();
  assert.deepEqual(seen, [['C']]);

  news._expireCacheForTest();
  serve(['A', 'B', 'C']);
  await news.getNews();
  assert.deepEqual(seen, [['C']], 'rien de nouveau : pas de nouvel événement');
});

test('si toutes les sources échouent : aucune notification, cache conservé', async () => {
  news._expireCacheForTest();
  globalThis.fetch = async () => new Response('', { status: 500 });
  const res = await news.getNews();
  assert.deepEqual(seen, [['C']]);
  assert.equal(res.articles.length, 3);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --test tests/news.test.mjs`
Expected : FAIL (`news.onNewArticles is not a function`).

- [ ] **Step 3 : Modifier `server/news.mjs`**

Remplacer le bloc de `let cache = …` jusqu'à `refresh` inclus par :

```js
let cache = { at: 0, articles: [] };
let inflight = null;

// Identifiants déjà vus : permettent de repérer les articles réellement nouveaux
let knownIds = null; // null tant que le premier chargement n'a pas eu lieu (aucune notification)
let onNew = () => {};
const MAX_KNOWN_IDS = 1000;

/** Enregistre la fonction appelée avec les nouveaux articles à chaque rafraîchissement. */
export const onNewArticles = (fn) => {
  onNew = fn;
};

const refresh = async () => {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const articles = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_TOTAL);
  // On ne remplace le cache que si au moins une source a répondu.
  if (articles.length) {
    const fresh = knownIds ? articles.filter((a) => !knownIds.has(a.id)) : [];
    const kept = knownIds && knownIds.size < MAX_KNOWN_IDS ? [...knownIds] : [];
    knownIds = new Set([...kept, ...articles.map((a) => a.id)]);
    cache = { at: Date.now(), articles };
    if (fresh.length) {
      try {
        onNew(fresh);
      } catch (err) {
        console.error('[news] Notification impossible :', err instanceof Error ? err.message : err);
      }
    }
  } else cache.at = Date.now() - CACHE_MS + 60_000; // réessai dans 1 min
  return cache;
};
```

Et en fin de fichier, à côté de `_parseFeedForTest` :

```js
export const _expireCacheForTest = () => {
  cache.at = 0;
};
```

- [ ] **Step 4 : Démarrer la surveillance dans `server/index.mjs`**

Changer l'import ajouté en Task 2 en `import { closeLiveStreams, startNewsWatcher } from './liveFeed.mjs';` et appeler `startNewsWatcher();` dans le callback de `server.listen(...)`, après le `console.log` :

```js
server.listen(PORT, HOST, () => {
  console.log(`CyberSens en ligne sur http://localhost:${PORT} (base : ${DB_LABEL})`);
  startNewsWatcher();
});
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run : `node --test tests/news.test.mjs`
Expected : 2 tests PASS.

- [ ] **Step 6 : Suite complète**

Run : `npm test`
Expected : tout PASS.

- [ ] **Step 7 : Commit**

```bash
git status
git diff --stat
git add server/news.mjs server/index.mjs tests/news.test.mjs
git commit -m "feat: notification des nouvelles actualités (détection à chaque rafraîchissement)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Notifications côté application connectée

**Files:**

- Create: `services/liveFeedMessages.ts`
- Create: `services/liveNotificationsPref.ts`
- Create: `services/useLiveFeed.ts`
- Create: `components/LiveNotificationsCard.tsx`
- Create: `tests/live-messages.test.mjs`
- Modify: `components/Layout.tsx` (appel du hook)
- Modify: `features/Community.tsx` (recharge du fil)
- Modify: `features/Profile.tsx` (carte du réglage, après `<PasswordChangeCard />` ligne ~1476)

**Interfaces:**

- Consumes : événements SSE `community_post` / `news` (Task 2), événement fenêtre `cyber-notify` (existant, `detail: { message, type }`).
- Produces :
  - `liveMessage(event: 'community_post' | 'news', data, language: 'fr' | 'en' | 'es') → string`.
  - `getLiveNotifications() → boolean`, `setLiveNotifications(on: boolean) → void` (émet `cybersens-live-pref-changed`).
  - `useLiveFeed() → void` (émet `cyber-notify` et `cybersens-community-post`).

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/live-messages.test.mjs` :

```js
// Textes des notifications en direct (FR / EN / ES). npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveMessage } from '../services/liveFeedMessages.ts';

const post = { id: 1, topic: 'astuce', author: 'Awa T.', excerpt: 'Activez le 2FA' };

test('nouveau post de la Communauté, dans les trois langues', () => {
  assert.equal(
    liveMessage('community_post', post, 'fr'),
    'Awa T. a publié dans la Communauté : « Activez le 2FA »',
  );
  assert.match(liveMessage('community_post', post, 'en'), /^Awa T\. posted in the Community/);
  assert.match(liveMessage('community_post', post, 'es'), /^Awa T\. publicó en la Comunidad/);
});

test('actualités : un titre ou un total', () => {
  const one = { count: 1, items: [{ id: 'a', title: 'Faille critique', source: 'CERT-FR' }] };
  const many = { count: 5, items: [] };
  assert.equal(liveMessage('news', one, 'fr'), 'Nouvelle actualité : Faille critique');
  assert.equal(liveMessage('news', one, 'en'), 'New article: Faille critique');
  assert.equal(liveMessage('news', many, 'fr'), '5 nouvelles actualités cyber');
  assert.equal(liveMessage('news', many, 'es'), '5 nuevas noticias de ciberseguridad');
});

test('langue inconnue : français', () => {
  assert.match(liveMessage('community_post', post, 'xx'), /a publié/);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --test tests/live-messages.test.mjs`
Expected : FAIL (module introuvable).

- [ ] **Step 3 : Écrire `services/liveFeedMessages.ts`**

```ts
// Textes des notifications en direct (fonction pure : testable sans navigateur).
export interface CommunityPostEvent {
  id: number;
  topic: string;
  author: string;
  excerpt: string;
}

export interface NewsEvent {
  count: number;
  items: { id: string; title: string; source: string }[];
}

type Lang = 'fr' | 'en' | 'es' | string;
const pick = (lang: Lang, fr: string, en: string, es: string) =>
  lang === 'en' ? en : lang === 'es' ? es : fr;

export function liveMessage(event: 'community_post', data: CommunityPostEvent, lang: Lang): string;
export function liveMessage(event: 'news', data: NewsEvent, lang: Lang): string;
export function liveMessage(
  event: 'community_post' | 'news',
  data: CommunityPostEvent | NewsEvent,
  lang: Lang,
): string {
  if (event === 'community_post') {
    const p = data as CommunityPostEvent;
    return pick(
      lang,
      `${p.author} a publié dans la Communauté : « ${p.excerpt} »`,
      `${p.author} posted in the Community: “${p.excerpt}”`,
      `${p.author} publicó en la Comunidad: «${p.excerpt}»`,
    );
  }
  const n = data as NewsEvent;
  if (n.count === 1 && n.items[0]) {
    const title = n.items[0].title;
    return pick(
      lang,
      `Nouvelle actualité : ${title}`,
      `New article: ${title}`,
      `Nueva noticia: ${title}`,
    );
  }
  return pick(
    lang,
    `${n.count} nouvelles actualités cyber`,
    `${n.count} new cybersecurity articles`,
    `${n.count} nuevas noticias de ciberseguridad`,
  );
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `node --test tests/live-messages.test.mjs`
Expected : 3 tests PASS.

- [ ] **Step 5 : Écrire `services/liveNotificationsPref.ts`**

```ts
// Préférence locale à l'appareil : recevoir ou non les notifications en direct (activées par défaut).
const KEY = 'cybersens_live_notifications';
export const LIVE_PREF_EVENT = 'cybersens-live-pref-changed';

export const getLiveNotifications = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setLiveNotifications = (on: boolean): void => {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    /* stockage indisponible : le réglage vaut pour la session seulement */
  }
  window.dispatchEvent(new Event(LIVE_PREF_EVENT));
};
```

- [ ] **Step 6 : Écrire `services/useLiveFeed.ts`**

```ts
import { useEffect, useRef, useState } from 'react';
import { useI18n } from './i18n';
import { liveMessage, type CommunityPostEvent, type NewsEvent } from './liveFeedMessages';
import { LIVE_PREF_EVENT, getLiveNotifications } from './liveNotificationsPref';

export const COMMUNITY_POST_EVENT = 'cybersens-community-post';

const notify = (message: string) =>
  window.dispatchEvent(new CustomEvent('cyber-notify', { detail: { message, type: 'info' } }));

/** Ouvre le flux temps réel pour l'utilisateur connecté et affiche un toast par événement. */
export const useLiveFeed = () => {
  const { language } = useI18n();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [enabled, setEnabled] = useState(getLiveNotifications());

  useEffect(() => {
    const sync = () => setEnabled(getLiveNotifications());
    window.addEventListener(LIVE_PREF_EVENT, sync);
    return () => window.removeEventListener(LIVE_PREF_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/live/stream');
    const parse = <T>(e: Event): T | null => {
      try {
        return JSON.parse((e as MessageEvent).data) as T;
      } catch {
        return null;
      }
    };
    source.addEventListener('community_post', (e) => {
      const data = parse<CommunityPostEvent>(e);
      if (!data) return;
      notify(liveMessage('community_post', data, languageRef.current));
      window.dispatchEvent(new Event(COMMUNITY_POST_EVENT));
    });
    source.addEventListener('news', (e) => {
      const data = parse<NewsEvent>(e);
      if (data) notify(liveMessage('news', data, languageRef.current));
    });
    return () => source.close();
  }, [enabled]);
};
```

- [ ] **Step 7 : Brancher dans `components/Layout.tsx`**

Ajouter l'import `import { useLiveFeed } from '../services/useLiveFeed';` avec les autres imports `../services/…`, puis appeler le hook dans le composant `Layout`, juste après l'effet `cyber-notify` (après `}, []);` de la ligne ~107) :

```tsx
// Notifications en direct (nouveaux posts de la Communauté, nouvelles actualités)
useLiveFeed();
```

- [ ] **Step 8 : Recharger le fil dans `features/Community.tsx`**

Ajouter l'import `import { COMMUNITY_POST_EVENT } from '../services/useLiveFeed';` puis, juste après l'effet `useEffect(() => { void load(filter); }, [filter, load]);` (ligne ~98-100) :

```tsx
// Un autre membre vient de publier : on rafraîchit le fil sans afficher de chargement
useEffect(() => {
  const refresh = () => {
    fetchPosts(filter)
      .then((res) => {
        setPosts(res.posts);
        setCanModerate(res.canModerate);
        setHasMore(res.posts.length >= 20);
      })
      .catch(() => {});
  };
  window.addEventListener(COMMUNITY_POST_EVENT, refresh);
  return () => window.removeEventListener(COMMUNITY_POST_EVENT, refresh);
}, [filter]);
```

- [ ] **Step 9 : Écrire `components/LiveNotificationsCard.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import {
  LIVE_PREF_EVENT,
  getLiveNotifications,
  setLiveNotifications,
} from '../services/liveNotificationsPref';
import { Card, useL } from './ui';

/** Réglage : recevoir ou non les notifications en direct (Communauté, actualités) sur cet appareil. */
export const LiveNotificationsCard: React.FC = () => {
  const L = useL();
  const [on, setOn] = useState(getLiveNotifications());

  useEffect(() => {
    const sync = () => setOn(getLiveNotifications());
    window.addEventListener(LIVE_PREF_EVENT, sync);
    return () => window.removeEventListener(LIVE_PREF_EVENT, sync);
  }, []);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">
            {L('Notifications en direct', 'Live notifications', 'Notificaciones en directo')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Être prévenu quand un membre publie dans la Communauté ou qu’une actualité paraît (sur cet appareil).',
              'Get notified when a member posts in the Community or a new article appears (on this device).',
              'Recibe un aviso cuando un miembro publica en la Comunidad o aparece una noticia (en este dispositivo).',
            )}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={L(
            'Notifications en direct',
            'Live notifications',
            'Notificaciones en directo',
          )}
          onClick={() => setLiveNotifications(!on)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            on ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    </Card>
  );
};
```

- [ ] **Step 10 : L'ajouter au Profil**

Dans `features/Profile.tsx`, ajouter `import { LiveNotificationsCard } from '../components/LiveNotificationsCard';` après l'import de `PasswordChangeCard` (ligne 45), puis remplacer le bloc :

```tsx
{
  prefs.isAuthenticated && (
    <div className="mt-6">
      <PasswordChangeCard />
    </div>
  );
}
```

par :

```tsx
{
  prefs.isAuthenticated && (
    <div className="mt-6 space-y-6">
      <LiveNotificationsCard />
      <PasswordChangeCard />
    </div>
  );
}
```

(La carte d'avis de la Task 5 sera ajoutée dans ce même bloc.)

- [ ] **Step 11 : Vérifier typage, lint et tests**

Run : `npm run typecheck && npm run lint && npm test`
Expected : aucune erreur, tout PASS.

- [ ] **Step 12 : Vérification manuelle**

Run : `npm run build && npm start`, ouvrir deux navigateurs (ou un navigateur normal + un privé) avec deux comptes, publier dans Communauté avec le compte A.
Expected : le compte B voit un toast « A. a publié dans la Communauté : … » en moins de 2 s, et le fil de B se met à jour s'il est sur l'onglet Communauté. Le compte A ne voit rien. Désactiver le réglage dans Profil de B : plus de toast.

- [ ] **Step 13 : Commit**

```bash
git status
git diff --stat
git add services/liveFeedMessages.ts services/liveNotificationsPref.ts services/useLiveFeed.ts components/LiveNotificationsCard.tsx components/Layout.tsx features/Community.tsx features/Profile.tsx tests/live-messages.test.mjs
git commit -m "feat: notifications en direct dans l'application (Communauté et actualités)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : Avis et nombre de membres sur l'Accueil, avis dans le Profil

**Files:**

- Create: `services/reviewsApi.ts`
- Create: `services/reviewsFormat.ts`
- Create: `tests/reviews-format.test.mjs`
- Create: `features/Reviews.tsx`
- Create: `components/MyReviewCard.tsx`
- Modify: `features/Landing.tsx` (chargement, ligne des membres, section des avis)
- Modify: `features/Profile.tsx` (carte d'avis dans le bloc de la Task 4)

**Interfaces:**

- Consumes : `GET /api/reviews`, `GET /api/reviews/mine`, `POST /api/reviews`, `DELETE /api/reviews` (Task 1) ; `api()` de `services/apiClient.ts`.
- Produces :
  - `fetchReviews() → Promise<ReviewsOverview>`, `fetchMyReview() → Promise<{ review: MyReview | null }>`, `saveMyReview(rating: number, body: string)`, `deleteMyReview()`.
  - `membersLabel(count: number, lang: 'fr'|'en'|'es'|string) → string`.
  - `<ReviewsSection overview />` (rend `null` s'il n'y a aucun avis).

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/reviews-format.test.mjs` :

```js
// Libellé du nombre de membres. npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { membersLabel } from '../services/reviewsFormat.ts';

test('nombre de membres : singulier, pluriel, séparateurs, langues', () => {
  assert.equal(membersLabel(1, 'fr'), '1 membre inscrit');
  assert.equal(membersLabel(0, 'fr'), '0 membre inscrit');
  assert.equal(membersLabel(2, 'fr'), '2 membres inscrits');
  assert.equal(membersLabel(1, 'en'), '1 registered member');
  assert.equal(membersLabel(1500, 'en'), '1,500 registered members');
  assert.equal(membersLabel(3, 'es'), '3 miembros registrados');
  assert.equal(membersLabel(1, 'es'), '1 miembro registrado');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `node --test tests/reviews-format.test.mjs`
Expected : FAIL (module introuvable).

- [ ] **Step 3 : Écrire `services/reviewsFormat.ts` et `services/reviewsApi.ts`**

`services/reviewsFormat.ts` :

```ts
// Libellés des avis et du nombre de membres (fonctions pures : testables sans navigateur).
export const membersLabel = (count: number, lang: string): string => {
  const n = new Intl.NumberFormat(
    lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'fr-FR',
  ).format(count);
  const one = count <= 1;
  if (lang === 'en') return `${n} registered member${one ? '' : 's'}`;
  if (lang === 'es') return `${n} miembro${one ? '' : 's'} registrado${one ? '' : 's'}`;
  return `${n} membre${one ? '' : 's'} inscrit${one ? '' : 's'}`;
};
```

Note : `Intl.NumberFormat('fr-FR')` utilise une espace insécable fine pour les milliers ; le test n'utilise pas de valeur ≥ 1 000 en français. `es-ES` ne sépare pas les milliers à 4 chiffres, sans impact ici.

`services/reviewsApi.ts` :

```ts
import { api } from './apiClient';

export interface PublicReview {
  id: number;
  rating: number;
  body: string;
  author: string;
  authorLevel: number;
  createdAt: string;
}

export interface ReviewsOverview {
  members: number;
  average: number;
  count: number;
  reviews: PublicReview[];
}

export interface MyReview {
  id: number;
  rating: number;
  body: string;
}

export const fetchReviews = () => api<ReviewsOverview>('GET', '/api/reviews');
export const fetchMyReview = () => api<{ review: MyReview | null }>('GET', '/api/reviews/mine');
export const saveMyReview = (rating: number, body: string) =>
  api<{ ok: true }>('POST', '/api/reviews', { rating, body });
export const deleteMyReview = () => api('DELETE', '/api/reviews');
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `node --test tests/reviews-format.test.mjs`
Expected : PASS.

- [ ] **Step 5 : Écrire `features/Reviews.tsx`**

```tsx
import React from 'react';
import { Star } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { useL } from '../components/ui';
import type { ReviewsOverview } from '../services/reviewsApi';
import { membersLabel } from '../services/reviewsFormat';

export const Stars: React.FC<{ value: number; className?: string }> = ({
  value,
  className = 'h-4 w-4',
}) => (
  <span className="inline-flex" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${className} ${
          n <= Math.round(value)
            ? 'fill-amber-400 text-amber-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      />
    ))}
  </span>
);

/** Section « Ce que disent nos utilisateurs » de l'accueil : invisible tant qu'il n'y a aucun avis. */
export const ReviewsSection: React.FC<{ overview: ReviewsOverview }> = ({ overview }) => {
  const L = useL();
  const { language } = useI18n();
  if (overview.count === 0) return null;

  return (
    <section
      aria-labelledby="reviews-title"
      className="px-4 sm:px-8 pb-16 sm:pb-24 max-w-6xl mx-auto"
    >
      <h2 id="reviews-title" className="text-center text-2xl sm:text-3xl font-black tracking-tight">
        {L(
          'Ce que disent nos utilisateurs',
          'What our users say',
          'Lo que dicen nuestros usuarios',
        )}
      </h2>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
        <Stars value={overview.average} className="h-5 w-5" />
        <span className="font-black">
          {overview.average.toLocaleString(
            language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR',
          )}
          /5
        </span>
        <span>
          {L(
            `${overview.count} avis`,
            `${overview.count} review${overview.count > 1 ? 's' : ''}`,
            `${overview.count} opinion${overview.count > 1 ? 'es' : ''}`,
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>{membersLabel(overview.members, language)}</span>
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overview.reviews.map((r) => (
          <li
            key={r.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <Stars value={r.rating} />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {new Date(r.createdAt).toLocaleDateString(language)}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {r.body}
            </p>
            <p className="mt-3 text-xs font-black text-slate-900 dark:text-white">
              {r.author}
              <span className="ml-2 font-semibold text-slate-500 dark:text-slate-400">
                {L('Niveau', 'Level', 'Nivel')} {r.authorLevel}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
```

(Le texte de l'avis est rendu comme enfant React : il est échappé automatiquement.)

- [ ] **Step 6 : Brancher dans `features/Landing.tsx`**

1. Imports (`Users` de lucide-react est déjà importé dans ce fichier) : ajouter :

```tsx
import { fetchReviews, type ReviewsOverview } from '../services/reviewsApi';
import { membersLabel } from '../services/reviewsFormat';
import { ReviewsSection } from './Reviews';
```

2. Dans le composant, après `const [view, setView] = …` :

```tsx
const [overview, setOverview] = useState<ReviewsOverview | null>(null);

useEffect(() => {
  fetchReviews()
    .then(setOverview)
    .catch(() => {}); // sans réponse du serveur : ni avis ni nombre de membres, sans erreur visible
}, []);
```

3. Dans la liste des points de confiance (`<ul className="mt-9 …">`), juste après `))}` du `TRUST_POINTS.map` :

```tsx
{
  overview && (
    <li className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
      {membersLabel(overview.members, language)}
    </li>
  );
}
```

4. Entre la section « Features » et la section « CTA band » :

```tsx
{
  overview && <ReviewsSection overview={overview} />;
}
```

- [ ] **Step 7 : Écrire `components/MyReviewCard.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';
import { ApiError } from '../services/apiClient';
import { deleteMyReview, fetchMyReview, saveMyReview } from '../services/reviewsApi';
import { Card, useL } from './ui';

const MIN = 10;
const MAX = 500;

/** Profil : l'utilisateur écrit, modifie ou supprime son avis (affiché sur l'accueil public). */
export const MyReviewCard: React.FC = () => {
  const L = useL();
  const [loaded, setLoaded] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<null | { ok: boolean; text: string }>(null);

  useEffect(() => {
    fetchMyReview()
      .then(({ review }) => {
        if (review) {
          setHasReview(true);
          setRating(review.rating);
          setBody(review.body);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const fail = (err: unknown) =>
    setMessage({
      ok: false,
      text:
        err instanceof ApiError && err.message
          ? err.message
          : L(
              'Action impossible. Réessayez plus tard.',
              'Action failed. Try again later.',
              'Acción imposible. Inténtelo más tarde.',
            ),
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1)
      return setMessage({
        ok: false,
        text: L(
          'Choisissez une note de 1 à 5.',
          'Pick a rating from 1 to 5.',
          'Elige una nota del 1 al 5.',
        ),
      });
    if (body.trim().length < MIN)
      return setMessage({
        ok: false,
        text: L(
          `Votre avis doit contenir au moins ${MIN} caractères.`,
          `Your review must be at least ${MIN} characters long.`,
          `Tu opinión debe tener al menos ${MIN} caracteres.`,
        ),
      });
    setBusy(true);
    setMessage(null);
    try {
      await saveMyReview(rating, body);
      setHasReview(true);
      setMessage({
        ok: true,
        text: L(
          'Merci ! Votre avis est publié.',
          'Thank you! Your review is published.',
          '¡Gracias! Tu opinión está publicada.',
        ),
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await deleteMyReview();
      setHasReview(false);
      setRating(0);
      setBody('');
      setMessage({
        ok: true,
        text: L(
          'Votre avis a été supprimé.',
          'Your review has been deleted.',
          'Tu opinión ha sido eliminada.',
        ),
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-light">
          <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black">
            {L('Mon avis sur CyberSens', 'My review of CyberSens', 'Mi opinión sobre CyberSens')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {L(
              'Affiché sur la page d’accueil avec votre prénom et l’initiale de votre nom.',
              'Shown on the home page with your first name and last initial.',
              'Se muestra en la página de inicio con tu nombre y la inicial del apellido.',
            )}
          </p>
        </div>
      </div>

      {loaded && (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <div role="radiogroup" aria-label={L('Note', 'Rating', 'Nota')} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}/5`}
                onClick={() => setRating(n)}
                className="rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <Star
                  className={`h-7 w-7 ${
                    n <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="my-review" className="sr-only">
              {L('Votre avis', 'Your review', 'Tu opinión')}
            </label>
            <textarea
              id="my-review"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX}
              rows={4}
              placeholder={L(
                'Ce qui vous a plu, ce que vous avez appris…',
                'What you liked, what you learned…',
                'Lo que te gustó, lo que aprendiste…',
              )}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white"
            />
            <p className="mt-1 text-right text-[11px] text-slate-500 dark:text-slate-400">
              {body.length}/{MAX}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-60"
            >
              {hasReview
                ? L('Mettre à jour mon avis', 'Update my review', 'Actualizar mi opinión')
                : L('Publier mon avis', 'Publish my review', 'Publicar mi opinión')}
            </button>
            {hasReview && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {L('Supprimer', 'Delete', 'Eliminar')}
              </button>
            )}
            {message && (
              <p
                role="status"
                className={`text-xs font-semibold ${
                  message.ok
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      )}
    </Card>
  );
};
```

- [ ] **Step 8 : L'ajouter au Profil**

Dans `features/Profile.tsx`, ajouter l'import `import { MyReviewCard } from '../components/MyReviewCard';` puis, dans le bloc de la Task 4 :

```tsx
<div className="mt-6 space-y-6">
  <MyReviewCard />
  <LiveNotificationsCard />
  <PasswordChangeCard />
</div>
```

- [ ] **Step 9 : Typage, lint, tests, build**

Run : `npm run typecheck && npm run lint && npm test && npm run build`
Expected : aucune erreur, tout PASS, build réussi. Si lint ou `prettier --check` signale du formatage, lancer `npm run lint:fix` puis `npx prettier --write` sur les fichiers créés.

- [ ] **Step 10 : Vérification manuelle**

Run : `npm start`, ouvrir `http://localhost:8080` déconnecté.
Expected :

- Aucun avis en base : la ligne « N membres inscrits » apparaît avec les points de confiance du hero, pas de section d'avis.
- Se connecter, Profil → « Mon avis sur CyberSens », publier 5 étoiles + texte. Se déconnecter : la section « Ce que disent nos utilisateurs » apparaît sur l'Accueil avec note moyenne, nombre d'avis, membres et la carte de l'avis.
- Un avis contenant `<b>test</b>` s'affiche littéralement, sans mise en forme.
- Vérifier en mobile (largeur 375 px) : pas de défilement horizontal.

- [ ] **Step 11 : Commit**

```bash
git status
git diff --stat
git add services/reviewsApi.ts services/reviewsFormat.ts features/Reviews.tsx components/MyReviewCard.tsx features/Landing.tsx features/Profile.tsx tests/reviews-format.test.mjs
git commit -m "feat: avis et nombre de membres sur l'accueil, avis modifiable dans le profil

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : Vérification finale, sécurité, spec à jour

**Files:**

- Modify: `docs/superpowers/specs/2026-10-05-avis-et-notifications-temps-reel-design.md`

- [ ] **Step 1 : Mettre la spec en accord avec l'implémentation**

Dans la spec : remplacer `PUT /api/reviews` par `POST /api/reviews` (upsert) ; remplacer le réglage `settings.liveNotifications` par « préférence locale à l'appareil (`localStorage`), modifiable dans Profil » ; retirer « avec action « ouvrir » vers Communauté ou Actualités » (le toast n'a pas d'action).

- [ ] **Step 2 : Contrôle complet**

Run : `npm run check`
Expected : lint, typecheck, tests et build réussissent. Noter le nombre de tests passés.

- [ ] **Step 3 : Scan de sécurité**

Invoquer le skill `hawkscan:hawkscan` (changement de code serveur : routes publiques et flux SSE), corriger toute vulnérabilité signalée, relancer le scan.

- [ ] **Step 4 : Vérification de bout en bout**

Rejouer les vérifications manuelles des Tasks 4 (étape 12) et 5 (étape 10) sur le build final. Vérifier aussi qu'un utilisateur qui ferme puis rouvre l'application retrouve les notifications actives, et que `docker`/`npm start` s'arrêtent proprement avec Ctrl+C malgré un flux ouvert.

- [ ] **Step 5 : Commit**

```bash
git status
git diff --stat
git add docs/superpowers/specs/2026-10-05-avis-et-notifications-temps-reel-design.md
git commit -m "docs: spec alignée sur l'implémentation (POST des avis, préférence locale)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
