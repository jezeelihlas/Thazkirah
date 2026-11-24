import { NextResponse } from 'next/server';
import { adminCookie, sameOrigin } from '../../../../lib/admin';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'strict', secure: process.env.APP_URL?.startsWith('https:') });
  return response;
}
