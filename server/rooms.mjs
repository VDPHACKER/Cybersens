// Quiz multijoueur en salles (type Mentimeter / Kahoot) : chaque joueur utilise son propre téléphone.
//
// Principes :
// - l'état des salles vit en mémoire (une seule instance du serveur, comme pour les limites de débit) ;
// - le serveur pilote la partie (minuteur, révélation, score) : un client ne peut pas tricher sur le temps ;
// - les bonnes réponses ne quittent le serveur qu'à la révélation ;
// - le temps réel passe par Server-Sent Events (GET /api/rooms/stream) ; les actions sont des POST classiques.
import crypto from 'node:crypto';
import { HttpError } from './httpError.mjs';
import { QUESTION_BANK } from './quizBank.mjs';

export const LIMITS = {
  maxPlayers: 12,
  maxRooms: 200,
  minQuestions: 3,
  maxQuestions: QUESTION_BANK.length,
  minSeconds: 10,
  maxSeconds: 60,
};

const timing = {
  revealMs: 6_000, // durée d'affichage de la correction entre deux questions
  graceMs: 500, // tolérance réseau après la fin du minuteur
  idleMs: 2 * 3_600_000, // salle inactive supprimée
};

/** Réservé aux tests : accélère les temps d'attente. */
export const setRoomTiming = (overrides) => Object.assign(timing, overrides);

const LANG_KEYS = ['fr', 'en', 'es'];
const pick = (triple) => Object.fromEntries(LANG_KEYS.map((k, i) => [k, triple[i]]));
const rooms = new Map(); // code -> salle
const roomOfUser = new Map(); // userId -> code (une salle à la fois)

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const newCode = () => {
  for (let i = 0; i < 20; i++) {
    const code = String(crypto.randomInt(100_000, 1_000_000));
    if (!rooms.has(code)) return code;
  }
  throw new HttpError(503, 'Impossible de créer une salle pour le moment.');
};

// ---------- Représentation envoyée aux joueurs ----------
const playerList = (room) =>
  [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    answered: p.choice !== null,
    connected: p.streams.size > 0,
  }));

const snapshotFor = (room, userId) => {
  const question = room.questions[room.index];
  const me = room.players.get(userId);
  const base = {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    total: room.questions.length,
    seconds: room.seconds,
    index: room.index,
    now: Date.now(),
    players: playerList(room),
    you: { id: userId, isHost: userId === room.hostId, choice: me ? me.choice : null },
  };
  if (room.phase === 'question' || room.phase === 'reveal') {
    base.deadline = room.deadline;
    base.question = { text: question.text, options: question.options };
  }
  if (room.phase === 'reveal') {
    base.reveal = {
      correct: question.correct,
      counts: room.counts,
      results: Object.fromEntries(
        [...room.players.values()].map((p) => [p.id, { choice: p.choice, points: p.lastPoints }]),
      ),
    };
  }
  if (room.phase === 'finished') {
    base.ranking = [...room.players.values()]
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
  }
  return base;
};

const writeState = (room, player) => {
  const payload = `event: state\ndata: ${JSON.stringify(snapshotFor(room, player.id))}\n\n`;
  for (const res of player.streams) res.write(payload);
};

const broadcast = (room) => {
  room.lastActivity = Date.now();
  for (const player of room.players.values()) writeState(room, player);
};

// ---------- Déroulement de la partie ----------
const clearTimers = (room) => {
  clearTimeout(room.questionTimer);
  clearTimeout(room.revealTimer);
};

const destroyRoom = (room) => {
  clearTimers(room);
  for (const player of room.players.values()) {
    for (const res of player.streams) res.end();
    if (roomOfUser.get(player.id) === room.code) roomOfUser.delete(player.id);
  }
  rooms.delete(room.code);
};

const beginQuestion = (room) => {
  room.phase = 'question';
  room.startedAt = Date.now();
  room.deadline = room.startedAt + room.seconds * 1000;
  room.counts = [0, 0, 0, 0];
  for (const p of room.players.values()) {
    p.choice = null;
    p.lastPoints = 0;
  }
  room.questionTimer = setTimeout(() => reveal(room), room.seconds * 1000 + timing.graceMs);
  broadcast(room);
};

