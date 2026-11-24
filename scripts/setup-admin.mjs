import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// Password is saved privately, never printed or committed. Run again to rotate it.
const email = process.argv[2] || 'admin@thazkirah.jezeelikhlas.dev';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Pass a valid administrator email.');
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const file = '.env.local';
let env = existsSync(file) ? readFileSync(file, 'utf8') : '';
const values = { ADMIN_EMAIL: email, ADMIN_PASSWORD_HASH: hash };
if (!/^AUTH_SECRET=.+$/m.test(env)) values.AUTH_SECRET = randomBytes(32).toString('hex');
for (const [key, value] of Object.entries(values)) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  env = regex.test(env) ? env.replace(regex, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(file, env, { mode: 0o600 });
writeFileSync('.env.admin-credentials', `Admin page: https://thazkirah.jezeelikhlas.dev/admin\nEmail: ${email}\nPassword: ${password}\n\nPrivate credentials: do not commit or share. This email is a login identifier; no mailbox is created.\nCopy ADMIN_EMAIL and ADMIN_PASSWORD_HASH from .env.local into Vercel Production variables.\n`, { mode: 0o600 });
console.log('Admin credentials created privately in .env.admin-credentials. Environment settings updated in .env.local.');
