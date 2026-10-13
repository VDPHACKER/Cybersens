// Chiffrement des sauvegardes sur disque (AES-256-GCM, clé dérivée par scrypt).
// Format : "CSB1" | sel (16) | IV (12) | étiquette d'authentification (16) | données chiffrées.
// La clé vient de BACKUP_ENCRYPTION_KEY ; sans elle, les sauvegardes restent en clair (droits 0600).
import crypto from 'node:crypto';

const MAGIC = Buffer.from('CSB1');
const MIN_KEY_LENGTH = 16;

/** Clé de chiffrement configurée, ou null. Une clé trop courte est refusée : mieux vaut échouer que mal protéger. */
export const backupKey = (env = process.env) => {
  const key = env.BACKUP_ENCRYPTION_KEY;
  if (!key) return null;
  if (key.length < MIN_KEY_LENGTH)
    throw new Error(`BACKUP_ENCRYPTION_KEY doit contenir au moins ${MIN_KEY_LENGTH} caractères.`);
  return key;
};

const derive = (secret, salt) => crypto.scryptSync(secret, salt, 32);

export const encryptBackup = (plaintext, secret) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derive(secret, salt), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
};

export const decryptBackup = (blob, secret) => {
  if (blob.length < MAGIC.length + 44 || !blob.subarray(0, MAGIC.length).equals(MAGIC))
    throw new Error('Format de sauvegarde chiffrée non reconnu.');
  const salt = blob.subarray(4, 20);
  const iv = blob.subarray(20, 32);
  const tag = blob.subarray(32, 48);
  const decipher = crypto.createDecipheriv('aes-256-gcm', derive(secret, salt), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(blob.subarray(48)), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Déchiffrement impossible : clé incorrecte ou fichier modifié.');
  }
};
