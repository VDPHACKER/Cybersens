// CTF en équipe (salles) : plusieurs joueurs résolvent ensemble les mêmes défis.
//
// Principes :
// - l'état des salles vit en mémoire (une seule instance du serveur, comme pour les quiz multijoueurs) ;
// - les défis sont générés ICI (générateurs de features/CTF, exécutés par le serveur) : les drapeaux n'existent
//   que dans ce processus, jamais dans un navigateur, hôte compris. Le serveur les vérifie à chaque soumission,
//   limite les essais et attribue lui-même les points ;
// - chaque joueur a SES propres exemplaires des défis (mêmes énoncés, données et drapeaux tirés au sort pour lui) :
//   il les résout séparément, ses points sont indépendants, et un drapeau trouvé par un autre ne lui sert à rien ;
// - le temps réel passe par Server-Sent Events (GET /api/ctf/rooms/stream).
import crypto from 'node:crypto';
import { HttpError } from './httpError.mjs';
import { CHALLENGE_FACTORIES } from '../features/CTF/ctfGenerator.ts';

export const CTF_LIMITS = {
  maxPlayers: 12,
  maxRooms: 100,
  minChallenges: 1,
  maxChallenges: 16,
};

/** Durées de partie proposées à l'hôte, en heures. */
export const CTF_DURATIONS_H = [4, 8, 12, 24, 48, 72];
export const CTF_DEFAULT_DURATION_H = 24;
/** Essais par joueur et par défi avant verrouillage. */
export const CTF_MAX_ATTEMPTS = 5;
/** Le verrouillage dure cette part de la durée choisie. */
const LOCK_FRACTION = 0.1;

const timing = {
  idleMs: 3 * 3_600_000, // salle inactive supprimée
  hourMs: 3_600_000, // valeur d'une « heure » de durée de partie (réduite dans les tests)
};

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
    lastSolveAt: p.lastSolveAt ?? null,
    connected: p.streams.size > 0,
  }));

/** Essais restants et verrouillage éventuel du joueur, par défi (seuls les défis déjà tentés y figurent). */
const attemptsOf = (player) => {
  const out = {};
  for (const [id, m] of player.misses)
    out[id] = { left: Math.max(0, CTF_MAX_ATTEMPTS - m.count), lockedUntil: m.lockedUntil ?? null };
  return out;
};

