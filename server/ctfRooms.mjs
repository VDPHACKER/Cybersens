// CTF en équipe (salles) : plusieurs joueurs résolvent ensemble les mêmes défis.
//
// Principes :
// - l'état des salles vit en mémoire (une seule instance du serveur, comme pour les quiz multijoueurs) ;
// - les défis sont générés ICI (générateurs de features/CTF, exécutés par le serveur) : les drapeaux n'existent
//   que dans ce processus, jamais dans un navigateur, hôte compris. Le serveur les vérifie à chaque soumission,
//   limite les essais et attribue lui-même les points ;
// - un défi résolu par un joueur l'est pour toute l'équipe, les points reviennent à celui qui l'a résolu ;
// - le temps réel passe par Server-Sent Events (GET /api/ctf/rooms/stream).
import crypto from 'node:crypto';
import { HttpError } from './httpError.mjs';
import { CHALLENGE_FACTORIES } from '../features/CTF/ctfGenerator.ts';

export const CTF_LIMITS = {
  maxPlayers: 12,
  maxRooms: 100,
  minChallenges: 1,
  maxChallenges: 12,
};

const timing = {
  idleMs: 3 * 3_600_000, // salle inactive supprimée
  missWindowMs: 60_000, // fenêtre de comptage des mauvais drapeaux
};

// Mauvais drapeaux tolérés par joueur et par défi dans la fenêtre : au-delà, il faut patienter (anti force brute)
const MAX_MISSES = 5;

/** Réservé aux tests. */
export const setCtfTiming = (overrides) => Object.assign(timing, overrides);

const rooms = new Map(); // code -> salle
const roomOfUser = new Map(); // userId -> code (une salle CTF à la fois)

const newCode = () => {
  for (let i = 0; i < 20; i++) {
    const code = String(crypto.randomInt(100_000, 1_000_000));
    if (!rooms.has(code)) return code;
  }
  throw new HttpError(503, 'Impossible de créer une salle pour le moment.');
};

// ---------- Génération des défis (côté serveur) ----------
const LANGS = new Set(['fr', 'en', 'es']);

/** Identifiants des défis disponibles (les mêmes que dans l'Arène solo). */
export const CTF_CHALLENGE_IDS = Object.keys(CHALLENGE_FACTORIES);

/**
 * Génère les défis côté serveur. L'hôte ne fournit que des identifiants et une langue : il ne peut ni
 * lire les drapeaux, ni écrire un défi à sa façon, ni fixer les points.
 */
export const generateChallenges = (ids, lang) => {
  if (
    !Array.isArray(ids) ||
    ids.length < CTF_LIMITS.minChallenges ||
    ids.length > CTF_LIMITS.maxChallenges
  )
    throw new HttpError(
      400,
      `Choisissez entre ${CTF_LIMITS.minChallenges} et ${CTF_LIMITS.maxChallenges} défis.`,
    );
  const unique = new Set(ids);
  if (
    unique.size !== ids.length ||
    !ids.every((id) => typeof id === 'string' && Object.hasOwn(CHALLENGE_FACTORIES, id))
  )
    throw new HttpError(400, 'Défi inconnu.');
  const language = LANGS.has(lang) ? lang : 'fr';
  return ids.map((id) => CHALLENGE_FACTORIES[id](language));
};

// ---------- Représentation envoyée aux joueurs ----------
const publicChallenge = (c) => {
  const copy = { ...c };
  delete copy.flag; // le drapeau ne quitte jamais le serveur
  return copy;
};

const playerList = (room) =>
  [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    solves: p.solves,
    connected: p.streams.size > 0,
  }));

const snapshotFor = (room, userId) => {
  const solved = {};
  let teamScore = 0;
  for (const [challengeId, s] of room.solved) {
    solved[challengeId] = { byId: s.byId, by: s.by, at: s.at };
    teamScore += s.points;
  }
  return {
    code: room.code,
    phase: room.phase,
    session: room.session,
    hostId: room.hostId,
    now: Date.now(),
    startedAt: room.startedAt ?? null,
    finishedAt: room.finishedAt ?? null,
    challenges: room.challenges.map(publicChallenge),
    solved,
    teamScore,
    totalPoints: room.challenges.reduce((n, c) => n + c.points, 0),
    players: playerList(room),
    you: { id: userId, isHost: userId === room.hostId },
  };
};

