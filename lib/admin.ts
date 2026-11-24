import { cookies } from 'next/headers';
import { verifyValue } from './auth-session';

export const adminCookie = 'thazkirah-admin';
export function adminConfigured() {
  return !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
}
export async function isAdmin() {
  if (!adminConfigured()) return false;
  const session = verifyValue<{ email: string; role: string; exp: number }>((await cookies()).get(adminCookie)?.value, process.env.AUTH_SECRET!);
  return session?.role === 'admin' && session.email === process.env.ADMIN_EMAIL;
}
export function sameOrigin(request: Request) {
  try { return request.headers.get('origin') === new URL(process.env.APP_URL || request.url).origin; }
  catch { return false; }
}
