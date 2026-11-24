// Server-only Supabase Auth transport. Never use the privileged database key here.
import { sessionConfig } from './auth';

export function emailAuthConfig() {
  const session = sessionConfig();
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!session || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  try {
    const url = new URL(SUPABASE_URL);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null;
    return { ...session, url: url.origin, key: SUPABASE_PUBLISHABLE_KEY };
  } catch { return null; }
}

export class EmailAuthError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export type AuthResult = {
  access_token?: string;
  user?: { id: string; email?: string; email_confirmed_at?: string; user_metadata?: { name?: string } };
};

export async function emailAuthRequest(path: string, body: object, token?: string): Promise<AuthResult> {
  const config = emailAuthConfig();
  if (!config) throw new EmailAuthError('Email accounts are not available yet. Please try again later.', 503);
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    method: path === 'user' ? 'PUT' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { apikey: config.key, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new EmailAuthError('Too many attempts. Please wait a few minutes before trying again.', 429);
    if (data.code === 'email_not_confirmed' || data.error_code === 'email_not_confirmed') throw new EmailAuthError('Please verify your email first. Choose Sign up, then Already have a code?');
    if (path.startsWith('token')) throw new EmailAuthError('The email or password is incorrect, or your email still needs verification.', 401);
    if (path === 'verify') throw new EmailAuthError('That code is invalid or has expired. Please request a new code.');
    if (data.code === 'weak_password' || data.error_code === 'weak_password') throw new EmailAuthError('Please choose a stronger password with at least 8 characters.');
    throw new EmailAuthError('We could not complete this request. Please try again later or contact the site administrator.', 503);
  }
  return data;
}
