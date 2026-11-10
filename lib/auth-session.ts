import { createHmac, timingSafeEqual } from 'node:crypto';

export function signValue(value: object, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function verifyValue<T extends { exp: number }>(token: string | undefined, secret: string): T | null {
  if (!token || !secret) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return value && typeof value.exp === 'number' && value.exp > Date.now() ? value as T : null;
  } catch { return null; }
}
