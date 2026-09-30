#!/usr/bin/env bash
# Déploiement : API + site sur Cloud Run (service « cybersens »), servi par Firebase Hosting (https://<projet>.web.app).
# Prérequis (une seule fois) : gcloud et firebase-tools installés, `gcloud auth login`, `firebase login`,
# facturation activée sur le projet (plan Blaze). Usage : scripts/deploy-firebase.sh <id-du-projet> [région]
set -euo pipefail

PROJECT="${1:?Usage: scripts/deploy-firebase.sh <id-du-projet> [région]}"
REGION="${2:-europe-west1}"

: "${GEMINI_API_KEY:?Définir GEMINI_API_KEY dans l'environnement (jamais dans le dépôt)}"
: "${ADMIN_EMAILS:=}"

# Le secret des certificats est généré une fois puis conservé dans Secret Manager
if ! gcloud secrets describe cybersens-cert-secret --project "$PROJECT" >/dev/null 2>&1; then
  openssl rand -hex 32 | gcloud secrets create cybersens-cert-secret --data-file=- --project "$PROJECT"
fi
printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add cybersens-gemini-key --data-file=- --project "$PROJECT" 2>/dev/null \
  || printf '%s' "$GEMINI_API_KEY" | gcloud secrets create cybersens-gemini-key --data-file=- --project "$PROJECT"

# Une seule instance : SQLite et les salles du quiz multijoueur vivent en mémoire / sur le disque de l'instance
gcloud run deploy cybersens \
  --project "$PROJECT" --region "$REGION" --source . \
  --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --memory 512Mi \
  --timeout 3600 \
  --set-env-vars "TRUST_PROXY=1,SESSION_COOKIE_NAME=__session,ADMIN_EMAILS=${ADMIN_EMAILS},PUBLIC_URL=https://${PROJECT}.web.app" \
  --set-secrets "GEMINI_API_KEY=cybersens-gemini-key:latest,CERT_SECRET=cybersens-cert-secret:latest"

firebase deploy --only hosting --project "$PROJECT"
echo "Site : https://${PROJECT}.web.app"
