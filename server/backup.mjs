// Sauvegarde cohérente de la base (possible pendant que le serveur tourne) : npm run db:backup
// Les sauvegardes sont écrites dans backups/ (dossier exclu de Git). Pensez à les copier hors du serveur.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupTo, DB_PATH } from './db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const destination = path.join(
  process.env.BACKUP_DIR || path.join(ROOT, 'backups'),
  `cybersens-${stamp}.db`,
);

backupTo(destination);
console.log(`Sauvegarde de ${DB_PATH} créée : ${destination}`);
