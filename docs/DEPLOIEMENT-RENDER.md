# Déploiement gratuit sans carte bancaire : Render + Neon

- **Render** (offre gratuite) héberge le site et l'API.
- **Neon** (offre gratuite) héberge la base **PostgreSQL** : comptes, progression, certificats, communauté. Sa console permet de **voir et d'éditer les tables** (utilisateurs compris).

La base est hors du serveur Render : les données survivent aux redémarrages et aux redéploiements, même si le disque de Render est éphémère.

Ni Render ni Neon ne demandent de carte bancaire pour ces offres gratuites (à confirmer à l'inscription : les conditions des hébergeurs peuvent changer).

## 1. Créer la base (Neon)

1. Créer un compte sur <https://neon.tech> (connexion GitHub ou Google).
2. **Create project** : nom `cybersens`, version Postgres par défaut, région **AWS Europe (Frankfurt)** (la même que Render, pour la vitesse).
3. Sur le tableau de bord du projet, cliquer **Connect** et copier la **chaîne de connexion** (case « Pooled connection » cochée). Elle ressemble à :

   ```
   postgresql://neondb_owner:MOT_DE_PASSE@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   C'est votre `DATABASE_URL`. **C'est un secret** : ne la publiez nulle part, ne la mettez pas dans Git.

Les tables sont créées automatiquement au premier démarrage du site.

## 2. Créer le site (Render)

1. Créer un compte sur <https://render.com> (connexion GitHub) et autoriser l'accès au dépôt `VDPHACKER/Cybersens`.
2. **New → Web Service** → choisir le dépôt → renseigner :
   - **Branch** : `feature/deploiement-firebase` (ou `main` une fois la fusion faite)
   - **Language / Runtime** : `Docker` (le `Dockerfile` est détecté)
   - **Region** : Frankfurt (EU Central)
   - **Instance type** : `Free`
3. **Advanced → Health Check Path** : `/api/health`
4. **Environment Variables** :

   | Variable         | Valeur                                                                       |
   | ---------------- | ---------------------------------------------------------------------------- |
   | `DATABASE_URL`   | la chaîne Neon de l'étape 1                                                  |
   | `TRUST_PROXY`    | `1`                                                                          |
   | `CERT_SECRET`    | une valeur aléatoire de 64 caractères hexadécimaux. **Ne jamais la changer** |
   | `GEMINI_API_KEY` | votre clé Gemini (assistant IA)                                              |
   | `ADMIN_EMAILS`   | `freelence1200@gmail.com` (comptes administrateurs)                          |
   | `CONTACT_EMAIL`  | `freelence1200@gmail.com` (affiché dans les conditions d'utilisation)        |
   | `PUBLIC_URL`     | l'adresse `https://….onrender.com` du site (utile pour les e-mails)          |

   Pour générer `CERT_SECRET` : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

5. **Create Web Service**. Le premier déploiement dure quelques minutes. Le site est ensuite en HTTPS sur `https://<nom>.onrender.com`.

## 3. Vérifier

```bash
curl https://<nom>.onrender.com/api/health
# {"status":"ok","database":"ok","uptimeSeconds":...}
```

Puis sur le site : s'inscrire (case des conditions obligatoire), se déconnecter, se reconnecter.

## 4. Voir les utilisateurs et les données

- **Dans le site** : inscrivez-vous avec l'e-mail de `ADMIN_EMAILS`. Le **Centre DevOps** apparaît dans le menu. À la **première ouverture**, il propose de **définir le mot de passe administrateur** (12 caractères minimum, stocké haché dans la base) — rien à configurer côté Render. Aux ouvertures suivantes, il demande cet e-mail et ce mot de passe, valables 30 minutes ou jusqu'à la déconnexion (bouton **Verrouiller**) ; sans eux, aucune donnée n'est affichée. Ensuite : nombre d'inscrits, **liste des membres** (nom, e-mail, profil, points, leçons, certificats, dates d'inscription et de dernière connexion, acceptation des conditions), recherche, export CSV, sauvegarde JSON téléchargeable, et un bouton pour changer ce mot de passe.
- **Dans Neon** : projet → **Tables** (ou **SQL Editor**) : toutes les tables (`users`, `certificates`, `posts`, `security_log`…) se consultent et se modifient. Exemple :

  ```sql
  SELECT id, email, name, role, points, created_at, terms_accepted_at FROM users ORDER BY id DESC;
  ```

- **Mot de passe oublié** : sans service d'e-mail, le membre contacte l'administrateur, qui clique sur **Réinitialiser le mot de passe** dans la liste des membres du Centre DevOps. Un mot de passe temporaire s'affiche une seule fois (les sessions du membre sont fermées) ; il suffit de le lui transmettre. Les comptes administrateurs se réinitialisent depuis votre PC : `DATABASE_URL` dans `.env.local` puis `npm run admin:reset-password -- <e-mail>`. L'envoi automatique par e-mail est optionnel (variables `BREVO_API_KEY` ou `RESEND_API_KEY`, `MAIL_FROM`, `PUBLIC_URL`).

Les mots de passe sont hachés (scrypt) : personne ne peut les lire, administrateur compris.

## 5. Ce qu'il faut savoir sur l'offre gratuite

- **Mise en veille** : Render endort le site après 15 minutes sans visite. Le premier visiteur attend environ une minute. Neon se réveille aussi (quelques centaines de ms). Les comptes et sessions restent intacts.
- **Salles de quiz multijoueur** : leur état est en mémoire ; une mise en veille ou un redéploiement interrompt les parties en cours.
- **Quotas** : Render gratuit ≈ 750 h par mois pour un service ; Neon gratuit ≈ 0,5 Go de données. Largement suffisant pour démarrer.
- **Sauvegardes** : Neon conserve un historique permettant de **restaurer la base à un instant passé** (durée limitée sur l'offre gratuite, voir la console). Téléchargez aussi régulièrement la sauvegarde JSON depuis le Centre DevOps (elle contient des données personnelles : stockage sûr, hors Git).
- **Mises à jour** : pousser sur la branche déployée suffit, Render reconstruit. Les migrations de base s'appliquent automatiquement au démarrage.

## 6. En local

Sans `DATABASE_URL`, `npm run dev` et `npm start` utilisent une base PostgreSQL embarquée (PGlite) dans `data/pglite` : aucune installation nécessaire. Pour tester avec Neon en local, mettre `DATABASE_URL` dans `.env.local`.

## 7. Conditions d'utilisation

Le texte est dans `features/Legal/termsContent.ts`. Si vous changez le fond du texte, mettez à jour `TERMS_VERSION` dans `server/api.mjs` pour que la version acceptée soit tracée par compte.
