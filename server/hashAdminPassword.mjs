// Outil réservé à ceux qui préfèrent configurer le mot de passe administrateur par variable d'environnement
// plutôt que depuis le Centre DevOps (méthode recommandée : bouton « Définir » à la première ouverture).
// Usage : node server/hashAdminPassword.mjs "<mot de passe>", puis copier la ligne dans ADMIN_PASSWORD_HASH.
import { hashPassword } from './passwords.mjs';

const plain = process.argv[2];
if (!plain || plain.length < 12) {
  console.error(
    'Usage : node server/hashAdminPassword.mjs "<mot de passe de 12 caractères minimum>"',
  );
  process.exit(1);
}
const hash = await hashPassword(plain);
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
// Même empreinte avec « : » à la place de « $ » : à utiliser si l'hébergeur supprime les « $ » de la valeur
console.log(`ADMIN_PASSWORD_HASH (sans $)=${hash.replaceAll('$', ':')}`);
