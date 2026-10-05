# Avis sur l'accueil et notifications en temps réel — Spec

Date : 2026-10-05 · Branche : `feature/deploiement-firebase`

## Objectif

1. Afficher sur l'onglet **Accueil** de la page publique des avis laissés par de vrais utilisateurs inscrits.
2. Notifier instantanément les utilisateurs connectés quand quelqu'un publie dans la **Communauté** ou quand une **nouvelle actualité** apparaît.

Hors périmètre : notifications push application fermée, notifications de commentaires/likes, modération automatique, page ou onglet « Avis » dédié.

## 1. Avis

### Données

Nouvelle migration (ne pas modifier les migrations existantes de `server/db.mjs`) :

```sql
CREATE TABLE reviews (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW),
  updated_at TEXT NOT NULL DEFAULT (NOW)
);
```

Un seul avis par compte (UNIQUE sur `user_id`), modifiable.

### API (`server/api.mjs`)

- `GET /api/reviews` — public, `rateLimit` par IP. Renvoie `{ average, count, reviews[6 derniers] }`; chaque avis : `{ id, rating, body, author (publicName), authorLevel, createdAt }`.
- `GET /api/reviews/mine` — connecté. Renvoie l'avis de l'utilisateur ou `null`.
- `PUT /api/reviews` — connecté, `rateLimit`. Crée ou met à jour (upsert) son avis. Validation : `rating` entier 1–5, `body` 10–500 caractères, texte brut.
- `DELETE /api/reviews` — connecté : supprime son avis. Admin (`isAdmin`) : peut supprimer un avis par `?id=`.

### Interface

- `features/Reviews.tsx` : section « Ce que disent nos utilisateurs » (moyenne + étoiles + nombre d'avis, grille des 6 derniers). Insérée dans la vue Accueil de `features/Landing.tsx`, entre les fonctionnalités et le bandeau d'appel à l'action. **Masquée s'il n'y a aucun avis** ; aucun témoignage inventé.
- Texte rendu comme texte React (échappé), jamais en HTML.
- Formulaire d'écriture, de modification et de suppression de son avis : dans **Profil** (`features/Profile.tsx`).
- Textes en FR / EN / ES (`useL`).
- Client API : `services/reviewsApi.ts`.

## 2. Notifications temps réel

### Serveur — `server/liveFeed.mjs` (nouveau)

- `GET /api/live/stream` : flux SSE, connecté uniquement (`requireUser`, `rateLimit`). Même mécanique que `server/rooms.mjs` : en-têtes `text/event-stream`, `retry: 2000`, ping `: ping` toutes les 20 s, nettoyage à la fermeture.
- Registre des connexions par utilisateur, **maximum 3** par utilisateur (la plus ancienne est fermée au-delà).
- `publish(event, data, { exceptUserId })` diffuse à toutes les connexions.
- Événements :
  - `community_post` `{ id, topic, author, excerpt(80) }` — publié par `POST /api/community/posts` après l'INSERT, à tous sauf l'auteur.
  - `news` `{ count, items[≤3: id, title, source] }` — `server/news.mjs` compare les `id` avant/après chaque rafraîchissement du cache. Premier remplissage du cache au démarrage : **aucune notification**. Plus de 3 nouveaux articles : un seul événement avec `count`.

### Client

- Hook `useLiveFeed` (`services/liveFeed.ts`) utilisé dans `components/Layout.tsx`, actif seulement si connecté (`EventSource`, reconnexion native).
- Chaque événement déclenche le toast existant `cyber-notify`, avec action « ouvrir » vers Communauté ou Actualités. Textes FR / EN / ES.
- Sur l'onglet Communauté, un `community_post` recharge le fil.
- Réglage `settings.liveNotifications` (défaut : activé), modifiable dans Profil comme `showInLeaderboard`. Désactivé : le flux n'est pas ouvert.

## Sécurité

- Avis et flux réservés aux comptes pour l'écriture/le flux ; lecture publique des avis limitée par IP.
- Entrées validées côté serveur (types, bornes), aucun HTML interprété.
- Le flux SSE ne transporte que des données déjà publiques (nom abrégé, extrait, titre d'article) ; le nom de l'auteur passe par `publicName`.
- Limites : connexions par utilisateur, débit d'écriture des avis, plafond de 3 articles par événement.

## Tests

- Serveur : validation des avis (bornes, upsert, un par compte, suppression par admin) ; `publish` exclut l'auteur ; limite de 3 connexions ; détection des nouveaux articles sans rafale au démarrage.
- Interface : `Reviews` masquée sans avis, rendu avec avis ; toasts reçus sur événement.
- Lint, build, puis scan HawkScan après implémentation.
