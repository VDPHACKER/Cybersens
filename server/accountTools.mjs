// Outils d'exploitation des comptes (sans envoi d'e-mail : la récupération passe par l'exploitant).
import crypto from 'node:crypto';
import { db } from './db.mjs';
import { hashPassword } from './passwords.mjs';

// Alphabet sans caractères ambigus (0/O, 1/l/I) pour faciliter la communication du mot de passe
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export const generateTemporaryPassword = (length = 16) =>
  Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');

/**
 * Remplace le mot de passe d'un compte par un mot de passe temporaire, ferme toutes ses sessions
 * et lève le verrouillage. Retourne le mot de passe temporaire, ou null si le compte n'existe pas.
 */
export const resetUserPassword = async (emailInput) => {
  const email = String(emailInput || '')
    .trim()
    .toLowerCase();
  const user = await db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (!user) return null;
  const temporary = generateTemporaryPassword();
  const hash = await hashPassword(temporary);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  await db.prepare('DELETE FROM login_attempts WHERE key = ?').run(`login:${email}`);
  await db
    .prepare('INSERT INTO security_log (user_id, event, ip) VALUES (?, ?, ?)')
    .run(user.id, 'password_reset_by_operator', 'cli');
  return temporary;
};
