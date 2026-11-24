import { scryptSync, timingSafeEqual } from 'node:crypto';

export function verifyAdminPassword(password: string, encoded: string) {
  const [format, salt, hash] = encoded.split(':');
  if (format !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '') || password.length > 256) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
