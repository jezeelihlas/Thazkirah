// Server only: never import this module into a client component.
export function databaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export async function database<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!databaseConfigured()) throw Error('Database is not configured.');
  const response = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { apikey: process.env.SUPABASE_SECRET_KEY!, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) throw Error('Database request failed. Check the database configuration and migration.');
  const body = await response.text();
  return (body ? JSON.parse(body) : null) as T;
}

export type CloudState = { user_id: string; email: string; name: string; records: Record<string, unknown>; preferences: Record<string, unknown>; version: number; updated_at: string };