const snapshotFor = (room, userId) => {
  const me = room.players.get(userId);
  const solved = {};
  for (const [challengeId, s] of me.solved) solved[challengeId] = { at: s.at, points: s.points };
  return {
    code: room.code,
    phase: room.phase,
    session: room.session,
    hostId: room.hostId,
    now: Date.now(),
    startedAt: room.startedAt ?? null,
    finishedAt: room.finishedAt ?? null,
    durationMs: room.durationMs,
    endsAt: room.endsAt ?? null,
    maxAttempts: CTF_MAX_ATTEMPTS,
    attempts: attemptsOf(me),
    challenges: me.challenges.map(publicChallenge),
    solved,
    score: me.score,
    totalPoints: me.challenges.reduce((n, c) => n + c.points, 0),
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
  clearTimeout(room.timer);
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

const newPlayer = (user, challengeIds, lang) => ({
  id: user.id,
  name: user.displayName,
  challenges: generateChallenges(challengeIds, lang), // exemplaires personnels, drapeaux compris
  solved: new Map(), // challengeId -> { at, points }
  score: 0,
  solves: 0,
  lastSolveAt: undefined,
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

export const createCtfRoom = (user, { challengeIds, lang, durationHours }) => {
  const hours = durationHours ?? CTF_DEFAULT_DURATION_H;
  if (!CTF_DURATIONS_H.includes(hours))
    throw new HttpError(400, `Durée invalide : choisissez ${CTF_DURATIONS_H.join(', ')} heures.`);
  if (rooms.size >= CTF_LIMITS.maxRooms)
    throw new HttpError(503, 'Trop de salles ouvertes, réessayez dans quelques minutes.');
  const player = newPlayer(user, challengeIds, lang); // valide aussi la liste de défis
  leaveCtfRoom(user.id);
  const room = {
    code: newCode(),
    hostId: user.id,
    phase: 'lobby',
    session: 1,
    lang: LANGS.has(lang) ? lang : 'fr',
    challengeIds: [...challengeIds],
    durationMs: hours * timing.hourMs,
    players: new Map([[user.id, player]]),
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
  room.players.set(user.id, newPlayer(user, room.challengeIds, room.lang));
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
  room.endsAt = room.startedAt + room.durationMs;
  // À l'échéance, la partie se termine d'elle-même
  room.timer = setTimeout(() => room.phase === 'playing' && finish(room), room.durationMs);
  room.timer.unref();
  broadcast(room);
};

const finish = (room) => {
  clearTimeout(room.timer);
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
  const challenge = player.challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new HttpError(404, 'Défi introuvable.');
  if (typeof flag !== 'string' || flag.length > 300) throw new HttpError(400, 'Drapeau invalide');
  if (player.solved.has(challenge.id)) throw new HttpError(409, 'Vous avez déjà résolu ce défi.');

  // Essais limités : après CTF_MAX_ATTEMPTS mauvais drapeaux, le défi est verrouillé pour ce joueur pendant
  // 10 % de la durée choisie, puis ses essais lui sont rendus
  const now = Date.now();
  if (room.endsAt && now >= room.endsAt) {
    finish(room);
    throw new HttpError(409, 'Le temps est écoulé.');
  }
  let tries = player.misses.get(challenge.id);
  if (tries?.lockedUntil && now >= tries.lockedUntil) {
    player.misses.delete(challenge.id);
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
    player.misses.set(challenge.id, tries);
    tries.count += 1;
    if (tries.count >= CTF_MAX_ATTEMPTS)
      tries.lockedUntil = now + Math.round(room.durationMs * LOCK_FRACTION);
    writeState(room, player);
    return {
      ok: false,
      attemptsLeft: Math.max(0, CTF_MAX_ATTEMPTS - tries.count),
      lockedUntil: tries.lockedUntil ?? null,
    };
  }

  player.misses.delete(challenge.id);
  player.solved.set(challenge.id, { at: now, points: challenge.points });
  player.score += challenge.points;
  player.solves += 1;
  player.lastSolveAt = now;
  // La partie s'arrête d'elle-même quand tous les joueurs présents ont tout résolu
  const done = [...room.players.values()].every((p) => p.solved.size === p.challenges.length);
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
  const player = memberOf(room, user.id);
  if (room.phase !== 'playing') throw new HttpError(409, 'La partie n’est pas en cours.');
  const challenge = player.challenges.find((c) => c.id === challengeId);
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
  for (const [id, player] of room.players) {
    if (player.streams.size === 0 && id !== user.id) {
      room.players.delete(id);
      if (roomOfUser.get(id) === room.code) roomOfUser.delete(id);
    }
  }
  room.lang = nextLang;
  room.session += 1;
  room.phase = 'lobby';
  room.startedAt = undefined;
  room.finishedAt = undefined;
  room.endsAt = undefined;
  for (const p of room.players.values()) {
    p.challenges = generateChallenges(room.challengeIds, nextLang); // nouveaux drapeaux pour chacun
    p.solved = new Map();
    p.score = 0;
    p.solves = 0;
    p.lastSolveAt = undefined;
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

/** Réservé aux tests : les drapeaux d'un joueur (ils ne sont jamais envoyés aux joueurs). */
export const peekCtfFlags = (code, userId) =>
  Object.fromEntries(
    (rooms.get(String(code))?.players.get(userId)?.challenges ?? []).map((c) => [c.id, c.flag]),
  );

/** Réservé aux tests. */
export const resetCtfRooms = () => {
  for (const room of [...rooms.values()]) destroyRoom(room);
  roomOfUser.clear();
};
