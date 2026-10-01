// Génère l'empreinte du mot de passe administrateur : node server/hashAdminPassword.mjs "<mot de passe>"
// Copier la ligne affichée dans la variable d'environnement ADMIN_PASSWORD_HASH du serveur (jamais le mot de passe lui-même).
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
