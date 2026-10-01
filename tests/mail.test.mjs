// Envoi d'e-mails : choix du fournisseur et charge utile (aucun appel réseau réel).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { mailConfigured, parseSender, sendMail } = await import('../server/mail.mjs');

const withEnv = async (env, fn) => {
  const keys = ['BREVO_API_KEY', 'RESEND_API_KEY', 'MAIL_FROM', 'PUBLIC_URL'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  try {
    return await fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
};

test('expéditeur : « Nom <adresse> » ou adresse seule', () => {
  assert.deepEqual(parseSender('CyberSens <no-reply@exemple.com>'), {
    name: 'CyberSens',
    email: 'no-reply@exemple.com',
  });
  assert.deepEqual(parseSender('"Cyber Sens" <a@b.co>'), { name: 'Cyber Sens', email: 'a@b.co' });
  assert.deepEqual(parseSender('a@b.co'), { email: 'a@b.co' });
});

test('la réinitialisation exige un fournisseur, un expéditeur et l’adresse publique', async () => {
  assert.equal(await withEnv({}, () => mailConfigured()), false);
  assert.equal(
    await withEnv({ BREVO_API_KEY: 'k', MAIL_FROM: 'a@b.co' }, () => mailConfigured()),
    false,
  );
  assert.equal(
    await withEnv({ BREVO_API_KEY: 'k', MAIL_FROM: 'a@b.co', PUBLIC_URL: 'https://x.fr' }, () =>
      mailConfigured(),
    ),
    true,
  );
  assert.equal(
    await withEnv({ RESEND_API_KEY: 'k', MAIL_FROM: 'a@b.co', PUBLIC_URL: 'https://x.fr' }, () =>
      mailConfigured(),
    ),
    true,
  );
});

test('Brevo : appel HTTPS avec la clé en en-tête et le bon corps', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{}', { status: 201 });
  };
  try {
    await withEnv({ BREVO_API_KEY: 'cle-brevo', MAIL_FROM: 'CyberSens <moi@gmail.com>' }, () =>
      sendMail({ to: 'membre@test.bf', subject: 'Sujet', text: 'Corps' }),
    );
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].init.headers['api-key'], 'cle-brevo');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    sender: { name: 'CyberSens', email: 'moi@gmail.com' },
    to: [{ email: 'membre@test.bf' }],
    subject: 'Sujet',
    textContent: 'Corps',
  });
});

test('un refus du fournisseur remonte en erreur', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  try {
    await assert.rejects(
      withEnv({ BREVO_API_KEY: 'mauvaise', MAIL_FROM: 'a@b.co' }, () =>
        sendMail({ to: 'x@y.fr', subject: 's', text: 't' }),
      ),
      /HTTP 401/,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
