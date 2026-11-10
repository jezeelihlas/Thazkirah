// Run after `npm run build`; uses test-only credentials and never contacts Google.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { signValue } from '../lib/auth-session.ts';

const secret = 'test-only-session-secret-at-least-32-characters';
let server;
let origin;
let output = '';

before(async () => {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-only-client-secret', AUTH_SECRET: secret, APP_URL: origin },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  server.stdout.on('data', value => { output += value; });
  server.stderr.on('data', value => { output += value; });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.exitCode !== null) throw Error(`Test server exited: ${output}`);
    try { if ((await fetch(`${origin}/api/auth/session`)).ok) return; } catch { /* Waiting for the server to listen. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error(`Test server did not start: ${output}`);
}, { timeout: 40000 });

after(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await exited;
  }
});

test('session endpoint verifies signed account cookies and never caches account data', async () => {
  const anonymous = await fetch(`${origin}/api/auth/session`);
  assert.deepEqual(await anonymous.json(), { configured: true, account: null });
  assert.equal(anonymous.headers.get('cache-control'), 'no-store');
  const account = { id: 'test-user', name: 'Test Account', email: 'test@example.com', exp: Date.now() + 60000 };
  const valid = await fetch(`${origin}/api/auth/session`, { headers: { cookie: `thazkirah-session=${signValue(account, secret)}` } });
  assert.deepEqual((await valid.json()).account, { name: account.name, email: account.email });
  const invalid = await fetch(`${origin}/api/auth/session`, { headers: { cookie: 'thazkirah-session=forged.value' } });
  assert.equal((await invalid.json()).account, null);
});

test('Google redirect includes state, PKCE, nonce, and a short-lived HTTP-only cookie', async () => {
  const response = await fetch(`${origin}/api/auth/google`, { redirect: 'manual' });
  assert.equal(response.status, 307);
  const url = new URL(response.headers.get('location'));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'), `${origin}/api/auth/google/callback`);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  for (const key of ['state', 'nonce', 'code_challenge']) assert.ok(url.searchParams.get(key).length >= 32, key);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=lax/i);
  assert.match(response.headers.get('set-cookie'), /Max-Age=600/i);
});

test('callback rejects missing or mismatched state before any Google token exchange', async () => {
  const login = await fetch(`${origin}/api/auth/google`, { redirect: 'manual' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (const headers of [{}, { cookie }]) {
    const response = await fetch(`${origin}/api/auth/google/callback?code=fake&state=wrong`, { redirect: 'manual', headers });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), `${origin}/?view=profile&auth=failed`);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/i);
  }
});

test('signout rejects cross-origin requests and clears the cookie for same-origin POSTs', async () => {
  const rejected = await fetch(`${origin}/api/auth/signout`, { method: 'POST', headers: { origin: 'https://another-site.example' } });
  assert.equal(rejected.status, 403);
  const response = await fetch(`${origin}/api/auth/signout`, { method: 'POST', headers: { origin } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /thazkirah-session=;/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/i);
});

test('prayer endpoint serves the exact ACJU table and official PDF source', async () => {
  const response = await fetch(`${origin}/api/prayer-times?city=Colombo&date=2026-11-10&school=1`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, 'ACJU');
  assert.deepEqual(data.timings, { Fajr: '04:40', Dhuhr: '11:56', Asr: '16:12', Maghrib: '17:51', Isha: '19:02' });
  assert.match(data.sourcePdf, /01\.-Colombo-11\.pdf$/);
});

test('prayer endpoint rejects impossible dates and unsupported locations', async () => {
  for (const query of ['city=Colombo&date=2026-02-30', 'city=Unknown&date=2026-11-10']) {
    assert.equal((await fetch(`${origin}/api/prayer-times?${query}`)).status, 400);
  }
});
