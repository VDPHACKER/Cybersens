# Guide de déploiement de CyberSens

Ce guide décrit comment mettre CyberSens en ligne (Railway ou serveur Docker), comment vérifier que tout fonctionne, et ce qu'il faut surveiller ensuite.

## 1. État de préparation (vérifié en local)

| Contrôle de la CI            | Résultat                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| Lint (`npm run lint`)        | 0 erreur                                                             |
| Formatage (`format:check`)   | conforme                                                             |
| Typage (`npm run typecheck`) | 0 erreur                                                             |
| Tests (`npm test`)           | 24 tests sur 24 réussis                                              |
| Build (`npm run build`)      | réussi                                                               |
| Audit npm (production)       | 0 vulnérabilité                                                      |
| Clé API dans le build        | aucune                                                               |
| Démarrage du serveur         | vérifié avec exactement les fichiers copiés dans l'image (voir § 8)  |
| Image Docker                 | **non construite en local** (Docker Desktop éteint) : la CI la teste |

## 2. Variables d'environnement

Copier `.env.example` vers `.env` (Docker) ou `.env.local` (`npm start`). **Ne jamais versionner ces fichiers.**

| Variable                                                       | Obligatoire | Rôle                                                                                                                                                                   |
| -------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                               | Oui         | Clé de l'assistant IA. Reste sur le serveur. Sans elle, l'IA répond « non configurée ».                                                                                |
| `CERT_SECRET`                                                  | Oui         | Secret de signature des certificats (`openssl rand -hex 32`). **Différent** entre test et production, **jamais modifié** après émission de certificats.                |
| `TRUST_PROXY`                                                  | Oui (HTTPS) | `1` derrière un reverse-proxy HTTPS : active HSTS, cookies `Secure` et l'IP réelle du client.                                                                          |
| `ADMIN_EMAILS`                                                 | Conseillé   | E-mails des administrateurs (séparés par des virgules) : Centre DevOps et modération de la Communauté. Vide = désactivés.                                              |
| `GOOGLE_CLIENT_ID`                                             | Optionnel   | Active « Se connecter avec Google ». ID client OAuth (Google Cloud Console) ; ajouter l'URL du site dans les « origines JavaScript autorisées ». Vide = bouton masqué. |
| `BREVO_API_KEY` ou `RESEND_API_KEY`, `MAIL_FROM`, `PUBLIC_URL` | Optionnel   | Active « Mot de passe oublié » par e-mail (service Resend). Les trois sont nécessaires. Sinon l'écran renvoie vers l'administrateur.                                   |
| `PORT`, `HOST`                                                 | Non         | Adresse d'écoute (8080 par défaut).                                                                                                                                    |
| `DB_PATH`                                                      | Non         | Dossier de la base PGlite (développement ou Docker sans `DATABASE_URL`).                                                                                               |
| `BACKUP_DIR`                                                   | Non         | Dossier des sauvegardes (`backups/` par défaut).                                                                                                                       |
| `GEMINI_FALLBACK_MODELS`                                       | Non         | Modèles IA de secours si le principal est surchargé (par défaut `gemini-2.5-flash,gemini-2.5-flash-lite`).                                                             |
| `ACCESS_LOG`                                                   | Non         | `0` pour couper le journal d'accès JSON.                                                                                                                               |

## 3. Déploiement sur Railway (staging puis production)

1. Créer un projet Railway relié au dépôt GitHub. Railway utilise `railway.toml` (build via le `Dockerfile`, contrôle de santé `/api/health`).
2. Créer deux environnements : `staging` (branche `staging`) et `production` (branche `main`).
3. **Pour chaque environnement**, fournir `DATABASE_URL` (PostgreSQL managé) **ou** ajouter un **volume** monté sur `/app/data` (base PGlite). Sans l'un des deux, les comptes sont perdus à chaque redéploiement.
4. Renseigner les variables du § 2, avec un `CERT_SECRET` **différent** par environnement, et `TRUST_PROXY=1`.
5. Déployer d'abord `staging`, dérouler les tests de fumée du § 5, puis fusionner `staging` dans `main`.
6. Associer un domaine personnalisé (le certificat HTTPS est fourni par Railway).

## 4. Déploiement sur un serveur avec Docker

```bash
cp .env.example .env            # renseigner les valeurs (§ 2)
docker compose up -d --build    # http://<serveur>:8080
docker compose ps               # l'état « healthy » confirme que /api/health répond
```

