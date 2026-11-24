import { authConfig, getAccount } from '../../../../lib/auth';
import { emailAuthConfig } from '../../../../lib/email-auth';

export async function GET() {
  const account = await getAccount();
  return Response.json({ configured: !!authConfig(), emailConfigured: !!emailAuthConfig(), storageKey: account ? (account.id.startsWith('supabase:') ? account.id : account.email) : null, account: account ? { name: account.name, email: account.email } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
