import { NextResponse } from 'next/server';
import { sessionConfig, sessionCookie } from '../../../../lib/auth';
import { signValue } from '../../../../lib/auth-session';
import { emailAuthConfig, emailAuthRequest, EmailAuthError, type AuthResult } from '../../../../lib/email-auth';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

function signedIn(result: AuthResult) {
  const config = sessionConfig();
  const user = result.user;
  if (!config || !result.access_token || !user?.id || !user.email || !user.email_confirmed_at) {
    throw new EmailAuthError('Please verify your email before signing in.', 401);
  }
  // Keep existing Google IDs intact; never link accounts just because emails match.
  const account = { id: `supabase:${user.id}`, email: user.email, name: String(user.user_metadata?.name || user.email).slice(0, 80), exp: Date.now() + 7 * 86400000 };
  const response = NextResponse.json({ signedIn: true }, { headers });
  response.cookies.set(sessionCookie, signValue(account, config.secret), { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
  return response;
}

export async function POST(request: Request) {
  const config = sessionConfig();
  if (!config || request.headers.get('origin') !== config.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403, headers });
  if (!emailAuthConfig()) return NextResponse.json({ error: 'Email accounts are not available yet. Please try again later.' }, { status: 503, headers });
  try {
    const raw = await request.text();
    if (raw.length > 8192) throw new EmailAuthError('Request is too large.', 413);
    let body;
    try { body = JSON.parse(raw); } catch { throw new EmailAuthError('Please submit a valid form.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new EmailAuthError('Please submit a valid form.');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new EmailAuthError('Enter a valid email address.');
    if (['signup', 'signin', 'reset'].includes(body.action) && (!password || password.length > 128 || (body.action !== 'signin' && password.length < 8))) throw new EmailAuthError('Use a password between 8 and 128 characters.');
    if (['verify', 'reset'].includes(body.action) && !/^\d{6,10}$/.test(code)) throw new EmailAuthError('Enter the verification code from your email.');

    switch (body.action) {
      case 'signup': {
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
        if (!name) throw new EmailAuthError('Enter your name.');
        const result = await emailAuthRequest('signup', { email, password, data: { name } });
        // Honour projects with confirmation disabled, although verification is recommended.
        if (result.access_token) return signedIn(result);
        return NextResponse.json({ verificationRequired: true, message: 'Check your email for a verification code. If you already have an account, sign in or reset your password.' }, { headers });
      }
      case 'signin': return signedIn(await emailAuthRequest('token?grant_type=password', { email, password }));
      case 'verify': return signedIn(await emailAuthRequest('verify', { email, token: code, type: 'signup' }));
      case 'resend':
        await emailAuthRequest('resend', { email, type: 'signup' });
        return NextResponse.json({ message: 'If this account needs verification, a new code will arrive shortly. Check your spam folder too.' }, { headers });
      case 'recover':
        await emailAuthRequest('recover', { email });
        return NextResponse.json({ message: 'If an email/password account exists for this address, you will receive a password reset code.' }, { headers });
      case 'reset': {
        const result = await emailAuthRequest('verify', { email, token: code, type: 'recovery' });
        if (!result.access_token) throw new EmailAuthError('Please request another password reset code.');
        await emailAuthRequest('user', { password }, result.access_token);
        // Require a fresh password sign-in rather than issuing another long-lived app session.
        return NextResponse.json({ passwordReset: true, message: 'Password updated. Sign in with your new password.' }, { headers });
      }
      default: throw new EmailAuthError('Choose a valid account action.');
    }
  } catch (error) {
    const known = error instanceof EmailAuthError;
    return NextResponse.json({ error: known ? error.message : 'The account service is unavailable. Please try again shortly.' }, { status: known ? error.status : 503, headers });
  }
}
