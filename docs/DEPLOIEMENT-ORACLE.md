# Déploiement gratuit sur Oracle Cloud (Always Free)

Hébergement gratuit à vie avec **disque persistant** : site, API et base SQLite tournent sur une seule VM. Les comptes et les données survivent aux redémarrages et aux mises à jour.

> Oracle demande une carte bancaire pour vérifier l'identité. Aucun débit tant que vous restez sur les ressources « Always Free » (badge vert) et ne passez pas le compte en « Pay As You Go ».

## 1. Créer la VM

1. Créer un compte sur <https://www.oracle.com/cloud/free/> (choisir la région d'origine avec soin : elle ne peut plus changer).
2. Console → **Compute → Instances → Create instance**.
   - Image : **Ubuntu 24.04** (ou 22.04).
   - Shape : **VM.Standard.A1.Flex** (ARM, Always Free), 1 OCPU et 6 Go suffisent. Si « Out of capacity », réessayer plus tard ou prendre **VM.Standard.E2.1.Micro** (x86, 1 Go : suffisant pour cette app).
   - Réseau : laisser l'adresse IP publique attribuée.
   - Clés SSH : **Generate a key pair** et télécharger la clé privée (`.key`). La garder précieusement.
3. Une fois l'instance « Running », noter son **adresse IP publique**.

## 2. Ouvrir les ports 80 et 443 côté Oracle

Console → Instance → **Subnet** → **Security List** par défaut → **Add Ingress Rules** :

| Source CIDR | Protocole | Port de destination |
| ----------- | --------- | ------------------- |
| `0.0.0.0/0` | TCP       | `80`                |
| `0.0.0.0/0` | TCP       | `443`               |

(Le pare-feu de la VM elle-même est réglé par le script de l'étape 3.)

## 3. Préparer la VM

Depuis votre PC (adapter le chemin de la clé et l'IP) :

```bash
ssh -i chemin/vers/ssh-key.key ubuntu@<IP_PUBLIQUE>
```

Sur la VM :

```bash
git clone https://github.com/<votre-compte>/<votre-depot>.git cybersens
cd cybersens
git checkout <branche-a-deployer>
sudo bash deploy/oracle/setup-vm.sh
exit        # puis se reconnecter en SSH pour activer le groupe docker
```

Le script installe Docker, ouvre les ports 80/443 dans le pare-feu de la VM, crée le dossier `backups/` et planifie une **sauvegarde quotidienne à 03:15** (30 jours conservés).

## 4. Nom de domaine et HTTPS

HTTPS est obligatoire (cookies de session `Secure`). Deux options gratuites :

- **Sans rien acheter** : utiliser `<ip-avec-tirets>.sslip.io`. Pour l'IP `141.144.1.2` → `141-144-1-2.sslip.io`.
- **Votre propre domaine** : créer un enregistrement DNS `A` vers l'IP (DuckDNS offre des sous-domaines gratuits).

Caddy obtient et renouvelle le certificat Let's Encrypt tout seul.

## 5. Configurer et lancer

```bash
cd ~/cybersens
cp .env.example .env
nano .env
```

Renseigner au minimum :

```
DOMAIN=141-144-1-2.sslip.io
GEMINI_API_KEY=...                      # assistant IA
CERT_SECRET=...                         # openssl rand -hex 32 (ne jamais changer ensuite)
ADMIN_EMAILS=votre-email@exemple.com    # comptes administrateurs (voir § 6)
CONTACT_EMAIL=contact@exemple.com       # affiché dans les conditions d'utilisation
```

Lancer :

```bash
docker compose -f deploy/oracle/docker-compose.yml --env-file .env up -d --build
docker compose -f deploy/oracle/docker-compose.yml --env-file .env ps
curl https://141-144-1-2.sslip.io/api/health     # {"status":"ok","database":"ok",...}
```

## 6. Voir les utilisateurs et les données

1. Ouvrir le site, **s'inscrire** avec l'e-mail listé dans `ADMIN_EMAILS`.
2. Le **Centre DevOps** apparaît dans le menu : il affiche le nombre d'inscrits, la **liste des membres** (nom, e-mail, profil, points, leçons, certificats, dates d'inscription et de dernière connexion, date d'acceptation des conditions), avec recherche et **export CSV**.
3. Accès direct à la base (lecture) depuis la VM :

```bash
docker exec -it cybersens node -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('/app/data/cybersens.db',{readOnly:true});
console.table(db.prepare('SELECT id,email,name,role,points,created_at,terms_accepted_at FROM users').all());
"
```

Les mots de passe sont hachés (scrypt) : personne, administrateur compris, ne peut les lire.

## 7. Mettre à jour le site

```bash
cd ~/cybersens && git pull
docker compose -f deploy/oracle/docker-compose.yml --env-file .env up -d --build
```

Les migrations de base s'appliquent automatiquement au démarrage.

## 8. Sauvegardes (à ne pas négliger)

- Automatique : `~/cybersens/backups/cybersens-*.db` chaque nuit.
- **Copiez-les hors de la VM** (une VM Always Free peut être récupérée par Oracle en cas d'inactivité prolongée) :

```bash
scp -i chemin/vers/ssh-key.key "ubuntu@<IP>:cybersens/backups/cybersens-*.db" ./sauvegardes/
```

- Restauration : `docker compose ... stop app`, remplacer la base dans le volume (voir `docs/DEPLOIEMENT.md` § 6), `docker compose ... start app`.

## 9. Bon à savoir

- Oracle peut **arrêter les instances Always Free inactives** (faible utilisation CPU/réseau/mémoire pendant 7 jours). Un site visité régulièrement n'est pas concerné ; gardez de toute façon des sauvegardes hors VM.
- Une seule instance de l'application (SQLite) : ne pas la répliquer.
- Les conditions d'utilisation sont dans `features/Legal/termsContent.ts`. Si vous changez le fond du texte, mettez à jour `TERMS_VERSION` dans `server/api.mjs` pour que la version acceptée soit tracée par compte.
