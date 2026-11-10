import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { authConfig, flowCookie, googleClient, sessionCookie, type AuthFlow } from '../../../../../lib/auth';
import { signValue, verifyValue } from '../../../../../lib/auth-session';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const config = authConfig();
  const origin = config?.origin || new URL(request.url).origin;
  const failure = () => {
    const response = NextResponse.redirect(`${origin}/?view=profile&auth=failed`);
    response.cookies.set(flowCookie, '', { path: '/api/auth/google', maxAge: 0 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
  if (!config) return failure();
  const params = new URL(request.url).searchParams;
  const flow = verifyValue<AuthFlow>((await cookies()).get(flowCookie)?.value, config.secret);
  const code = params.get('code');
  if (!flow || !code || params.get('error') || params.get('state') !== flow.state) return failure();
  try {
    const client = googleClient(config);
    const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier });
    if (!tokens.id_token) return failure();
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
    const user = ticket.getPayload();
    if (!user?.sub || !user.email || !user.email_verified || (user as unknown as { nonce?: string }).nonce !== flow.nonce) return failure();
    const account = { id: user.sub, email: user.email, name: user.name || user.email, exp: Date.now() + 7 * 86400000 };
    const response = NextResponse.redirect(`${config.origin}/?view=profile&auth=success`);
    response.cookies.set(sessionCookie, signValue(account, config.secret), { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    response.cookies.set(flowCookie, '', { path: '/api/auth/google', maxAge: 0 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch { return failure(); }
}
