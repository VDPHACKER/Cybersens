# Checklist de préparation au déploiement

## 1. Variables d’environnement

- [ ] Renseigner `GEMINI_API_KEY` pour l’assistant IA.
- [ ] Définir `CERT_SECRET` avec une valeur unique et stable par environnement.
- [ ] Mettre `TRUST_PROXY=1` derrière un reverse proxy HTTPS.
- [ ] Vérifier `PORT` et `HOST` pour l’environnement cible.
- [ ] Vérifier `DB_PATH` si la base est déplacée hors du chemin par défaut.
- [ ] Vérifier qu’aucune clé réelle n’est présente dans le dépôt ou dans les artefacts buildés.

## 2. HTTPS et domaine

- [ ] Obtenir un domaine public.
- [ ] Configurer le TLS côté reverse proxy (Caddy, Nginx, Traefik, Railway, etc.).
- [ ] Vérifier que les requêtes arrivent en HTTPS.
- [ ] Vérifier les en-têtes HSTS et les cookies sécurisés.
- [ ] Vérifier que `Origin` et `Host` correspondent bien après proxy.

## 3. Sécurité applicative

- [ ] Vérifier la CSP et les en-têtes HTTP dans le serveur de production.
- [ ] Vérifier la protection CSRF avec `trustProxy` activé.
- [ ] Vérifier que main routes API nécessitent une session ou un niveau d’accès adapté.
- [ ] Vérifier la limitation de débit sur login, quiz et IA.
- [ ] Vérifier les règles de validation sur les entrées utilisateur.
- [ ] Vérifier que le stockage des données sensibles ne fuit pas dans les réponses d’API.

## 4. Base de données et sauvegarde

- [ ] Déployer avec un volume persistant pour `/app/data`.
- [ ] Vérifier que la base SQLite est bien sauvée entre redémarrages.
- [ ] Tester la sauvegarde : `npm run db:backup` ou `docker compose exec app node server/backup.mjs`.
- [ ] Tester une restauration sur un environnement de test.
- [ ] Vérifier le quota disque et le maintien de la base au fil du temps.

## 5. Santé et supervision

- [ ] Vérifier que `/api/health` répond correctement.
- [ ] Vérifier le healthcheck Docker et le monitoring Railway.
- [ ] Vérifier les logs JSON de requêtes et le niveau d’erreurs.
- [ ] Configurer des alertes sur 5xx, indisponibilité et saturation disque.
- [ ] Vérifier l’absence de fuite de données dans les logs.

## 6. CI/CD et qualité

- [ ] Vérifier que les tests passent sur la branche de déploiement.
- [ ] Vérifier que le build production passe.
- [ ] Vérifier le lint, le typecheck et le formatage.
- [ ] Vérifier l’audit npm et l’analyse de vulnérabilités docker.
- [ ] Bloquer le déploiement si un test ou un build échoue.

## 7. Smoke test de production

Avant la mise en ligne, tester manuellement :

- [ ] inscription
- [ ] connexion
- [ ] ouverture d’un cours
- [ ] progression enregistrée
- [ ] quiz validé
- [ ] examen réussi avec certificat
- [ ] vérification d’un certificat
- [ ] assistant IA connecté
- [ ] service worker / application installable en production

## 8. Validation finale

- [ ] La santé est verte.
- [ ] Le site est accessible via HTTPS.
- [ ] Les logs et la sécurité sont conformes.
- [ ] Les données sont bien sauvegardées.
- [ ] L’UX est validée par un test utilisateur réel.
- [ ] Le déploiement peut être lancé sans risque majeur.
