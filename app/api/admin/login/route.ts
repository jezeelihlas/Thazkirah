import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminConfigured, adminCookie, sameOrigin } from '../../../../lib/admin';
import { verifyAdminPassword } from '../../../../lib/admin-password';
import { signValue } from '../../../../lib/auth-session';
import { database } from '../../../../lib/database';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  if (!adminConfigured()) return Response.json({ error: 'Admin login is not configured yet.' }, { status: 503 });
  try {
    const text = await request.text();
    if (text.length > 2000) return Response.json({ error: 'Invalid credentials.' }, { status: 400 });
    const body = JSON.parse(text);
    // Vercel supplies this header. Hash addresses rather than storing them.
    const ip = request.headers.get('x-vercel-forwarded-for') || 'shared';
    const bucket = createHmac('sha256', process.env.AUTH_SECRET!).update(ip).digest('hex');
    const allowed = await database<boolean>('rpc/allow_admin_login', { method: 'POST', body: JSON.stringify({ p_bucket: bucket }) });
    if (!allowed) return Response.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    const valid = typeof body.password === 'string' && verifyAdminPassword(body.password, process.env.ADMIN_PASSWORD_HASH!);
    if (!valid || typeof body.email !== 'string' || body.email.toLowerCase().trim() !== process.env.ADMIN_EMAIL!.toLowerCase()) return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie, signValue({ email: process.env.ADMIN_EMAIL, role: 'admin', exp: Date.now() + 3600000 }, process.env.AUTH_SECRET!), { httpOnly: true, secure: process.env.APP_URL?.startsWith('https:'), sameSite: 'strict', path: '/', maxAge: 3600 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch { return Response.json({ error: 'Admin login unavailable. Configure Supabase and run the database migration.' }, { status: 503 }); }
}
