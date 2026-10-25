// Connexion TLS à PostgreSQL avec un certificat d'autorité personnalisé (ex. Supabase, dont les serveurs sont signés
// par une autorité propre que Node ne connaît pas). La vérification du certificat reste TOUJOURS active : on ajoute
// une autorité de confiance, on ne désactive jamais le contrôle.
//
//   DATABASE_CA_CERT_FILE=server/certs/supabase-prod-ca-2021.crt   (chemin, relatif à la racine du projet)
//   DATABASE_CA_CERT="-----BEGIN CERTIFICATE-----\n…"               (ou le contenu PEM, « \n » acceptés)
//
// Pour la migration entre deux bases : SOURCE_DATABASE_CA_CERT[_FILE] et TARGET_DATABASE_CA_CERT[_FILE].
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PEM_CERT = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;

/** Certificat d'autorité configuré (texte PEM), ou null. Une configuration invalide lève une erreur claire. */
export const loadCa = (env = process.env, prefix = 'DATABASE') => {
  const file = env[`${prefix}_CA_CERT_FILE`];
  const inline = env[`${prefix}_CA_CERT`];
  let pem;
  if (file) {
    try {
      pem = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
    } catch {
      throw new Error(`Certificat de la base introuvable ou illisible : ${file}`);
    }
  } else if (inline) {
    pem = inline.replaceAll('\\n', '\n');
  } else {
    return null;
  }
  if (!PEM_CERT.test(pem))
    throw new Error(`${prefix}_CA_CERT : ce n'est pas un certificat au format PEM.`);
  return pem;
};

/**
 * Réglages du pilote `pg`. Avec un certificat, TLS est activé et vérifié avec lui ; un `sslmode` présent dans l'adresse
 * est retiré, car il prendrait le pas sur ces réglages et ferait échouer la vérification.
 */
export const pgConnectionConfig = (connectionString, ca) => {
  if (!ca) return { connectionString };
  const url = new URL(connectionString);
  for (const param of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'])
    url.searchParams.delete(param);
  return { connectionString: url.toString(), ssl: { ca } };
};
