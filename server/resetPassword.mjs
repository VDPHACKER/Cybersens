// Réinitialise le mot de passe d'un compte : node server/resetPassword.mjs <e-mail>
// Docker : docker compose exec app node server/resetPassword.mjs <e-mail>
import { resetUserPassword } from './accountTools.mjs';
import { closeDb } from './db.mjs';

const email = process.argv[2];
if (!email) {
  console.error('Usage : node server/resetPassword.mjs <e-mail>');
  process.exit(1);
}

const temporary = await resetUserPassword(email);
await closeDb();
if (!temporary) {
  console.error(`Aucun compte pour « ${email} ».`);
  process.exit(1);
}
console.log(`Mot de passe temporaire pour ${email} : ${temporary}`);
console.log(
  'Toutes les sessions du compte ont été fermées. Transmettez ce mot de passe par un canal sûr,',
);
console.log(
  'puis demandez à la personne de le changer dès la connexion (Profil > Changer mon mot de passe).',
);
