import { isAdmin } from '../../../../lib/admin';
import { database, type CloudState } from '../../../../lib/database';
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!await isAdmin()) return Response.json({ error: 'Admin login required.' }, { status: 401, headers });
  try {
    const id = new URL(request.url).searchParams.get('id');
    const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset')) || 0);
    const rows = await database<CloudState[]>(id
      ? `practice_accounts?user_id=eq.${encodeURIComponent(id)}&select=*`
      : `practice_accounts?select=user_id,email,name,updated_at&order=updated_at.desc,user_id.asc&limit=50&offset=${Math.floor(offset)}`);
    return Response.json({ users: rows }, { headers });
  } catch { return Response.json({ error: 'Could not load users. Check Supabase configuration.' }, { status: 503, headers }); }
}
