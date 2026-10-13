// Déchiffre une sauvegarde : BACKUP_ENCRYPTION_KEY=… npm run db:backup-decrypt -- backups/cybersens-….json.enc > sauvegarde.json
import fs from 'node:fs';
import { backupKey, decryptBackup } from './backupCrypto.mjs';

const file = process.argv[2];
const key = backupKey();
if (!file || !key) {
  console.error(
    'Usage : BACKUP_ENCRYPTION_KEY=… npm run db:backup-decrypt -- <fichier.json.enc> > sauvegarde.json',
  );
  process.exit(1);
}
try {
  process.stdout.write(decryptBackup(fs.readFileSync(file), key));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
