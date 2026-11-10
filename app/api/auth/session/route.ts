import { authConfig, getAccount } from '../../../../lib/auth';

export async function GET() {
  const account = await getAccount();
  return Response.json({ configured: !!authConfig(), account: account ? { name: account.name, email: account.email } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
