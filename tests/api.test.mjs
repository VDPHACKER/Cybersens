// Tests d'intégration de l'API : npm test
// L'API est démarrée en mémoire sur une base PostgreSQL embarquée (PGlite) temporaire (aucun build ni serveur externe requis).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-test-'));
process.env.DB_PATH = path.join(tmpDir, 'pglite');

const { handleApi, getSessionUser } = await import('../server/api.mjs');
const { handleGeminiProxy } = await import('../server/geminiProxy.mjs');
const { checkOrigin } = await import('../server/csrf.mjs');
const { closeDb } = await import('../server/db.mjs');
const { COMPREHENSIVE_COURSE_MODULES } = await import('../services/coursesData.ts');

let server;
let BASE;
let cookie = '';

before(async () => {
  server = http.createServer(async (req, res) => {
    if (await handleGeminiProxy(req, res, 'cle-de-test', async (r) => !!(await getSessionUser(r))))
      return;
    if (!(await handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const call = async (method, url, body, { origin, raw, jar = true } = {}) => {
  const headers = {};
  if (body !== undefined || raw !== undefined)
    headers['Content-Type'] = raw !== undefined ? 'text/plain' : 'application/json';
  if (jar && cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const set = res.headers.get('set-cookie');
  if (set && jar) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* pas de corps */
  }
  return { status: res.status, data, setCookie: set };
};

const PASSWORD = 'soleil-riviere-mangue-7';
const exam = COMPREHENSIVE_COURSE_MODULES[0].examQuestions;
const goodAnswers = Object.fromEntries(exam.map((q) => [q.id, q.correctAnswer]));
const wrongAnswers = Object.fromEntries(
  exam.map((q) => [q.id, (q.correctAnswer + 1) % q.options.length]),
);

test('santé du service', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'ok');
  assert.equal(r.data.database, 'ok');
});

test('inscription : validation et création de session', async () => {
  assert.equal((await call('GET', '/api/me')).status, 401);
  assert.equal(
    (
      await call('POST', '/api/auth/register', {
        acceptTerms: true,
        name: 'Awa Traoré',
        email: 'awa@test.bf',
        password: 'court',
        role: 'Étudiant',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call('POST', '/api/auth/register', {
        acceptTerms: true,
        name: 'Awa Traoré',
        email: 'awa@test.bf',
        password: 'awa-mot-de-passe-long',
        role: 'Étudiant',
      })
    ).status,
    400,
  );

  const reg = await call('POST', '/api/auth/register', {
    acceptTerms: true,
    name: 'Awa Traoré',
    email: 'Awa@Test.bf',
    password: PASSWORD,
    role: 'Étudiant',
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.email, 'awa@test.bf');
  assert.match(reg.setCookie, /HttpOnly/);
  assert.match(reg.setCookie, /SameSite=Lax/);
  assert.ok(!JSON.stringify(reg.data).includes('scrypt'), 'aucune empreinte renvoyée');

  const dup = await call(
    'POST',
    '/api/auth/register',
    {
      acceptTerms: true,
      name: 'Autre',
      email: 'awa@test.bf',
      password: 'lune-cactus-orage-12',
      role: 'Étudiant',
    },
    { jar: false },
  );
  assert.equal(dup.status, 409);
});

test('progression, points et quiz', async () => {
  assert.equal(
    (await call('POST', '/api/progress', { courseId: 'module-1', lessonId: 'm1-l1' })).data
      .newlyCompleted,
    true,
  );
  assert.equal(
    (await call('POST', '/api/progress', { courseId: 'module-1', lessonId: 'm1-l1' })).data
      .newlyCompleted,
    false,
  );
  assert.equal(
    (await call('POST', '/api/progress', { courseId: 'module-1', lessonId: 'm9-l1' })).status,
    404,
  );
  assert.equal((await call('POST', '/api/me/points', { delta: 25 })).data.points, 25);
  assert.equal((await call('POST', '/api/me/points', { delta: 100000 })).status, 400);
  assert.equal(
    (await call('POST', '/api/quiz-results', { score: 8, total: 10, mode: 'Solo' })).status,
    201,
  );
  assert.equal(
    (await call('POST', '/api/quiz-results', { score: 11, total: 10, mode: 'Solo' })).status,
    400,
  );
});

test('examen corrigé par le serveur et certificat signé', async () => {
  const fail = await call('POST', '/api/exams', { courseId: 'module-1', answers: wrongAnswers });
  assert.equal(fail.data.passed, false);
  assert.equal(fail.data.certificate, null);

  const pass = await call('POST', '/api/exams', { courseId: 'module-1', answers: goodAnswers });
  assert.equal(pass.data.passed, true);
  assert.equal(pass.data.score, 100);
  assert.equal(pass.data.points, 175);
  assert.match(pass.data.certificate.verificationHash, /^[0-9a-f]{64}$/);

  const again = await call('POST', '/api/exams', { courseId: 'module-1', answers: goodAnswers });
  assert.equal(again.data.points, 175, 'pas de double attribution de points');

  const number = again.data.certificate.certificateNumber;
  const verify = await call(
    'GET',
    `/api/certificates/verify?number=${encodeURIComponent(number)}`,
    undefined,
    { jar: false },
  );
  assert.equal(verify.data.valid, true);
  assert.equal(verify.data.recipientName, 'Awa Traoré');
  assert.ok(!('email' in verify.data));
  assert.equal(
    (await call('GET', '/api/certificates/verify?number=FAUX', undefined, { jar: false })).data
      .valid,
    false,
  );
});

test('migration unique des données locales', async () => {
  const mig = await call('POST', '/api/migrate', {
    progress: { 'module-2': ['m2-l1', 'm2-l2', 'inventee'] },
    quizHistory: [
      { date: '2026-09-01T10:00:00Z', score: 7, total: 10, mode: 'Solo' },
      { score: 99, total: 10 },
    ],
    certificates: [{ courseId: 'module-3', score: 100 }],
    points: 999999,
    settings: { theme: 'dark' },
  });
  assert.equal(mig.data.progress['module-2'].length, 2);
  assert.equal(mig.data.quizHistory.length, 2);
  assert.equal(mig.data.user.points, 175 + 5000, 'points plafonnés');
  assert.ok(
    mig.data.certificates.find((c) => c.courseId === 'module-3').issuer.includes('importé'),
  );
  assert.equal(
    (await call('POST', '/api/migrate', { points: 5000 })).data.user.points,
    5175,
    'migration unique',
  );
});

test('sécurité : CSRF, validation, injection SQL, IA réservée', async () => {
  assert.equal(
    (await call('PATCH', '/api/me', { name: 'X Y' }, { origin: 'https://malveillant.example' }))
      .status,
    403,
  );
  assert.equal((await call('PATCH', '/api/me', undefined, { raw: 'name=x' })).status, 415);
  assert.equal((await call('PATCH', '/api/me', { avatar: 'javascript:alert(1)' })).status, 400);
  const evil = "Robert'); DROP TABLE users;--";
  assert.equal((await call('PATCH', '/api/me', { name: evil })).status, 200);
  assert.equal((await call('GET', '/api/me')).data.user.name, evil);
  assert.doesNotThrow(() =>
    checkOrigin(
      {
        headers: {
          origin: 'https://app.example.com',
          host: 'internal:8080',
          'x-forwarded-host': 'app.example.com',
          'x-forwarded-proto': 'https',
        },
      },
      { trustProxy: true },
    ),
  );
  assert.throws(
    () =>
      checkOrigin(
        {
          headers: {
            origin: 'https://evil.example.com',
            host: 'internal:8080',
            'x-forwarded-host': 'app.example.com',
            'x-forwarded-proto': 'https',
          },
        },
        { trustProxy: true },
      ),
    /Origine refusée/,
  );
  assert.equal(
    (
      await call(
        'POST',
        '/api/gemini/v1beta/models/gemini-3.8-flash:generateContent',
        { contents: [] },
        { jar: false },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        'POST',
        '/api/gemini/v1beta/models/gemini-3.8-flash:generateContent',
        { contents: [] },
        { origin: 'https://malveillant.example' },
      )
    ).status,
    403,
    'le relais Gemini doit aussi rejeter une origine étrangère, même avec une session valide',
  );
});

test('déconnexion, connexion, anti-énumération et verrouillage', async () => {
  await call('POST', '/api/auth/logout');
  assert.equal((await call('GET', '/api/me')).status, 401);

  const wrong = await call('POST', '/api/auth/login', {
    email: 'awa@test.bf',
    password: 'mauvais',
  });
  const unknown = await call('POST', '/api/auth/login', {
    email: 'personne@test.bf',
    password: 'mauvais',
  });
  assert.equal(wrong.data.error, 'E-mail ou mot de passe incorrect.');
  assert.equal(unknown.data.error, wrong.data.error, 'même message que l’e-mail existe ou non');

  const login = await call('POST', '/api/auth/login', { email: 'AWA@test.bf', password: PASSWORD });
  assert.equal(login.status, 200);
  assert.equal(login.data.certificates.length, 2);

  for (let i = 0; i < 5; i++)
    await call(
      'POST',
      '/api/auth/login',
      { email: 'awa@test.bf', password: `faux-${i}` },
      { jar: false },
    );
  assert.equal(
    (
      await call(
        'POST',
        '/api/auth/login',
        { email: 'awa@test.bf', password: PASSWORD },
        { jar: false },
      )
    ).status,
    429,
  );
});

test('inscription : les conditions d’utilisation doivent être acceptées', async () => {
  const body = {
    name: 'Sans Cgu',
    email: 'sans-cgu@test.bf',
    password: PASSWORD,
    role: 'Étudiant',
  };
  for (const acceptTerms of [undefined, false, 'true']) {
    const res = await call('POST', '/api/auth/register', { ...body, acceptTerms }, { jar: false });
    assert.equal(res.status, 400, `acceptTerms=${String(acceptTerms)} refusé`);
  }
  const ok = await call('POST', '/api/auth/register', { ...body, acceptTerms: true });
  assert.equal(ok.status, 201);
  await call('POST', '/api/auth/logout');
});

test('administration DevOps : réservée aux administrateurs déclarés', async () => {
  delete process.env.ADMIN_EMAILS;
  await call('POST', '/api/auth/logout');

  // Non configurée : routes invisibles, même pour un visiteur anonyme
  for (const [method, url, body] of [
    ['GET', '/api/devops/status'],
    ['GET', '/api/devops/backup'],
    ['POST', '/api/devops/exec', { action: 'vacuum' }],
  ]) {
    assert.equal((await call(method, url, body, { jar: false })).status, 404, `${url} désactivée`);
  }

  process.env.ADMIN_EMAILS = 'boss@test.bf';
  assert.equal((await call('GET', '/api/devops/status', undefined, { jar: false })).status, 401);

  // Un compte ordinaire (absent de ADMIN_EMAILS) est refusé
  const reg = await call('POST', '/api/auth/register', {
    acceptTerms: true,
    name: 'Administrateur Test',
    email: 'boss@test.bf',
    password: PASSWORD,
    role: 'Professionnel',
  });
  assert.equal(reg.status, 201);
  process.env.ADMIN_EMAILS = 'autre-admin@test.bf';
  assert.equal(
    (await call('GET', '/api/devops/status')).status,
    403,
    'utilisateur ordinaire refusé',
  );
  assert.equal((await call('GET', '/api/devops/backup')).status, 403);
  assert.equal((await call('POST', '/api/devops/exec', { action: 'vacuum' })).status, 403);

  // Le même compte, une fois déclaré administrateur, est accepté
  process.env.ADMIN_EMAILS = 'BOSS@test.bf';
  const status = await call('GET', '/api/devops/status');
  assert.equal(status.status, 200);
  assert.ok(status.data.stats.users >= 2);

  // Liste des membres : visible de l'admin, sans secret, avec la preuve d'acceptation des CGU
  const list = await call('GET', '/api/admin/users');
  assert.equal(list.status, 200);
  assert.equal(list.data.total, list.data.users.length);
  const boss = list.data.users.find((u) => u.email === 'boss@test.bf');
  assert.ok(boss.termsAcceptedAt && boss.termsVersion, 'acceptation des CGU enregistrée');
  assert.ok(!JSON.stringify(list.data).match(/password|hash|token/i), 'aucun secret exposé');
  process.env.ADMIN_EMAILS = 'autre-admin@test.bf';
  assert.equal((await call('GET', '/api/admin/users')).status, 403, 'membre ordinaire refusé');
  process.env.ADMIN_EMAILS = 'BOSS@test.bf';

  const backup = await call('GET', '/api/devops/backup');
  assert.equal(backup.status, 200);
  assert.ok(backup.data.exportedAt);
  assert.ok(
    backup.data.tables.users.some((u) => u.email === 'boss@test.bf'),
    'la sauvegarde contient les membres',
  );
  assert.equal(backup.data.tables.sessions, undefined, 'sessions exclues de la sauvegarde');

  // Une requête inter-sites sans en-tête Origin est refusée (CSRF)
  assert.throws(
    () => checkOrigin({ headers: { 'sec-fetch-site': 'cross-site', host: 'app.example.com' } }),
    /Origine refusée/,
  );
  delete process.env.ADMIN_EMAILS;
});

test('administrateur : réinitialise le mot de passe d’un membre depuis le Centre DevOps', async () => {
  // Comptes créés par les tests précédents (la limite d'inscriptions par IP empêche d'en créer d'autres)
  const MEMBER = 'sans-cgu@test.bf';
  const ADMIN = 'boss@test.bf';
  process.env.ADMIN_EMAILS = ADMIN;

  const asMember = await call('POST', '/api/auth/login', { email: MEMBER, password: PASSWORD });
  assert.equal(asMember.status, 200);
  const memberId = asMember.data.user.id;

  // Un membre ordinaire ne peut pas réinitialiser les mots de passe
  assert.equal(
    (await call('POST', '/api/admin/users/reset-password', { userId: memberId })).status,
    403,
  );
  await call('POST', '/api/auth/logout');

  const asAdmin = await call('POST', '/api/auth/login', { email: ADMIN, password: PASSWORD });
  assert.equal(asAdmin.status, 200);
  const reset = await call('POST', '/api/admin/users/reset-password', { userId: memberId });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.email, MEMBER);
  assert.ok(reset.data.temporaryPassword.length >= 12);

  // Un administrateur ne peut pas être réinitialisé par cette route ; un membre inconnu non plus
  assert.equal(
    (await call('POST', '/api/admin/users/reset-password', { userId: asAdmin.data.user.id }))
      .status,
    400,
  );
  assert.equal(
    (await call('POST', '/api/admin/users/reset-password', { userId: 999999 })).status,
    404,
  );
  await call('POST', '/api/auth/logout');

  // Ancien mot de passe refusé, temporaire accepté
  assert.equal(
    (await call('POST', '/api/auth/login', { email: MEMBER, password: PASSWORD })).status,
    401,
  );
  assert.equal(
    (
      await call('POST', '/api/auth/login', {
        email: MEMBER,
        password: reset.data.temporaryPassword,
      })
    ).status,
    200,
  );
  await call('POST', '/api/auth/logout');
  delete process.env.ADMIN_EMAILS;
});

test('relais Gemini : quota par compte, pas partagé entre utilisateurs', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) =>
    String(url).includes('googleapis')
      ? new Response('{"candidates":[]}', { status: 200 })
      : realFetch(url, init);
  const send = async (user, headers = {}) => {
    const req = Readable.from([Buffer.from('{}')]);
    Object.assign(req, {
      method: 'POST',
      url: '/api/gemini/v1beta/models/gemini-3.8-flash:generateContent',
      headers: { 'content-type': 'application/json', host: 'x', ...headers },
      socket: { remoteAddress: '10.0.0.1' }, // adresse du reverse-proxy, identique pour tous
    });
    let status = 0;
    const res = {
      headersSent: false,
      setHeader() {},
      writeHead(code) {
        status = code;
      },
      write() {},
      end() {},
    };
    await handleGeminiProxy(req, res, 'cle-de-test', () => user);
    return status;
  };
  try {
    for (let i = 0; i < 30; i++) assert.equal(await send({ id: 9001 }), 200);
    assert.equal(await send({ id: 9001 }), 429, 'le 31e appel du même compte est limité');
    assert.equal(await send({ id: 9002 }), 200, 'un autre compte n’est pas pénalisé');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('classement et communauté : confidentialité, droits et limites', async () => {
  // Accès réservé aux membres connectés
  assert.equal((await call('GET', '/api/leaderboard', undefined, { jar: false })).status, 401);
  assert.equal((await call('GET', '/api/community/posts', undefined, { jar: false })).status, 401);

  // Membre A : le compte créé par le test précédent
  const login = await call('POST', '/api/auth/login', {
    email: 'boss@test.bf',
    password: PASSWORD,
  });
  assert.equal(login.status, 200);
  await call('POST', '/api/me/points', { delta: 50 });

  // Classement : nom abrégé, jamais d'e-mail
  const board = await call('GET', '/api/leaderboard');
  assert.equal(board.status, 200);
  const mine = board.data.entries.find((e) => e.isMe);
  assert.ok(mine, 'le membre apparaît dans le classement');
  assert.equal(mine.name, 'Administrateur T.', 'prénom + initiale uniquement');
  assert.doesNotMatch(JSON.stringify(board.data), /@test\.bf/, 'aucune adresse e-mail divulguée');
  assert.equal(board.data.me.visible, true);

  // Option de confidentialité : masqué du classement
  await call('PATCH', '/api/me', { settings: { showInLeaderboard: false } });
  const hidden = await call('GET', '/api/leaderboard');
  assert.equal(
    hidden.data.entries.some((e) => e.isMe),
    false,
  );
  assert.equal(hidden.data.me.visible, false);
  assert.equal(hidden.data.me.rank, null);
  await call('PATCH', '/api/me', { settings: { showInLeaderboard: true } });

  // Communauté : validation
  const tooShort = await call('POST', '/api/community/posts', { body: 'a' });
  assert.equal(tooShort.status, 400);
  const html = '<img src=x onerror=alert(1)> Bonjour\n\n\n\nla communauté';
  const created = await call('POST', '/api/community/posts', {
    body: html,
    topic: 'inconnu',
  });
  assert.equal(created.status, 201);
  const postId = created.data.id;

  let feed = await call('GET', '/api/community/posts');
  let post = feed.data.posts.find((p) => p.id === postId);
  assert.equal(post.topic, 'general', 'sujet inconnu ramené à « general »');
  assert.ok(
    post.body.startsWith('<img src=x'),
    'le texte est stocké tel quel (échappé à l’affichage)',
  );
  assert.doesNotMatch(post.body, /\n{3,}/, 'retours à la ligne normalisés');
  assert.equal(post.mine, true);
  assert.equal((await call('GET', '/api/community/posts?topic=hack')).status, 400);

  // J'aime (bascule) et commentaire
  assert.deepEqual((await call('POST', '/api/community/like', { postId })).data, {
    liked: true,
    likes: 1,
  });
  assert.deepEqual((await call('POST', '/api/community/like', { postId })).data, {
    liked: false,
    likes: 0,
  });
  assert.equal((await call('POST', '/api/community/like', { postId: 999999 })).status, 404);
  const comment = await call('POST', '/api/community/comments', { postId, body: 'Merci !' });
  assert.equal(comment.status, 201);

  // Membre B : ne peut supprimer ni le message ni le commentaire d'un autre
  await call('POST', '/api/auth/logout');
  const other = await call('POST', '/api/auth/register', {
    acceptTerms: true,
    name: 'Membre Deux',
    email: 'membre@test.bf',
    password: PASSWORD,
    role: 'Étudiant',
  });
  assert.equal(other.status, 201);
  assert.equal((await call('DELETE', `/api/community/posts?id=${postId}`)).status, 403);
  assert.equal((await call('DELETE', `/api/community/comments?id=${comment.data.id}`)).status, 403);
  feed = await call('GET', '/api/community/posts');
  post = feed.data.posts.find((p) => p.id === postId);
  assert.equal(post.mine, false);
  assert.equal(feed.data.canModerate, false);
  assert.equal(post.comments[0].author, 'Administrateur T.');

  // L'auteur peut supprimer ; la suppression emporte commentaires et « j'aime »
  await call('POST', '/api/auth/logout');
  await call('POST', '/api/auth/login', { email: 'boss@test.bf', password: PASSWORD });
  assert.equal((await call('DELETE', `/api/community/posts?id=${postId}`)).status, 200);
  assert.equal((await call('DELETE', `/api/community/posts?id=${postId}`)).status, 404);
  feed = await call('GET', '/api/community/posts');
  assert.equal(
    feed.data.posts.some((p) => p.id === postId),
    false,
  );

  // Limite de débit : 5 messages par tranche de 10 minutes et par membre
  let last;
  for (let i = 0; i < 5; i++)
    last = await call('POST', '/api/community/posts', { body: `Message de test ${i}` });
  assert.equal(last.status, 429, 'le 5e message de la fenêtre dépasse la limite (1 déjà envoyé)');
});

test('points déclarés : plafond quotidien (le classement ne peut pas être truqué)', async () => {
  const login = await call('POST', '/api/auth/login', {
    email: 'boss@test.bf',
    password: PASSWORD,
  });
  assert.equal(login.status, 200);
  const before = (await call('GET', '/api/me')).data.user.points;

  // 10 x 200 = 2000 points demandés : le serveur n'en accorde pas plus que le plafond du jour
  let last;
  for (let i = 0; i < 10; i++) last = await call('POST', '/api/me/points', { delta: 200 });
  assert.equal(last.status, 200);
  const after = (await call('GET', '/api/me')).data.user.points;
  const gained = after - before;
  assert.ok(gained > 0 && gained <= 1500, `gain plafonné à 1500 (obtenu : ${gained})`);
  assert.equal(last.data.granted, 0, 'plus aucun point accordé une fois le plafond atteint');
  assert.equal(last.data.points, after, 'le total renvoyé correspond à la base');

  // Le classement reflète le total plafonné, pas le total demandé
  const board = await call('GET', '/api/leaderboard');
  assert.ok(board.data.entries.find((e) => e.isMe).points <= before + 1500);
});
