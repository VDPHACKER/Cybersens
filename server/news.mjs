// Actualités cyber en temps réel : agrège des flux RSS/Atom de sites d'actualité externes.
// La récupération se fait côté serveur (pas de CORS, pas de tiers appelé depuis le navigateur)
// avec un cache mémoire pour ménager les sources.

const FEEDS = [
  { source: 'CERT-FR', lang: 'fr', url: 'https://www.cert.ssi.gouv.fr/feed/' },
  { source: 'ZATAZ', lang: 'fr', url: 'https://www.zataz.com/feed/' },
  { source: 'LeMagIT', lang: 'fr', url: 'https://www.lemagit.fr/rss/ContentSyndication.xml' },
  { source: 'The Hacker News', lang: 'en', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { source: 'BleepingComputer', lang: 'en', url: 'https://www.bleepingcomputer.com/feed/' },
  { source: 'Krebs on Security', lang: 'en', url: 'https://krebsonsecurity.com/feed/' },
];

const CACHE_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_FEED_CHARS = 2_000_000;
const MAX_PER_FEED = 12;
const MAX_TOTAL = 60;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const stripHtml = (s) =>
  decode(decode(s).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
};

const safeUrl = (raw) => {
  try {
    const u = new URL(decode(raw).trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
};

const categorize = (text) => {
  const t = text.toLowerCase();
  if (/(webinar|conference|conférence|summit|salon|event|événement|hackathon|forum)/.test(t))
    return 'events';
  if (/(conseil|guide|bonnes pratiques|how to|best practice|tips|protect|comment )/.test(t))
    return 'tips';
  return 'threats';
};

const parseFeed = (xml, feed) => {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  const items = [];
  for (const block of blocks.slice(0, MAX_PER_FEED)) {
    const title = stripHtml(tag(block, 'title'));
    const link =
      safeUrl(tag(block, 'link')) ||
      safeUrl((block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] || '');
    const date = new Date(
      decode(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated')).trim(),
    );
    if (!title || !link || Number.isNaN(date.getTime())) continue;
    const summary = stripHtml(
      tag(block, 'description') || tag(block, 'summary') || tag(block, 'content'),
    );
    items.push({
      id: `${feed.source}:${link}`,
      title: title.slice(0, 200),
      summary: summary.slice(0, 400),
      url: link,
      source: feed.source,
      lang: feed.lang,
      category: categorize(`${title} ${summary}`),
      publishedAt: date.toISOString(),
    });
  }
  return items;
};

const fetchFeed = async (feed) => {
  const res = await fetch(feed.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'CyberSensNewsBot/1.0',
      Accept: 'application/rss+xml, application/atom+xml, text/xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed((await res.text()).slice(0, MAX_FEED_CHARS), feed);
};

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

export const getNews = async () => {
  if (Date.now() - cache.at > CACHE_MS) {
    inflight ??= refresh().finally(() => (inflight = null));
    await inflight;
  }
  return { updatedAt: new Date(cache.at).toISOString(), articles: cache.articles };
};

export const _parseFeedForTest = parseFeed;
export const _expireCacheForTest = () => {
  cache.at = 0;
};
