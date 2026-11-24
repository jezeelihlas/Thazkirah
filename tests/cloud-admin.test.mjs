import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as httpServer } from 'node:http';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { scryptSync } from 'node:crypto';
import { signValue } from '../lib/auth-session.ts';
import { verifyAdminPassword } from '../lib/admin-password.ts';

const secret = 'cloud-tests-only-secret-at-least-32-characters';
const salt = 'a'.repeat(32);
const password = 'test-only-admin-password';
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
let app, db, origin, output = '', state = null, allowed = true;
const requests = [];
const accountCookie = `thazkirah-session=${signValue({ id: 'google-A', name: 'User A', email: 'a@example.com', exp: Date.now() + 60000 }, secret)}`;

before(async () => {
  db = httpServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    requests.push({ path: request.url, body });
    response.setHeader('Content-Type', 'application/json');
    if (request.headers.apikey !== 'sb_secret_test') { response.writeHead(403); response.end('{}'); return; }
    if (request.url === '/rest/v1/rpc/allow_admin_login') { response.end(JSON.stringify(allowed)); return; }
    if (request.url === '/rest/v1/rpc/save_practice_account') {
      if ((state?.version || 0) !== body.p_version) { response.end('[]'); return; }
      state = { user_id: body.p_user_id, email: body.p_email, name: body.p_name, records: body.p_records, preferences: body.p_preferences, version: (state?.version || 0) + 1, updated_at: new Date().toISOString() };
      response.end(JSON.stringify([state])); return;
    }
    response.end(JSON.stringify(state ? [state] : []));
  });
  await new Promise(resolve => db.listen(0, '127.0.0.1', resolve));
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, APP_URL: origin, AUTH_SECRET: secret, GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'fake', ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD_HASH: hash, SUPABASE_URL: `http://127.0.0.1:${db.address().port}`, SUPABASE_SECRET_KEY: 'sb_secret_test' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout.on('data', d => output += d); app.stderr.on('data', d => output += d);
  for (let i = 0; i < 150; i++) {
    if (app.exitCode !== null) throw Error(output);
    try { if ((await fetch(`${origin}/api/auth/session`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error('Server startup timed out.');
}, { timeout: 40000 });
after(async () => { if (app && app.exitCode === null) { const exit = new Promise(resolve => app.once('exit', resolve)); app.kill(); await exit; } if (db) await new Promise(resolve => db.close(resolve)); });

test('admin password hashes reject incorrect and malformed credentials', () => {
  assert.equal(verifyAdminPassword(password, hash), true);
  assert.equal(verifyAdminPassword('wrong', hash), false);
  assert.equal(verifyAdminPassword(password, 'invalid'), false);
});
test('anonymous and normal Google users cannot read the admin directory', async () => {
  for (const headers of [{}, { cookie: accountCookie }]) assert.equal((await fetch(`${origin}/api/admin/users`, { headers })).status, 401);
  assert.equal((await fetch(`${origin}/api/progress`)).status, 401);
});
test('cloud writes enforce origin, bind identity to the signed session, and reject stale updates', async () => {
  const payload = { user_id: 'victim', email: 'victim@example.com', version: 0, records: { '2026-11-09': { Fajr: true, 'note:habit-quran': 'Study' } }, preferences: { routine: [] } };
  const options = { method: 'PUT', headers: { cookie: accountCookie, origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  assert.equal((await fetch(`${origin}/api/progress`, { ...options, headers: { ...options.headers, origin: 'https://evil.example' } })).status, 403);
  const saved = await fetch(`${origin}/api/progress`, options); assert.equal(saved.status, 200);
  assert.equal(state.user_id, 'google-A'); assert.equal(state.email, 'a@example.com');
  assert.equal((await fetch(`${origin}/api/progress`, options)).status, 409);
  const loaded = await fetch(`${origin}/api/progress`, { headers: { cookie: accountCookie } });
  assert.equal((await loaded.json()).state.records['2026-11-09'].Fajr, true);
  assert.match(requests.at(-1).path, /user_id=eq.google-A/);
  assert.equal(loaded.headers.get('cache-control'), 'no-store');
});
test('admin login checks password, database throttle, protected session, and logout', async () => {
  const login = p => fetch(`${origin}/api/admin/login`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com', password: p }) });
  assert.equal((await login('wrong')).status, 401);
  allowed = false; assert.equal((await login(password)).status, 429); allowed = true;
  const response = await login(password); assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=strict/i);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const users = await fetch(`${origin}/api/admin/users`, { headers: { cookie } });
  assert.equal(users.status, 200); assert.equal((await users.json()).users[0].user_id, 'google-A');
  const tampered = cookie.slice(0, -5) + 'wrong';
  assert.equal((await fetch(`${origin}/api/admin/users`, { headers: { cookie: tampered } })).status, 401);
  assert.equal((await fetch(`${origin}/api/admin/logout`, { method: 'POST', headers: { origin: 'https://evil.example', cookie } })).status, 403);
  const logout = await fetch(`${origin}/api/admin/logout`, { method: 'POST', headers: { origin, cookie } });
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});
