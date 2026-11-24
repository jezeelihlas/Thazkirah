import { getAccount } from '../../../lib/auth';
import { sameOrigin } from '../../../lib/admin';
import { database, databaseConfigured, type CloudState } from '../../../lib/database';
import { sanitiseDayRecord } from '../../../lib/practice';

const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  const account = await getAccount();
  if (!account) return Response.json({ error: 'Sign in first to access cloud history.' }, { status: 401, headers });
  if (!databaseConfigured()) return Response.json({ configured: false }, { headers });
  try {
    const rows = await database<CloudState[]>(`practice_accounts?user_id=eq.${encodeURIComponent(account.id)}&select=*`);
    return Response.json({ configured: true, state: rows[0] || null }, { headers });
  } catch { return Response.json({ error: 'Cloud history is unavailable. Your browser copy is preserved.' }, { status: 503, headers }); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  const account = await getAccount();
  if (!account) return Response.json({ error: 'Sign in first.' }, { status: 401, headers });
  try {
    const raw = await request.text();
    if (raw.length > 2000000) return Response.json({ error: 'History is too large.' }, { status: 413, headers });
    const body = JSON.parse(raw);
    if (!Number.isSafeInteger(body.version) || body.version < 0 || !body.records || Array.isArray(body.records) || typeof body.records !== 'object' || !body.preferences || Array.isArray(body.preferences) || typeof body.preferences !== 'object') return Response.json({ error: 'Invalid history.' }, { status: 400, headers });
    const records: Record<string, unknown> = {};
    for (const [date, day] of Object.entries(body.records)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || !day || typeof day !== 'object' || Array.isArray(day)) return Response.json({ error: 'Invalid day.' }, { status: 400, headers });
      records[date] = sanitiseDayRecord(day);
    }
    const rows = await database<CloudState[]>('rpc/save_practice_account', { method: 'POST', body: JSON.stringify({ p_user_id: account.id, p_email: account.email, p_name: account.name, p_records: records, p_preferences: body.preferences, p_version: body.version }) });
    if (!rows.length) return Response.json({ error: 'Another device saved newer history. Download your changes, then reload cloud history.' }, { status: 409, headers });
    return Response.json({ version: rows[0].version }, { headers });
  } catch { return Response.json({ error: 'Could not save cloud history. Your browser copy is preserved.' }, { status: 503, headers }); }
}
