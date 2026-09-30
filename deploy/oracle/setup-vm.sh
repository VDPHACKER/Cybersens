#!/usr/bin/env bash
# Prépare une VM Ubuntu (Oracle Cloud Always Free) : Docker, pare-feu, sauvegardes quotidiennes.
# Usage (sur la VM, depuis la racine du dépôt cloné) : sudo bash deploy/oracle/setup-vm.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Lancez ce script avec sudo." >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_USER="${SUDO_USER:-ubuntu}"

echo "==> Installation de Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$RUN_USER"

echo "==> Pare-feu : ouverture des ports 80 et 443 (les images Ubuntu d'Oracle bloquent tout par défaut)"
if ! iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null; then
  # Insérer avant la règle REJECT par défaut (position 5 dans les images Oracle, sinon en tête)
  iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  apt-get install -y iptables-persistent >/dev/null
  netfilter-persistent save
fi

echo "==> Dossier des sauvegardes (propriété de l'utilisateur « node » du conteneur, uid 1000)"
mkdir -p "$REPO_DIR/backups"
chown 1000:1000 "$REPO_DIR/backups"

echo "==> Sauvegarde quotidienne à 03:15 (30 dernières conservées)"
CRON_FILE=/etc/cron.d/cybersens-backup
cat > "$CRON_FILE" <<EOF
15 3 * * * root docker exec cybersens node server/backup.mjs >> /var/log/cybersens-backup.log 2>&1 && find $REPO_DIR/backups -name 'cybersens-*.db' -mtime +30 -delete
EOF
chmod 644 "$CRON_FILE"

echo
echo "Terminé. Étapes suivantes :"
echo "  1. Reconnectez-vous en SSH (pour activer le groupe docker)."
echo "  2. cp .env.example .env  puis renseignez les variables (voir docs/DEPLOIEMENT-ORACLE.md)."
echo "  3. docker compose -f deploy/oracle/docker-compose.yml --env-file .env up -d --build"
