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
