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
console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(plain)}`);
