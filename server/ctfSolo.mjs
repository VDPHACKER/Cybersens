// Arène CTF solo : comme pour les salles, les défis et leurs drapeaux sont générés ICI et ne quittent jamais
// le serveur. Le navigateur ne fait que demander les énoncés, soumettre un drapeau et lire la réponse.
// Les défis réussis sont conservés en base (classement « CTF solo ») : un défi ne rapporte ses points qu'une fois.
import { db } from './db.mjs';
import { HttpError } from './httpError.mjs';
import {
  CTF_MAX_ATTEMPTS,
  generateAllChallenges,
  publicChallenge,
  sameFlag,
  sandboxReply,
} from './ctfRooms.mjs';
import { CHALLENGE_FACTORIES } from '../features/CTF/ctfGenerator.ts';

const LOCK_MS = 10 * 60_000; // verrouillage d'un défi après CTF_MAX_ATTEMPTS drapeaux ratés
const IDLE_MS = 3 * 3_600_000;
const MAX_SESSIONS = 5000;
const LANGS = new Set(['fr', 'en', 'es']);

const sessions = new Map(); // userId -> { lang, challenges, misses, lastUsed }

const sessionOf = (userId, lang) => {
  const language = LANGS.has(lang) ? lang : 'fr';
  let s = sessions.get(userId);
  if (!s || s.lang !== language) {
    if (!s && sessions.size >= MAX_SESSIONS) {
      // Éviction de la session la moins récemment utilisée
      const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
      if (oldest) sessions.delete(oldest[0]);
    }
    s = { lang: language, challenges: generateAllChallenges(language), misses: new Map() };
    sessions.set(userId, s);
  }
  s.lastUsed = Date.now();
  return s;
};

const solvedOf = async (userId) => {
  const rows = await db
    .prepare("SELECT challenge_id, points FROM ctf_solves WHERE user_id = ? AND mode = 'solo'")
    .all(userId);
  return Object.fromEntries(rows.map((r) => [r.challenge_id, { points: r.points }]));
};

const attemptsOf = (s) => {
  const out = {};
  for (const [id, m] of s.misses)
    out[id] = { left: Math.max(0, CTF_MAX_ATTEMPTS - m.count), lockedUntil: m.lockedUntil ?? null };
  return out;
};

const snapshot = async (user, s) => ({
  lang: s.lang,
  challenges: s.challenges.map(publicChallenge),
  solved: await solvedOf(user.id),
  attempts: attemptsOf(s),
  maxAttempts: CTF_MAX_ATTEMPTS,
});

export const soloState = async (user, lang) => snapshot(user, sessionOf(user.id, lang));

const findChallenge = (s, challengeId) => {
  const challenge = s.challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new HttpError(404, 'Défi introuvable.');
  return challenge;
};

/** Vérifie un drapeau. Les points ne sont crédités qu'à la première réussite de chaque défi. */
export const submitSoloFlag = async (user, challengeId, flag, lang) => {
  const s = sessionOf(user.id, lang);
  const challenge = findChallenge(s, challengeId);
  if (typeof flag !== 'string' || flag.length > 300) throw new HttpError(400, 'Drapeau invalide');

  const now = Date.now();
  let tries = s.misses.get(challenge.id);
  if (tries?.lockedUntil && now >= tries.lockedUntil) {
    s.misses.delete(challenge.id);
    tries = undefined;
  }
  if (tries?.lockedUntil) {
    const minutes = Math.ceil((tries.lockedUntil - now) / 60_000);
    throw new HttpError(
      429,
      `Défi verrouillé après ${CTF_MAX_ATTEMPTS} essais ratés : il se rouvre dans ${minutes} min.`,
    );
  }

  if (!sameFlag(flag.trim(), challenge.flag)) {
    tries ??= { count: 0 };
    s.misses.set(challenge.id, tries);
    tries.count += 1;
    if (tries.count >= CTF_MAX_ATTEMPTS) tries.lockedUntil = now + LOCK_MS;
    return {
      ok: false,
      attemptsLeft: Math.max(0, CTF_MAX_ATTEMPTS - tries.count),
      lockedUntil: tries.lockedUntil ?? null,
    };
  }

  s.misses.delete(challenge.id);
  const added = await db
    .prepare(
      "INSERT INTO ctf_solves (user_id, challenge_id, points, mode) VALUES (?, ?, ?, 'solo') ON CONFLICT DO NOTHING",
    )
    .run(user.id, challenge.id, challenge.points);
  return { ok: true, points: challenge.points, firstTime: added.changes > 0 };
};

/** Nouveau drapeau et nouvelles données : pour un défi, ou pour toute l'arène si aucun n'est précisé. */
export const regenerateSolo = async (user, challengeId, lang) => {
  const s = sessionOf(user.id, lang);
  if (challengeId === undefined || challengeId === null) {
    s.challenges = generateAllChallenges(s.lang);
    s.misses.clear();
  } else {
    if (typeof challengeId !== 'string' || !Object.hasOwn(CHALLENGE_FACTORIES, challengeId))
      throw new HttpError(404, 'Défi introuvable.');
    s.challenges = s.challenges.map((c) =>
      c.id === challengeId ? CHALLENGE_FACTORIES[challengeId](s.lang) : c,
    );
    s.misses.delete(challengeId);
  }
  return snapshot(user, s);
};

export const askSoloSandbox = (user, challengeId, prompt, lang) => {
  const s = sessionOf(user.id, lang);
  const challenge = findChallenge(s, challengeId);
  if (challenge.interactiveType !== 'interactive_llm')
    throw new HttpError(404, 'Défi introuvable.');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 500)
    throw new HttpError(400, 'Message invalide');
  return { reply: sandboxReply(challenge, prompt, s.lang) };
};

setInterval(() => {
  const limit = Date.now() - IDLE_MS;
  for (const [id, s] of sessions) if (s.lastUsed < limit) sessions.delete(id);
}, 10 * 60_000).unref();

/** Réservé aux tests : drapeaux des défis de la session d'un joueur. */
export const peekSoloFlags = (userId) =>
  Object.fromEntries((sessions.get(userId)?.challenges ?? []).map((c) => [c.id, c.flag]));
