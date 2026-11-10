import { NextResponse } from 'next/server';
import { authConfig, sessionCookie } from '../../../../lib/auth';

export async function POST(request: Request) {
  const config = authConfig();
  const origin = config?.origin || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(sessionCookie, '', { httpOnly: true, secure: config?.secure, sameSite: 'lax', path: '/', maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