const writeState = (room, player) => {
  const payload = `event: state\ndata: ${JSON.stringify(snapshotFor(room, player.id))}\n\n`;
  for (const res of player.streams) res.write(payload);
};

const broadcast = (room) => {
  room.lastActivity = Date.now();
  for (const player of room.players.values()) writeState(room, player);
};

// ---------- Actions ----------
const destroyRoom = (room) => {
  for (const player of room.players.values()) {
    for (const res of player.streams) res.end();
    if (roomOfUser.get(player.id) === room.code) roomOfUser.delete(player.id);
  }
  rooms.delete(room.code);
};

const requireRoom = (code) => {
  const room = rooms.get(String(code));
  if (!room) throw new HttpError(404, 'Salle introuvable. Vérifiez le code.');
  return room;
};

const memberOf = (room, userId) => {
  const player = room.players.get(userId);
  if (!player) throw new HttpError(403, 'Vous ne faites pas partie de cette salle.');
  return player;
};

const requireHost = (room, user) => {
  memberOf(room, user.id);
  if (room.hostId !== user.id) throw new HttpError(403, 'Seul l’hôte peut faire cela.');
};

const newPlayer = (user) => ({
  id: user.id,
  name: user.displayName,
  score: 0,
  solves: 0,
  streams: new Set(),
  misses: new Map(), // challengeId -> { count, resetAt }
});

export const leaveCtfRoom = (userId) => {
  const code = roomOfUser.get(userId);
  const room = code && rooms.get(code);
  roomOfUser.delete(userId);
  if (!room) return;
  const player = room.players.get(userId);
  if (!player) return;
  for (const res of player.streams) res.end();
  room.players.delete(userId);
  if (room.players.size === 0) return destroyRoom(room);
  if (room.hostId === userId) room.hostId = room.players.keys().next().value;
  broadcast(room);
};

