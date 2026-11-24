import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { verifyValue } from './auth-session';

export type Account = { id: string; name: string; email: string; exp: number };
export type AuthFlow = { state: string; nonce: string; verifier: string; exp: number };
export const sessionCookie = 'thazkirah-session';
export const flowCookie = 'thazkirah-google-flow';

export function sessionConfig() {
  const { AUTH_SECRET, APP_URL } = process.env;
  if (!AUTH_SECRET || AUTH_SECRET.length < 32 || !APP_URL) return null;
  try {
    const url = new URL(APP_URL);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
    return { secret: AUTH_SECRET, origin: url.origin, secure: url.protocol === 'https:' };
  } catch { return null; }
}

export function authConfig() {
  const config = sessionConfig();
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  return config && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? { ...config, clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } : null;
}

export function googleClient(config: NonNullable<ReturnType<typeof authConfig>>) {
  return new OAuth2Client(config.clientId, config.clientSecret, `${config.origin}/api/auth/google/callback`);
}

export async function getAccount() {
  const config = sessionConfig();
  if (!config) return null;
  const account = verifyValue<Account>((await cookies()).get(sessionCookie)?.value, config.secret);
  return account && typeof account.id === 'string' && typeof account.name === 'string' && typeof account.email === 'string' ? account : null;
}
