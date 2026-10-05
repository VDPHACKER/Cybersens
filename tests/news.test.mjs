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