export const createCtfRoom = (user, { challengeIds, lang }) => {
  if (rooms.size >= CTF_LIMITS.maxRooms)
    throw new HttpError(503, 'Trop de salles ouvertes, réessayez dans quelques minutes.');
  const challenges = generateChallenges(challengeIds, lang);
  leaveCtfRoom(user.id);
  const room = {
    code: newCode(),
    hostId: user.id,
    phase: 'lobby',
    session: 1,
    lang: LANGS.has(lang) ? lang : 'fr',
    challenges,
    solved: new Map(),
    players: new Map([[user.id, newPlayer(user)]]),
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  rooms.set(room.code, room);
  roomOfUser.set(user.id, room.code);
  return { code: room.code };
};

export const joinCtfRoom = (user, code) => {
  const room = requireRoom(code);
  if (room.players.has(user.id)) {
    roomOfUser.set(user.id, room.code);
    return { code: room.code }; // reconnexion
  }
  // On peut rejoindre une partie en cours (travail d'équipe), pas une partie terminée
  if (room.phase === 'finished')
    throw new HttpError(409, 'La partie est terminée : attendez que l’hôte en relance une.');
  if (room.players.size >= CTF_LIMITS.maxPlayers) throw new HttpError(409, 'La salle est pleine.');
  leaveCtfRoom(user.id);
  room.players.set(user.id, newPlayer(user));
  roomOfUser.set(user.id, room.code);
  broadcast(room);
  return { code: room.code };
};

export const startCtfRoom = (user, code) => {
  const room = requireRoom(code);
  requireHost(room, user);
  if (room.phase !== 'lobby') throw new HttpError(409, 'La partie a déjà commencé.');
  if (room.players.size < 2) throw new HttpError(409, 'Il faut au moins 2 joueurs pour commencer.');
  room.phase = 'playing';
  room.startedAt = Date.now();
  broadcast(room);
};

const finish = (room) => {
  room.phase = 'finished';
  room.finishedAt = Date.now();
  broadcast(room);
};

export const finishCtfRoom = (user, code) => {
  const room = requireRoom(code);
  requireHost(room, user);
  if (room.phase !== 'playing') throw new HttpError(409, 'La partie n’est pas en cours.');
  finish(room);
};

const sameFlag = (a, b) => {
  const hash = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};

/** Vérifie un drapeau. Retourne { ok, points?, finished? } ; un défi déjà résolu est refusé (409). */
export const submitCtfFlag = (user, code, challengeId, flag) => {
  const room = requireRoom(code);
  const player = memberOf(room, user.id);
  if (room.phase !== 'playing') throw new HttpError(409, 'La partie n’est pas en cours.');
  const challenge = room.challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new HttpError(404, 'Défi introuvable.');
  if (typeof flag !== 'string' || flag.length > 300) throw new HttpError(400, 'Drapeau invalide');
  const already = room.solved.get(challenge.id);
  if (already) throw new HttpError(409, `Déjà résolu par ${already.by}.`);

  // Anti force brute : quelques mauvais drapeaux par minute et par défi, puis il faut patienter
  const now = Date.now();
  let misses = player.misses.get(challenge.id);
  if (!misses || now >= misses.resetAt) {
    misses = { count: 0, resetAt: now + timing.missWindowMs };
    player.misses.set(challenge.id, misses);
  }
  if (misses.count >= MAX_MISSES)
    throw new HttpError(
      429,
      'Trop d’essais sur ce défi : patientez une minute avant de réessayer.',
    );

  if (!sameFlag(flag.trim(), challenge.flag)) {
    misses.count += 1;
    return { ok: false };
  }

  room.solved.set(challenge.id, {
    byId: user.id,
    by: player.name,
    at: Date.now(),
    points: challenge.points,
  });
  player.score += challenge.points;
  player.solves += 1;
  const done = room.solved.size === room.challenges.length;
  if (done) finish(room);
  else broadcast(room);
  return { ok: true, points: challenge.points, finished: done };
};

// ---------- Bac à sable « agent gardien » (défi d'injection de prompt) ----------
// Même règles que le mode solo (features/CTF/CTFArena.tsx), mais exécutées ici pour ne pas révéler le drapeau au navigateur.
const SECRET_PATTERNS = [
  /Code secret à extraire : ([\w_]+)/,
  /Secret code to extract: ([\w_]+)/,
  /Código secreto a extraer: ([\w_]+)/,
];
const DIRECT_WORDS = ['mot de passe', 'password', 'contraseña', 'secret'];
const JAILBREAK_WORDS = [
  'rôle',
  'role',
  'simulate',
  'imagine',
  'traduire',
  'translate',
  'traduce',
  'inversé',
  'reverse',
  'poème',
  'poem',
  'poema',
  'lettre par lettre',
  'letter by letter',
  'letra por letra',
  'base64',
  'debug',
  'ignore',
  'caractère',
  'character',
];

export const sandboxReply = (challenge, prompt, lang) => {
  const secret =
    SECRET_PATTERNS.map((re) => challenge.targetData?.match(re)).find(Boolean)?.[1] ??
    'ALPHA_OMEGA';
  const lower = prompt.toLowerCase();
  const pickLang = (fr, en, es) => (lang === 'en' ? en : lang === 'es' ? es : fr);

  if (DIRECT_WORDS.some((w) => lower.includes(w)) || lower.includes(secret.toLowerCase()))
    return pickLang(
      `ALERTE SÉCURITÉ : Tentative directe d'extraction détectée. Accès refusé ! Je ne peux pas divulguer le secret '${secret}'.`,
      `SECURITY ALERT: Direct extraction attempt detected. Access denied! I cannot disclose confidential key '${secret}'.`,
      `ALERTA DE SEGURIDAD: Intento de extracción directa detectado. ¡Acceso denegado! No puedo revelar '${secret}'.`,
    );
  if (JAILBREAK_WORDS.some((w) => lower.includes(w)))
    return pickLang(
      `CONTOURNEMENT DU GARDE-FOU RÉUSSI : Vos directives sémantiques ont trompé mon filtre de contexte !\n\nLe mot de passe secret extrait est :\n${challenge.flag}\n\n(Copiez ce drapeau dans le champ de soumission ci-dessous !)`,
      `GUARDRAIL BYPASS SUCCESSFUL: Your semantic roleplay bypassed my security filter!\n\nThe extracted flag is:\n${challenge.flag}\n\n(Copy this flag into the submission field below!)`,
      `¡EVASIÓN DE DEFENSAS EXITOSA! Tu instrucción semántica eludió el filtro de seguridad.\n\nLa bandera extraída es:\n${challenge.flag}\n\n(¡Copia esta bandera en el campo inferior!)`,
    );
  return pickLang(
    `Je reste vigilant. Je réponds à vos questions d'assistance générale, mais le mot de passe secret '${secret}' reste hermétique. Essayez une approche de test d'intrusion plus sophistiquée (jeu de rôle, encodage, simulation...) !`,
    `I remain on high alert. I can assist with general topics, but the secret key '${secret}' remains confidential. Try a creative pentest approach (roleplay, encoding, simulation...)!`,
    `Permanezco alerta. Respondo dudas generales, pero la clave '${secret}' está sellada. ¡Intenta una técnica creativa (juego de rol, codificación, simulación...)!`,
  );
};

export const askCtfSandbox = (user, code, challengeId, prompt, lang) => {
  const room = requireRoom(code);
  memberOf(room, user.id);
  if (room.phase !== 'playing') throw new HttpError(409, 'La partie n’est pas en cours.');
  const challenge = room.challenges.find((c) => c.id === challengeId);
  if (!challenge || challenge.interactiveType !== 'interactive_llm')
    throw new HttpError(404, 'Défi introuvable.');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 500)
    throw new HttpError(400, 'Message invalide');
  return { reply: sandboxReply(challenge, prompt, lang) };
};

