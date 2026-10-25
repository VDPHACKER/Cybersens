# Migrer la base de données (Neon → Supabase, ou toute autre base PostgreSQL)

La commande `npm run db:migrate-data` copie **toutes** les données d'une base PostgreSQL vers une autre.

Garanties :

- **La source n'est jamais modifiée ni supprimée.** Elle est lue dans une transaction en lecture seule.
- **La cible doit être vide.** Si elle contient déjà des données, la copie est refusée et rien n'est écrasé.
- **Tout ou rien.** La copie se fait dans une seule transaction, annulée en cas d'erreur ou d'écart de comptage.
- Les identifiants sont conservés et les séquences repartent après le plus grand : aucun doublon au prochain inscrit.

## 1. Préparer la nouvelle base

Créez une base PostgreSQL **vide** (par exemple un projet Supabase) et récupérez son adresse de connexion :

- **Supabase** : _Project Settings → Database → Connection string_. Prenez la connexion **directe** ou le **« Session pooler »** (port 5432). Évitez le mode « Transaction pooler » (port 6543).
- **Mot de passe** : si l'adresse contient `[YOUR-PASSWORD]`, remplacez-le par le mot de passe de la base (les caractères spéciaux doivent être encodés dans l'URL).

## 2. Récupérer l'adresse de la base actuelle (Neon)

Dans la console Neon : _Connection Details_, adresse **directe** (sans `-pooler` dans le nom d'hôte).

> Si votre quota Neon est dépassé, la base est suspendue et la connexion échouera. Attendez le renouvellement du quota ou
> repassez temporairement sur une offre payante : **les données ne sont pas supprimées par la pause**.

## 3. Vérifier d'abord (lecture seule, rien n'est écrit)

```bash
SOURCE_DATABASE_URL='postgresql://…neon…' \
TARGET_DATABASE_URL='postgresql://…supabase…' \
npm run db:migrate-data -- --check
```

Vous obtenez le nombre de lignes par table dans chaque base. La cible doit être vide ou sans table.

## 4. Copier

```bash
SOURCE_DATABASE_URL='postgresql://…neon…' \
TARGET_DATABASE_URL='postgresql://…supabase…' \
npm run db:migrate-data
```

La commande crée le schéma de l'application dans la cible, copie les données, compare les comptages et affiche le total.
En cas d'échec, la cible est laissée vide et la source n'a pas été touchée : vous pouvez corriger puis relancer.

## 5. Contrôler puis basculer

1. Relancez la commande `--check` et comparez les nombres de lignes des deux bases (`users`, `certificates`, `posts`, `quiz_results`).
2. Sur l'hébergeur, remplacez `DATABASE_URL` par l'adresse de la **cible** et **gardez le même `CERT_SECRET`** : sinon les certificats déjà délivrés ne seront plus reconnus comme valides.
3. Redéployez et vérifiez : connexion avec un compte existant, certificats, classement.
4. **Conservez l'ancienne base quelques jours** avant de la supprimer, comme filet de sécurité.

## Précautions

- Les adresses de connexion contiennent des mots de passe : ne les écrivez dans aucun fichier du dépôt et ne les partagez pas. Les variables ci-dessus n'existent que le temps de la commande.
- La commande n'affiche jamais le mot de passe, seulement le nom d'hôte.
- Les sessions ouvertes sont copiées : les membres restent connectés après la bascule.
