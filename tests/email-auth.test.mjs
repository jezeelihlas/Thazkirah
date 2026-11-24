// Real Next.js routes with a fake local Supabase Auth server; no external email.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { verifyValue } from '../lib/auth-session.ts';

const secret = 'email-tests-only-secret-at-least-32-characters';
let app, provider, origin, output = '', confirmed = false, currentPassword = 'correct-password';
const requests = [];
const user = () => ({ id: 'email-user-A', email: 'person@example.com', user_metadata: { name: 'Person' }, ...(confirmed ? { email_confirmed_at: new Date().toISOString() } : {}) });

before(async () => {
  provider = createServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    requests.push({ path: request.url, body, authorization: request.headers.authorization });
    response.setHeader('Content-Type', 'application/json');
    if (request.headers.apikey !== 'test-publishable') { response.writeHead(403); response.end('{}'); return; }
    if (body.email === 'limited@example.com') { response.writeHead(429); response.end('{}'); return; }
    if (body.email === 'smtp-error@example.com') { response.writeHead(500); response.end(JSON.stringify({ msg: 'sensitive-provider-debug-detail' })); return; }
    if (request.url === '/auth/v1/signup') { response.end(JSON.stringify({ user: user() })); return; }
    if (request.url === '/auth/v1/token?grant_type=password') {
      if (body.password !== currentPassword || !confirmed) { response.writeHead(400); response.end('{}'); return; }
      response.end(JSON.stringify({ access_token: 'private-access-token', refresh_token: 'private-refresh-token', user: user() })); return;
    }
    if (request.url === '/auth/v1/verify') {
      if (body.token !== '123456') { response.writeHead(403); response.end('{}'); return; }
      confirmed = true;
      response.end(JSON.stringify({ access_token: 'private-access-token', refresh_token: 'private-refresh-token', user: user() })); return;
    }
    if (request.url === '/auth/v1/user') {
      if (request.headers.authorization !== 'Bearer private-access-token') { response.writeHead(401); response.end('{}'); return; }
      currentPassword = body.password; response.end(JSON.stringify(user())); return;
    }
    response.end('{}');
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, APP_URL: origin, AUTH_SECRET: secret, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', SUPABASE_URL: `http://127.0.0.1:${provider.address().port}`, SUPABASE_PUBLISHABLE_KEY: 'test-publishable', SUPABASE_SECRET_KEY: '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout.on('data', d => output += d); app.stderr.on('data', d => output += d);
  for (let i = 0; i < 150; i++) {
    if (app.exitCode !== null) throw Error(output);
    try { if ((await fetch(`${origin}/api/auth/session`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error('Server startup timed out.');
}, { timeout: 40000 });

after(async () => { if (app && app.exitCode === null) { const exit = new Promise(resolve => app.once('exit', resolve)); app.kill(); await exit; } if (provider) await new Promise(resolve => provider.close(resolve)); });
const post = (body, overrides = {}) => fetch(`${origin}/api/auth/email`, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'person@example.com', ...body }), ...overrides });

test('email accounts work without Google credentials and reject cross-origin or malformed input', async () => {
  const session = await fetch(`${origin}/api/auth/session`).then(r => r.json());
  assert.equal(session.configured, false); assert.equal(session.emailConfigured, true);
  const count = requests.length;
  assert.equal((await post({ action: 'signin', password: 'correct-password' }, { headers: { origin: 'https://evil.example' } })).status, 403);
  for (const body of [{ action: 'signup', name: 'Person', password: 'short' }, { action: 'signin', email: 'bad', password: 'correct-password' }, { action: 'verify', code: 'invalid' }, { action: 'unknown' }]) assert.equal((await post(body)).status, 400);
  assert.equal((await post({}, { body: 'not-json' })).status, 400);
  assert.equal((await post({}, { body: 'x'.repeat(8200) })).status, 413);
  assert.equal(requests.length, count);
});

test('signup creates no application session before verification; invalid codes fail', async () => {
  const signup = await post({ action: 'signup', name: 'Person', email: ' PERSON@example.com ', password: 'correct-password' });
  assert.equal(signup.status, 200); assert.equal((await signup.json()).verificationRequired, true);
  assert.equal(signup.headers.get('set-cookie'), null);
  assert.equal(requests.at(-1).body.email, 'person@example.com');
  assert.equal((await post({ action: 'signin', password: 'correct-password' })).status, 401);
  assert.equal((await post({ action: 'verify', code: '000000' })).status, 400);
});

test('verified email creates a protected session accepted by cloud APIs and signout independently of Google', async () => {
  const verified = await post({ action: 'verify', code: '123456', user_id: 'victim' });
  assert.equal(verified.status, 200);
  const setCookie = verified.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=lax/i);
  const cookie = setCookie.split(';')[0];
  const account = verifyValue(cookie.slice(cookie.indexOf('=') + 1), secret);
  assert.equal(account.id, 'supabase:email-user-A');
  const body = await verified.text(); assert.doesNotMatch(body, /private-access-token|private-refresh-token|correct-password/);
  const session = await fetch(`${origin}/api/auth/session`, { headers: { cookie } }).then(r => r.json());
  assert.equal(session.account.email, 'person@example.com'); assert.equal(session.storageKey, 'supabase:email-user-A');
  const progress = await fetch(`${origin}/api/progress`, { headers: { cookie } });
  assert.equal(progress.status, 200); assert.equal((await progress.json()).configured, false);
  const logout = await fetch(`${origin}/api/auth/signout`, { method: 'POST', headers: { origin, cookie } });
  assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});

test('password signin rejects wrong passwords and uses only the provider identity', async () => {
  assert.equal((await post({ action: 'signin', password: 'wrong-password' })).status, 401);
  const response = await post({ action: 'signin', password: 'correct-password', id: 'victim' });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /thazkirah-session=/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('resend and recovery hide account existence, and password reset requires a valid code', async () => {
  for (const action of ['resend', 'recover']) {
    const response = await post({ action }); assert.equal(response.status, 200); assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.equal((await post({ action: 'reset', code: '000000', password: 'new-password-123' })).status, 400);
  assert.equal(currentPassword, 'correct-password');
  const reset = await post({ action: 'reset', code: '123456', password: 'new-password-123' });
  assert.equal(reset.status, 200); assert.equal((await reset.json()).passwordReset, true); assert.equal(reset.headers.get('set-cookie'), null);
  assert.equal(requests.at(-1).authorization, 'Bearer private-access-token');
  assert.equal((await post({ action: 'signin', password: 'correct-password' })).status, 401);
  assert.equal((await post({ action: 'signin', password: 'new-password-123' })).status, 200);
});

test('provider rate limits are preserved and private provider errors are not exposed', async () => {
  assert.equal((await post({ action: 'recover', email: 'limited@example.com' })).status, 429);
  const failed = await post({ action: 'recover', email: 'smtp-error@example.com' });
  assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /sensitive-provider-debug-detail/);
});
