import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/setup-google.mjs');
const run = (cwd, ...args) => {
  const env = { ...process.env, NODE_ENV: 'development' };
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_SECRET', 'APP_URL', '__NEXT_PROCESSED_ENV']) delete env[key];
  return spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', windowsHide: true });
};
const cleanup = async directory => {
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('thazkirah-google-setup-')) throw Error('Unexpected test cleanup path.');
  await rm(directory, { recursive: true, force: true });
};

test('Google setup imports privately and preserves the session secret and unrelated settings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thazkirah-google-setup-'));
  try {
    await writeFile(join(directory, '.env.local'), 'EXISTING_SETTING=keep\n');
    const initial = run(directory, '--origin', 'https://login.example.com');
    assert.equal(initial.status, 0, initial.stderr);
    const first = await readFile(join(directory, '.env.local'), 'utf8');
    const secret = first.match(/^AUTH_SECRET=(.*)$/m)[1];
    assert.ok(JSON.parse(secret).length >= 32);
    const fakeSecret = 'test-only-google-client-secret';
    const fakeClientId = 'test-only.apps.googleusercontent.com';
    const jsonPath = join(directory, 'test-client.json');
    await writeFile(jsonPath, JSON.stringify({ web: { client_id: fakeClientId, client_secret: fakeSecret, redirect_uris: ['https://login.example.com/api/auth/google/callback'] } }));
    const imported = run(directory, '--import', jsonPath);
    assert.equal(imported.status, 0, imported.stderr);
    const saved = await readFile(join(directory, '.env.local'), 'utf8');
    assert.match(saved, /^EXISTING_SETTING=keep$/m);
    assert.ok(saved.includes(`AUTH_SECRET=${secret}`));
    assert.ok(saved.includes(`GOOGLE_CLIENT_ID="${fakeClientId}"`));
    assert.ok(saved.includes(`GOOGLE_CLIENT_SECRET="${fakeSecret}"`));
    assert.ok(!imported.stdout.includes(fakeSecret));
    assert.ok(!imported.stdout.includes(secret));
    const checked = run(directory, '--check');
    assert.equal(checked.status, 0, checked.stderr);
    assert.ok(!checked.stdout.includes(fakeSecret));
    assert.ok(!checked.stdout.includes(secret));
  } finally { await cleanup(directory); }
});

test('Google setup rejects an insecure hosted origin and the wrong credential type', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thazkirah-google-setup-'));
  try {
    const invalid = run(directory, '--origin', 'http://login.example.com');
    assert.equal(invalid.status, 1);
    const jsonPath = join(directory, 'test-client.json');
    await writeFile(jsonPath, JSON.stringify({ installed: { client_id: 'desktop.apps.googleusercontent.com', client_secret: 'test-only-secret' } }));
    const desktop = run(directory, '--import', jsonPath);
    assert.equal(desktop.status, 1);
    assert.ok(!desktop.stderr.includes('test-only-secret'));
    const empty = run(directory);
    assert.equal(empty.status, 0);
    const checked = run(directory, '--check');
    assert.equal(checked.status, 1);
    assert.match(checked.stdout, /GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET/);
  } finally { await cleanup(directory); }
});
