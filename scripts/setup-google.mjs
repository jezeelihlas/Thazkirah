import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nextEnv from '@next/env';

const args = process.argv.slice(2);
const envPath = resolve('.env.local');
const option = name => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw Error(`Provide a value after ${name}.`);
  return args[index + 1];
};
const readValue = (text, key) => {
  const raw = text.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=(.*)$`, 'm'))?.[1]?.trim() || '';
  if (raw.startsWith('"')) { try { return JSON.parse(raw); } catch { return ''; } }
  return raw.replace(/^'|'$/g, '').replace(/\s+#.*$/, '').trim();
};
const setValue = (text, key, value) => {
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, () => line) : `${text}${text.endsWith('\n') || !text ? '' : '\n'}${line}\n`;
};
const validOrigin = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw Error('Use HTTPS for a hosted site, or HTTP for localhost.');
  return url.origin;
};

try {
  if (args.includes('--check')) {
    nextEnv.loadEnvConfig(process.cwd(), true);
    const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'AUTH_SECRET', 'APP_URL'].filter(key => !process.env[key]);
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) missing.push('AUTH_SECRET (needs at least 32 characters)');
    if (missing.length) {
      console.log(`Google login needs: ${missing.join(', ')}.`);
      process.exitCode = 1;
    } else {
      const origin = validOrigin(process.env.APP_URL);
      console.log('Google login configuration is present. No secrets were displayed.');
      console.log(`Register this exact redirect URI in Google: ${origin}/api/auth/google/callback`);
      console.log('Restart the server, then open Profile and select Continue with Google to verify the account login.');
    }
  } else {
    let text;
    try { text = await readFile(envPath, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; text = '# Private local configuration. Do not commit or share this file.\n'; }
    const origin = validOrigin(option('--origin') || readValue(text, 'APP_URL') || 'http://localhost:3000');
    const importPath = option('--import');
    let web;
    if (importPath) {
      let data;
      try { data = JSON.parse(await readFile(resolve(importPath), 'utf8')); }
      catch { throw Error('Could not read the Google OAuth JSON file. Check its path and file format.'); }
      web = data.web;
      if (!web || typeof web.client_id !== 'string' || !web.client_id.endsWith('.apps.googleusercontent.com') || typeof web.client_secret !== 'string' || !web.client_secret.trim()) {
        throw Error('Use the downloaded OAuth JSON for a Google Web application client, not a service account or Desktop client.');
      }
    }
    if (!readValue(text, 'AUTH_SECRET')) text = setValue(text, 'AUTH_SECRET', randomBytes(32).toString('hex'));
    text = setValue(text, 'APP_URL', origin);
    if (web) {
      text = setValue(text, 'GOOGLE_CLIENT_ID', web.client_id);
      text = setValue(text, 'GOOGLE_CLIENT_SECRET', web.client_secret);
    } else {
      for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) if (!new RegExp(`^${key}\\s*=`, 'm').test(text)) text = setValue(text, key, '');
    }
    await writeFile(envPath, text, { encoding: 'utf8', mode: 0o600 });
    console.log('Prepared .env.local. Existing settings and session secrets were preserved. No secrets were displayed.');
    const callback = `${origin}/api/auth/google/callback`;
    console.log(`Google authorized redirect URI: ${callback}`);
    if (!readValue(text, 'GOOGLE_CLIENT_ID') || !readValue(text, 'GOOGLE_CLIENT_SECRET')) {
      console.log('Google account action remains: create a Web application OAuth client at https://console.cloud.google.com/auth/clients');
      console.log('Add the redirect URI above, download the client JSON outside this project, then run:');
      console.log('npm run setup:google -- --import "C:\\path\\to\\downloaded-client.json"');
    } else {
      if (web?.redirect_uris && !web.redirect_uris.includes(callback)) console.log('Add the redirect URI above to this Google client before signing in.');
      console.log('Run npm run check:google, restart npm run dev, then open Profile and choose Continue with Google.');
    }
  }
} catch (error) {
  // Deliberately do not print file contents, tokens, client secrets, or stack traces.
  console.error(error instanceof Error ? error.message : 'Google login setup could not be completed.');
  process.exitCode = 1;
}
