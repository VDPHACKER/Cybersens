// Chiffrement des sauvegardes sur disque : elles contiennent les empreintes de mots de passe de tous les membres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encryptBackup, decryptBackup, backupKey } from '../server/backupCrypto.mjs';

const KEY = 'cle-de-sauvegarde-tres-longue-et-secrete-2026';
const SAMPLE = JSON.stringify({
  tables: { users: [{ email: 'a@test.bf', password_hash: 'scrypt$x' }] },
});

test('chiffrement : aller-retour fidèle et rien de lisible dans le fichier', () => {
  const blob = encryptBackup(SAMPLE, KEY);
  assert.ok(Buffer.isBuffer(blob));
  assert.doesNotMatch(blob.toString('latin1'), /a@test\.bf|password_hash|scrypt/);
  assert.equal(decryptBackup(blob, KEY), SAMPLE);
});

test('deux chiffrements du même contenu diffèrent (sel et IV aléatoires)', () => {
  assert.notDeepEqual(encryptBackup(SAMPLE, KEY), encryptBackup(SAMPLE, KEY));
});

test('mauvaise clé ou fichier modifié : refus net, jamais de contenu partiel', () => {
  const blob = encryptBackup(SAMPLE, KEY);
  assert.throws(() => decryptBackup(blob, KEY + 'x'), /clé|modifié/i);
  const tampered = Buffer.from(blob);
  tampered[tampered.length - 1] ^= 0xff;
  assert.throws(() => decryptBackup(tampered, KEY), /clé|modifié/i);
  assert.throws(() => decryptBackup(Buffer.from('pas une sauvegarde'), KEY), /format/i);
});

test('clé de chiffrement : trop courte refusée, absente = pas de chiffrement', () => {
  assert.equal(backupKey({}), null);
  assert.equal(backupKey({ BACKUP_ENCRYPTION_KEY: '' }), null);
  assert.throws(() => backupKey({ BACKUP_ENCRYPTION_KEY: 'courte' }), /16 caractères/);
  assert.equal(backupKey({ BACKUP_ENCRYPTION_KEY: KEY }), KEY);
});

test('backupTo : écrit un fichier chiffré (.enc) quand la clé est définie, sinon du JSON clair', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-bkp-'));
  process.env.DB_PATH = path.join(dir, 'pglite');
  const { backupTo, closeDb } = await import('../server/db.mjs');
  try {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    const plain = await backupTo(path.join(dir, 'b1.json'));
    assert.equal(plain, path.join(dir, 'b1.json'));
    assert.ok(JSON.parse(fs.readFileSync(plain, 'utf8')).tables);

    process.env.BACKUP_ENCRYPTION_KEY = KEY;
    const enc = await backupTo(path.join(dir, 'b2.json'));
    assert.equal(enc, path.join(dir, 'b2.json.enc'));
    assert.ok(!fs.existsSync(path.join(dir, 'b2.json')), 'aucun clair laissé sur le disque');
    assert.ok(JSON.parse(decryptBackup(fs.readFileSync(enc), KEY)).tables);
  } finally {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    await closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
