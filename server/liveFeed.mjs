// Flux temps réel (Server-Sent Events) : notifications de la Communauté et des actualités.
// Même technique que server/rooms.mjs : une réponse HTTP gardée ouverte, ping périodique.
import { getNews, onNewArticles } from './news.mjs';
import { newsPush, pushInBackground } from './push.mjs';

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
    // Le navigateur reconnecte seul un flux fermé : on prévient l'onglet évincé pour qu'il s'arrête
    write(oldest, 'event: replaced\ndata: {}\n\n');
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
  const data = {
    count: fresh.length,
    items: fresh
      .slice(0, MAX_NEWS_ITEMS)
      .map((a) => ({ id: a.id, title: a.title, source: a.source })),
  };
  publish('news', data);
  pushInBackground(newsPush(data));
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
