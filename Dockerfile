# syntax=docker/dockerfile:1

# ---------- Étape 1 : compilation du front (Vite) ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run typecheck && npm run build

# ---------- Étape 2 : dépendances d'exécution uniquement (pg, PGlite) ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

# ---------- Étape 3 : image d'exécution minimale ----------
# Base de données : PostgreSQL via DATABASE_URL (recommandé), sinon PGlite dans le volume /app/data.
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DB_PATH=/app/data/pglite \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
# Données des cours : utilisées par le serveur pour valider la progression et corriger les examens
COPY --from=build /app/services/coursesData.ts /app/services/advancedCoursesData.ts ./services/

# Exécution sans privilèges (utilisateur « node » fourni par l'image officielle)
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node

EXPOSE 8080
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server/index.mjs"]
