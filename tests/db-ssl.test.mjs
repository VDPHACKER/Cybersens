// Connexion TLS à la base : certificat d'autorité personnalisé (ex. Supabase), jamais de vérification désactivée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadCa, pgConnectionConfig } from '../server/dbSsl.mjs';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----\n';
const URL_PLAIN =
  'postgresql://postgres.abc:secret@aws-0-eu-west-2.pooler.supabase.com:5432/postgres';

test('sans certificat : adresse inchangée, aucun réglage TLS ajouté', () => {
  assert.equal(loadCa({}), null);
  assert.deepEqual(pgConnectionConfig(URL_PLAIN, null), { connectionString: URL_PLAIN });
});

test('certificat en fichier : lu, TLS activé avec ce certificat et vérification conservée', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-ca-'));
  const file = path.join(dir, 'ca.crt');
  fs.writeFileSync(file, PEM);
  try {
    const ca = loadCa({ DATABASE_CA_CERT_FILE: file });
    assert.equal(ca, PEM);
    const cfg = pgConnectionConfig(URL_PLAIN, ca);
    assert.equal(cfg.ssl.ca, PEM);
    assert.notEqual(
      cfg.ssl.rejectUnauthorized,
      false,
      'la vérification du certificat n’est jamais désactivée',
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('certificat en variable (retours à la ligne écrits « \\n ») : accepté', () => {
  const ca = loadCa({ DATABASE_CA_CERT: PEM.replaceAll('\n', '\\n') });
  assert.equal(ca, PEM);
});

test('un sslmode dans l’adresse ne doit pas écraser le certificat fourni', () => {
  const cfg = pgConnectionConfig(`${URL_PLAIN}?sslmode=require&application_name=cybersens`, PEM);
  assert.ok(!/sslmode/.test(cfg.connectionString), cfg.connectionString);
  assert.match(cfg.connectionString, /application_name=cybersens/, 'les autres paramètres restent');
  assert.equal(cfg.ssl.ca, PEM);
});

test('le mot de passe et l’hôte de l’adresse sont conservés tels quels', () => {
  const cfg = pgConnectionConfig(URL_PLAIN, PEM);
  const u = new URL(cfg.connectionString);
  assert.equal(u.host, 'aws-0-eu-west-2.pooler.supabase.com:5432');
  assert.equal(decodeURIComponent(u.password), 'secret');
});

test('fichier de certificat introuvable ou invalide : erreur claire, sans repli silencieux', () => {
  assert.throws(
    () => loadCa({ DATABASE_CA_CERT_FILE: path.join(os.tmpdir(), 'nexiste-pas.crt') }),
    /introuvable|illisible/i,
  );
  assert.throws(() => loadCa({ DATABASE_CA_CERT: 'pas un certificat' }), /certificat/i);
});

test('préfixe : les variables SOURCE_ / TARGET_ servent à la migration entre deux bases', () => {
  assert.equal(loadCa({ TARGET_DATABASE_CA_CERT: PEM }, 'TARGET_DATABASE'), PEM);
  assert.equal(loadCa({ TARGET_DATABASE_CA_CERT: PEM }, 'SOURCE_DATABASE'), null);
});