Placer un reverse-proxy HTTPS devant le conteneur et mettre `TRUST_PROXY=1`. Exemple avec Caddy (certificat Let's Encrypt automatique) :

```
cybersens.example.org {
    reverse_proxy localhost:8080
}
```

Le conteneur tourne sans privilèges (utilisateur non root, système de fichiers en lecture seule, capacités retirées, 512 Mo de mémoire). La base est dans le volume `cybersens-data`.

## 5. Premier lancement et tests de fumée

1. **Créer le compte administrateur** : s'inscrire sur le site avec l'e-mail voulu, puis ajouter cet e-mail dans `ADMIN_EMAILS` et redémarrer. Le Centre DevOps apparaît alors dans le menu.
2. Vérifier, dans l'ordre :
   - [ ] `GET /api/health` répond `{"status":"ok","database":"ok"}`
   - [ ] La page se charge en HTTPS ; les en-têtes contiennent HSTS, CSP et `X-Frame-Options: DENY`
   - [ ] Inscription, déconnexion, connexion
   - [ ] Ouverture d'un cours, leçon terminée, progression conservée après rechargement
   - [ ] Quiz solo, un mini-jeu (les points d'expérience augmentent)
   - [ ] Examen réussi (score de 70 % ou plus), certificat émis, vérification publique du certificat
   - [ ] Assistant IA : une réponse arrive (sinon vérifier `GEMINI_API_KEY`)
   - [ ] Actualités : le badge « Live » s'affiche avec de vrais articles
   - [ ] Classements : le membre apparaît ; l'option « Me masquer » fonctionne
   - [ ] Communauté : publier, commenter, aimer, supprimer son message
   - [ ] Panneau de don : apparaît au bout d'une minute, se ferme, disparaît seul après 15 s
   - [ ] Installation PWA sur téléphone, puis ouverture hors ligne d'un cours déjà consulté
   - [ ] Mode clair : Arène CTF et Mini-jeux lisibles
3. Lancer une **sauvegarde** (`docker compose exec app node server/backup.mjs` ou le Centre DevOps) et vérifier que le fichier est créé.

## 6. Sauvegardes, restauration et retour arrière

- **Sauvegarde** : `npm run db:backup` ou `npm run docker:backup` (copie cohérente à chaud dans `backups/`). Planifier une sauvegarde **quotidienne** (cron) et copier les fichiers **hors du serveur**.
- **Restauration** : arrêter le service, remplacer `data/cybersens.db` par la sauvegarde (et supprimer `cybersens.db-wal` et `cybersens.db-shm`), redémarrer.
- **Retour arrière** : redéployer le commit précédent (Railway : « Redeploy » de la version précédente). Les migrations de base sont **additives** : revenir à une ancienne version du code reste possible sans toucher aux données.

## 7. Points d'attention connus

Ces limites ne bloquent pas la mise en ligne, mais elles doivent être connues :

- **Une seule instance** : Les limites de débit en mémoire imposent un seul conteneur. Ne pas faire de mise à l'échelle horizontale. Les limites de débit repartent de zéro à chaque redémarrage.
- **Cours en espagnol** : les 12 modules sont traduits (`services/courseTranslationsEs/`), avec des tests d'alignement avec la version anglaise.
- **Modération** : chaque message peut être signalé ; les administrateurs (`ADMIN_EMAILS`) voient les signalements et peuvent tout supprimer.
- **Quiz multijoueur (salles)** : l'état des salles est en mémoire (perdu au redémarrage, ce qui interrompt les parties en cours) et le temps réel passe par Server-Sent Events. Derrière un reverse-proxy, ne pas mettre `/api/rooms/stream` en cache ni le compresser (en-tête `X-Accel-Buffering: no` déjà envoyé). Limites : 12 joueurs par salle, 200 salles ouvertes. Les points de ces parties ne sont pas crédités au classement (anti-triche).
- **Comptes** : changement de mot de passe dans le Profil ; réinitialisation par l'opérateur (`npm run admin:reset-password -- <email>` ou `docker compose exec app node server/resetPassword.mjs <email>`). Le « Mot de passe oublié » par e-mail et la connexion Google demandent la configuration ci-dessus (non testés de bout en bout : ils exigent un compte Google Cloud et un compte Resend). Pas de vérification d'e-mail à l'inscription.
- **Points d'expérience** : le navigateur déclare ses points, plafonnés à **1 500 par jour et par membre** côté serveur. Les examens créditent leurs points directement côté serveur.
- **Quotas IA** : l'assistant dépend de l'API Gemini ; en cas de surcharge, le serveur réessaie puis bascule sur les modèles de secours.
- **Actualités** : le serveur lit des flux RSS externes (CERT-FR, ZATAZ, LeMagIT, The Hacker News, BleepingComputer, Krebs). Si une source tombe, les autres continuent ; si toutes tombent, des articles locaux s'affichent.
- **Indice de vigilance** de l'onglet Actualités : calculé à partir des articles récupérés.

## 8. Comment les vérifications ont été faites

La CI (`.github/workflows/ci.yml`) exécute : lint, formatage, typage, tests, build, audit npm, recherche de clé API dans le build, puis construit l'image Docker, vérifie `/api/health` et les en-têtes de sécurité, et analyse l'image avec Trivy.

En local, toutes les étapes hors Docker ont été exécutées avec succès. Pour l'image, le serveur a été démarré à partir d'un dossier contenant **uniquement** les fichiers que le `Dockerfile` copie (`package.json`, `dist/`, `server/`, `services/coursesData.ts`, `services/advancedCoursesData.ts`) : santé, en-têtes de sécurité, actualités et protection des routes ont répondu comme attendu.

## 9. Mettre à jour le site

1. Développer sur une branche, lancer `npm run check` et `npm run format:check`.
2. Fusionner dans `staging`, vérifier, puis fusionner dans `main`.
3. Les nouvelles migrations de base s'appliquent automatiquement au démarrage.
4. Les utilisateurs de la PWA voient la bannière « Nouvelle version disponible ».

## 10. Pourquoi pas Firebase / Cloud Run ?

Un lien `.web.app` (Firebase Hosting) passe par Cloud Run, dont le disque est **éphémère** : la base embarquée (comptes, progression, certificats, communauté) y serait effacée à chaque redéploiement ou redémarrage. Avec de vrais utilisateurs, il faut un **disque persistant** : c'est le cas de Railway avec un volume monté sur `/app/data` (section 3) ou d'un VPS.
