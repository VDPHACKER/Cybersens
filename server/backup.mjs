// Sauvegarde des données au format JSON (possible pendant que le serveur tourne) : npm run db:backup
// Les sauvegardes sont écrites dans backups/ (dossier exclu de Git) et contiennent les empreintes de mots de passe :
// à conserver comme un secret, hors du serveur. Avec Neon, la restauration à un instant donné est aussi disponible dans la console.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupTo, closeDb, DB_LABEL } from './db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destination = path.join(
  process.env.BACKUP_DIR || path.join(ROOT, 'backups'),
  `cybersens-${stamp}.json`,
);

await backupTo(destination);
await closeDb();
console.log(`Sauvegarde de ${DB_LABEL} créée : ${destination}`);
