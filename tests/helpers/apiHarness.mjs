// Démarre l'API sur une base PGlite temporaire pour les tests d'intégration.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PASSWORD = 'soleil-riviere-mangue-7';

export const startHarness = async (prefix, env = {}) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `cybersens-${prefix}-`));
  process.env.DB_PATH = path.join(tmpDir, 'pglite');
  Object.assign(process.env, env);

  const apiMod = await import('../../server/api.mjs');
  const { closeDb } = await import('../../server/db.mjs');

  const server = http.createServer(async (req, res) => {
    if (!(await apiMod.handleApi(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const BASE = `http://127.0.0.1:${server.address().port}`;

  const client = () => {
    let cookie = '';
    const call = async (method, url, body) => {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (cookie) headers.Cookie = cookie;
      const res = await fetch(BASE + url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* pas de corps */
      }
      return { status: res.status, data };
    };
    return {
      call,
      get cookie() {
        return cookie;
      },
    };
  };

  const register = async (name, email) => {
    apiMod.resetRateLimits('register:');
    const c = client();
    const r = await c.call('POST', '/api/auth/register', {
      acceptTerms: true,
      name,
      email,
      password: PASSWORD,
      role: 'Étudiant',
    });
    assert.equal(r.status, 201, `inscription de ${email} : ${JSON.stringify(r.data)}`);
    return c;
  };

  return {
    BASE,
    client,
    register,
    resetMembersCache: apiMod.resetMembersCache,
    stop: async () => {
      server.closeAllConnections?.();
      server.close();
      await closeDb();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
};
