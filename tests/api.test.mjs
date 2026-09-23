// Tests d'intégration de l'API : npm test
// L'API est démarrée en mémoire sur une base SQLite temporaire (aucun build ni serveur externe requis).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cybersens-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

const { handleApi, getSessionUser } = await import('../server/api.mjs');
const { handleGeminiProxy } = await import('../server/geminiProxy.mjs');
const { closeDb } = await import('../server/db.mjs');
const { COMPREHENSIVE_COURSE_MODULES } = await import('../services/coursesData.ts');

let server;
let BASE;
let cookie = '';

before(async () => {
  server = http.createServer(async (req, res) => {
    if (await handleGeminiProxy(req, res, 'cle-de-test', (r) => !!getSessionUser(r))) return;
    if (!(await handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  closeDb();
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
        name: 'Awa Traoré',
        email: 'awa@test.bf',
        password: 'awa-mot-de-passe-long',
        role: 'Étudiant',
      })
    ).status,
    400,
  );

  const reg = await call('POST', '/api/auth/register', {
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
    { name: 'Autre', email: 'awa@test.bf', password: 'lune-cactus-orage-12', role: 'Étudiant' },
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
