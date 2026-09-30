// Hachage et vérification des mots de passe (scrypt). Partagé par l'API et les outils d'exploitation.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
export const SCRYPT = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }; // paramètres recommandés par l'OWASP

export const hashPassword = async (plain) => {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(plain, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`;
};

export const verifyPassword = async (plain, stored) => {
  const [algo, N, r, p, saltHex, keyHex] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scrypt(plain, Buffer.from(saltHex, 'hex'), expected.length, {
    N: +N,
    r: +r,
    p: +p,
    maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(key, expected);
};
