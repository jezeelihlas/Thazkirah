import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authConfig, flowCookie, googleClient } from '../../../../lib/auth';
import { signValue } from '../../../../lib/auth-session';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const config = authConfig();
  if (!config) return NextResponse.redirect(new URL('/?view=profile&auth=unconfigured', request.url));
  const flow = { state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'), verifier: randomBytes(48).toString('base64url'), exp: Date.now() + 10 * 60 * 1000 };
  const client = googleClient(config);
  const url = new URL(client.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state: flow.state, prompt: 'select_account' }));
  url.searchParams.set('nonce', flow.nonce);
  url.searchParams.set('code_challenge', createHash('sha256').update(flow.verifier).digest('base64url'));
  url.searchParams.set('code_challenge_method', 'S256');
  const response = NextResponse.redirect(url);
  response.cookies.set(flowCookie, signValue(flow, config.secret), { httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/api/auth/google', maxAge: 600 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