const reveal = (room) => {
  if (room.phase !== 'question') return;
  clearTimeout(room.questionTimer);
  room.phase = 'reveal';
  broadcast(room);
  room.revealTimer = setTimeout(() => {
    if (room.index + 1 < room.questions.length) {
      room.index += 1;
      beginQuestion(room);
    } else {
      room.phase = 'finished';
      broadcast(room);
    }
  }, timing.revealMs);
};

// ---------- Actions ----------
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

export const leaveRoom = (userId) => {
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
  if (room.phase === 'question' && [...room.players.values()].every((p) => p.choice !== null))
    return reveal(room);
  broadcast(room);
};

export const createRoom = (user, { count, seconds }) => {
  if (rooms.size >= LIMITS.maxRooms)
    throw new HttpError(503, 'Trop de salles ouvertes, réessayez dans quelques minutes.');
  if (!Number.isInteger(count) || count < LIMITS.minQuestions || count > LIMITS.maxQuestions)
    throw new HttpError(400, 'Nombre de questions invalide');
  if (!Number.isInteger(seconds) || seconds < LIMITS.minSeconds || seconds > LIMITS.maxSeconds)
    throw new HttpError(400, 'Durée par question invalide');

  leaveRoom(user.id);
  const questions = shuffle(QUESTION_BANK)
    .slice(0, count)
    .map((q) => {
      const order = shuffle([0, 1, 2, 3]);
      // Chaque joueur lit la question dans sa propre langue : les trois versions sont envoyées
      return {
        text: pick(q.question),
        options: order.map((i) => pick(q.options[i])),
        correct: order.indexOf(q.answer),
      };
    });

  const room = {
    code: newCode(),
    hostId: user.id,
    seconds,
    phase: 'lobby',
    questions,
    index: 0,
    counts: [0, 0, 0, 0],
    players: new Map(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  room.players.set(user.id, {
    id: user.id,
    name: user.displayName,
    score: 0,
    choice: null,
    lastPoints: 0,
    streams: new Set(),
  });
  rooms.set(room.code, room);
  roomOfUser.set(user.id, room.code);
  return { code: room.code };
};

export const joinRoom = (user, code) => {
  const room = requireRoom(code);
  if (room.players.has(user.id)) {
    roomOfUser.set(user.id, room.code);
    return { code: room.code }; // reconnexion
  }
  if (room.phase !== 'lobby')
    throw new HttpError(409, 'La partie a déjà commencé : impossible de la rejoindre.');
  if (room.players.size >= LIMITS.maxPlayers) throw new HttpError(409, 'La salle est pleine.');
  leaveRoom(user.id);
  room.players.set(user.id, {
    id: user.id,
    name: user.displayName,
    score: 0,
    choice: null,
    lastPoints: 0,
    streams: new Set(),
  });
  roomOfUser.set(user.id, room.code);
  broadcast(room);
  return { code: room.code };
};

export const startRoom = (user, code) => {
  const room = requireRoom(code);
  memberOf(room, user.id);
  if (room.hostId !== user.id) throw new HttpError(403, 'Seul l’hôte peut lancer la partie.');
  if (room.phase !== 'lobby') throw new HttpError(409, 'La partie a déjà commencé.');
  if (room.players.size < 2) throw new HttpError(409, 'Il faut au moins 2 joueurs pour commencer.');
  beginQuestion(room);
};

export const answerRoom = (user, code, choice) => {
  const room = requireRoom(code);
  const player = memberOf(room, user.id);
  if (!Number.isInteger(choice) || choice < 0 || choice > 3)
    throw new HttpError(400, 'Réponse invalide');
  const now = Date.now();
  if (room.phase !== 'question' || now > room.deadline + timing.graceMs)
    throw new HttpError(409, 'Le temps est écoulé pour cette question.');
  if (player.choice !== null) throw new HttpError(409, 'Vous avez déjà répondu.');

  player.choice = choice;
  room.counts[choice] += 1;
  if (choice === room.questions[room.index].correct) {
    const elapsed = Math.min(now - room.startedAt, room.seconds * 1000);
    player.lastPoints = 1000 - Math.round((500 * elapsed) / (room.seconds * 1000));
    player.score += player.lastPoints;
  }
  if ([...room.players.values()].every((p) => p.choice !== null)) reveal(room);
  else broadcast(room);
};

/** Flux temps réel d'un joueur (Server-Sent Events). */
export const openStream = (req, res, user, code) => {
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

/** Réservé aux tests. */
export const resetRooms = () => {
  for (const room of [...rooms.values()]) destroyRoom(room);
  roomOfUser.clear();
};
