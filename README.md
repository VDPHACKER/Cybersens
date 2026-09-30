# CyberSens — Sensibiliser • Protéger • Agir

Plateforme de sensibilisation à la cybersécurité : 12 modules de formation (60 leçons) avec quiz et examens, certificats vérifiables, arène CTF (24 défis), 9 mini-jeux, outils d'analyse, assistant IA, actualités en direct, classements et communauté. Interface en français, anglais et espagnol.

## Architecture

| Couche          | Technologie                                                                               |
| --------------- | ----------------------------------------------------------------------------------------- |
| Interface       | React 19 + Vite 6 + Tailwind CSS 3 (compilé), PWA hors-ligne                              |
| Serveur         | Node.js ≥ 22.18, sans framework (`node:http`)                                             |
| Base de données | PostgreSQL (Neon en production via `DATABASE_URL`, PGlite embarqué en développement)      |
| IA              | Gemini, via un relais serveur (`/api/gemini`) : la clé n'est jamais envoyée au navigateur |

```
navigateur ──► /            fichiers statiques (dist/)
           ──► /api/...     comptes, progression, examens, certificats (server/api.mjs)
           ──► /api/gemini  relais IA authentifié (server/geminiProxy.mjs)
```

Le stockage local du navigateur n'est qu'un cache : la base du serveur fait foi. Les examens sont corrigés par le serveur, qui seul délivre et signe (HMAC-SHA256) les certificats.

## Application installable (PWA)

- **Installation** sur Android, iOS (Partager → « Sur l'écran d'accueil »), Windows, macOS et ChromeOS, avec icône adaptative (_maskable_) et raccourcis : Formations, Quiz, Assistant IA, Outils.
- **Hors ligne** : le service worker (Workbox, généré par `vite-plugin-pwa`) pré-cache toute l'application, polices comprises (hébergées localement). Les cours, quiz, laboratoires et le CTF fonctionnent sans connexion ; les illustrations déjà consultées restent disponibles.
- **Synchronisation différée** : la progression, les points et les résultats de quiz enregistrés hors ligne sont mis en file puis envoyés au retour du réseau. L'examen de certification et l'assistant IA nécessitent une connexion.
- **Mises à jour** : une notification propose d'appliquer la nouvelle version (vérification toutes les heures). `/api/` n'est jamais servi depuis le cache.
- **Icônes** : régénérées depuis `public/favicon.svg` avec `npx pwa-assets-generator` (voir `pwa-assets.config.ts`).

Le service worker n'est actif qu'en production (`npm run build && npm start`, ou `npm run preview`) et nécessite HTTPS (sauf sur `localhost`).

## Démarrage rapide (développement)

```bash
npm install
cp .env.example .env.local   # puis renseigner GEMINI_API_KEY
npm run dev                  # http://localhost:3000 (API et base incluses)
```

`npm run dev -- --host` pour accéder à l'application depuis le réseau local.

## Scripts

| Commande                                                              | Rôle                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                                         | Serveur de développement (Vite + API + base)                                                                 |
| `npm run typecheck`                                                   | Vérification TypeScript                                                                                      |
| `npm test`                                                            | Tests d'intégration de l'API (base temporaire)                                                               |
| `npm run check`                                                       | Lint + typage + tests + build : à lancer avant chaque livraison (la CI vérifie aussi `npm run format:check`) |
| `npm run build`                                                       | Build de production dans `dist/`                                                                             |
| `npm start`                                                           | Serveur de production (après `npm run build`)                                                                |
| `npm run db:backup`                                                   | Sauvegarde à chaud de la base dans `backups/`                                                                |
| `npm run docker:up` / `docker:down` / `docker:logs` / `docker:backup` | Exploitation Docker                                                                                          |

## Variables d'environnement

Voir [`.env.example`](.env.example) : `GEMINI_API_KEY`, `CERT_SECRET`, `TRUST_PROXY`, `ADMIN_EMAILS`, `PORT`, `DATABASE_URL`, `DB_PATH`, `BACKUP_DIR`, `GEMINI_FALLBACK_MODELS`, `ACCESS_LOG`.