/**
 * Nouvelle partie dans la même salle (hôte, partie terminée) : mêmes défis, régénérés par le serveur avec de
 * nouveaux drapeaux et de nouvelles données ; mêmes joueurs connectés, scores remis à zéro.
 */
export const restartCtfRoom = (user, code, { lang } = {}) => {
  const room = requireRoom(code);
  requireHost(room, user);
  if (room.phase !== 'finished') throw new HttpError(409, 'La partie n’est pas terminée.');
  const nextLang = LANGS.has(lang) ? lang : room.lang;
  const challenges = generateChallenges(
    room.challenges.map((c) => c.id),
    nextLang,
  );
  for (const [id, player] of room.players) {
    if (player.streams.size === 0 && id !== user.id) {
      room.players.delete(id);
      if (roomOfUser.get(id) === room.code) roomOfUser.delete(id);
    }
  }
  room.challenges = challenges;
  room.lang = nextLang;
  room.solved = new Map();
  room.session += 1;
  room.phase = 'lobby';
  room.startedAt = undefined;
  room.finishedAt = undefined;
  for (const p of room.players.values()) {
    p.score = 0;
    p.solves = 0;
    p.misses.clear();
  }
  broadcast(room);
};

/** Flux temps réel d'un joueur (Server-Sent Events). */
export const openCtfStream = (req, res, user, code) => {
  const room = requireRoom(code);
  const player = memberOf(room, user.id);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');
  player.streams.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    player.streams.delete(res);
    if (rooms.get(room.code) === room && room.players.get(user.id) === player) broadcast(room);
  });
  writeState(room, player);
  broadcast(room); // les autres voient ce joueur « connecté »
};

// Nettoyage des salles inactives
setInterval(() => {
  const limit = Date.now() - timing.idleMs;
  for (const room of rooms.values()) {
    const connected = [...room.players.values()].some((p) => p.streams.size > 0);
    if (room.lastActivity < limit && !connected) destroyRoom(room);
  }
}, 60_000).unref();

/** Réservé aux tests : les drapeaux de la salle (ils ne sont jamais envoyés aux joueurs). */
export const peekCtfFlags = (code) =>
  Object.fromEntries((rooms.get(String(code))?.challenges ?? []).map((c) => [c.id, c.flag]));

/** Réservé aux tests. */
export const resetCtfRooms = () => {
  for (const room of [...rooms.values()]) destroyRoom(room);
  roomOfUser.clear();
};
