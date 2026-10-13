// Adresse IP du visiteur, utilisée pour toutes les limitations de débit par IP.
// Partagé par server/api.mjs et server/geminiProxy.mjs : une seule logique à maintenir pour un code sensible.
//
// Ce site est servi derrière Cloudflare, y compris sur le sous-domaine *.onrender.com (vérifié : les réponses
// portent `Server: cloudflare` et `CF-RAY`). Cloudflare ÉCRASE l'en-tête CF-Connecting-IP à son bord avec la
// vraie adresse qui s'est connectée à lui : une valeur envoyée par le client dans cet en-tête est donc ignorée,
// contrairement à X-Forwarded-For que certains proxies se contentent d'ajouter à la suite d'une valeur déjà
// présente. Ne JAMAIS utiliser le premier élément de X-Forwarded-For : il peut être fourni par le client et
// permet de se faire passer pour une IP différente à chaque requête (contournement des limites de débit).
export const clientIp = (req, trustProxy) => {
  if (!trustProxy) return req.socket.remoteAddress || 'inconnu';
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).split(',')[0].trim();
  // Sans Cloudflare devant (autre hébergement) : ne faire confiance qu'au dernier maillon, ajouté par le
  // reverse-proxy directement connecté au serveur, jamais au premier qui peut être fourni par le client.
  const chain = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return chain[chain.length - 1] || req.socket.remoteAddress || 'inconnu';
};

/**
 * Détecte la mauvaise configuration la plus courante : un proxy est devant le serveur (en-têtes de proxy présents)
 * mais TRUST_PROXY n'est pas activé. Tous les visiteurs partageraient alors l'adresse du proxy : les limites de
 * débit et le blocage des connexions s'appliqueraient à tout le monde à la fois, et les cookies ne seraient pas `Secure`.
 * Retourne le message à journaliser, ou null.
 */
export const proxyConfigWarning = (req, trustProxy) => {
  if (trustProxy) return null;
  const h = req.headers;
  if (!h['x-forwarded-for'] && !h['cf-connecting-ip'] && !h['x-forwarded-proto']) return null;
  return 'Des en-têtes de proxy sont reçus mais TRUST_PROXY n’est pas activé : tous les visiteurs partagent la même adresse IP pour les limites de débit (définissez TRUST_PROXY=1 derrière un proxy HTTPS de confiance).';
};