**Mise en ligne : voir le guide [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)** (variables, Railway, Docker, tests de fumée, sauvegardes, points d'attention).

## Déploiement avec Docker

```bash
cp .env.example .env          # renseigner les valeurs
docker compose up -d --build  # http://<serveur>:8080
docker compose ps             # l'état « healthy » confirme que /api/health répond
```

- La base est dans le volume `cybersens-data` et survit aux redéploiements.
- Le conteneur tourne sans privilèges : utilisateur non root, système de fichiers en lecture seule, capacités retirées, mémoire limitée.
- **HTTPS est obligatoire en production.** Placez un reverse-proxy devant le conteneur et mettez `TRUST_PROXY=1`. Exemple avec Caddy (certificat Let's Encrypt automatique) :

  ```
  cybersens.example.org {
      reverse_proxy localhost:8080
  }
  ```

Sans Docker : `npm ci && npm run build && npm start`, sur un hébergement avec **disque persistant** (VPS, ou Render/Railway avec volume).

## Environnements (Railway)

Un seul projet Railway, deux environnements isolés (services, variables et volumes propres à chacun) :

| Environnement | Branche   | Rôle                                                                             |
| ------------- | --------- | -------------------------------------------------------------------------------- |
| `staging`     | `staging` | Vérification avant mise en production ; se déploie automatiquement à chaque push |
| `production`  | `main`    | Environnement live ; déploiement décrit dans la CI (§ Intégration continue)      |

Déploiement basé sur `railway.toml` (build via le `Dockerfile` existant, healthcheck `/api/health`).

- Chaque environnement a son propre volume persistant (`/app/data`) : les bases de données sont totalement séparées.
- `CERT_SECRET` doit être **différent** entre staging et production (sinon les certificats de test seraient valides en production).
- Flux de travail : les branches de fonctionnalité fusionnent dans `staging` (déployé et vérifié), puis `staging` fusionne dans `main` (production).

## Exploitation

- **Santé** : `GET /api/health` renvoie `{"status":"ok","database":"ok",...}`, ou 503 si la base est indisponible.
- **Journaux** : une ligne JSON par requête sur la sortie standard (méthode, chemin, statut, durée), sans corps ni cookie.
- **Sécurité** : la table `security_log` enregistre inscriptions, connexions et échecs de connexion.
- **Sauvegardes** : `npm run db:backup` (ou `npm run docker:backup`) crée une copie cohérente sans arrêter le service. Copiez-les hors du serveur (planification conseillée : quotidienne, via cron).
- **Restauration** : arrêter le service, remplacer `data/cybersens.db` par la sauvegarde (et supprimer `cybersens.db-wal` / `-shm`), redémarrer.
- **Arrêt** : `SIGTERM` termine les requêtes en cours puis ferme proprement la base.

## Intégration continue

`.github/workflows/ci.yml`, à chaque push et pull request :

1. typage, tests, build, audit npm et recherche de clé API dans le build ;
2. construction de l'image Docker, démarrage, vérification de `/api/health` et des en-têtes de sécurité ;
3. analyse de vulnérabilités de l'image (Trivy).

Dependabot propose chaque semaine les mises à jour npm, GitHub Actions et de l'image Docker.

## Sécurité (résumé)

Mots de passe hachés avec scrypt, session en cookie `HttpOnly` / `SameSite=Lax`, protection CSRF (origine vérifiée, JSON obligatoire), requêtes SQL préparées, limitation de débit, verrouillage après 5 échecs, message d'erreur identique que l'e-mail existe ou non, CSP stricte, `X-Frame-Options: DENY`, HSTS derrière HTTPS, clé IA uniquement côté serveur, routes d'administration réservées aux comptes de `ADMIN_EMAILS`, messages de la communauté affichés en texte brut (aucun HTML interprété), points déclarés par le navigateur plafonnés par jour côté serveur.
