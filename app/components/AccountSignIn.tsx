'use client';

import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

export default function AccountSignIn() {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'failed') setError('Google sign-in was cancelled or could not be completed. Please try again.');
    fetch('/api/auth/session', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(data => { setAccount(data.account); setConfigured(data.configured); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not check your account. Reopen Profile to try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const signOut = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      if (!response.ok) throw Error();
      setAccount(null);
    } catch { setError('Could not sign out. Please try again.'); }
    finally { setLoading(false); }
  };

  return <section className="account-card" aria-labelledby="account-title"><h3 id="account-title">Your account</h3>
    {account ? <><div className="signed-in-account"><UserRound size={24} /><div><strong>{account.name}</strong><span>{account.email}</span></div></div><button className="outline-button" disabled={loading} onClick={signOut}>{loading ? 'Signing out…' : 'Sign out'}</button></>
      : <><p>Sign in with your Google account.</p><button className="google-sign-in" disabled={loading || !configured} onClick={() => { window.location.assign('/api/auth/google'); }}><span aria-hidden="true">G</span>{loading ? 'Checking account…' : 'Continue with Google'}</button>{!loading && !configured && <p className="account-notice">Google sign-in is not available yet.</p>}</>}
    <p className="account-local-note">Your practice history and preferences stay in this browser. Signing in does not sync them across devices.</p>
    {error && <p className="alert" role="alert">{error}</p>}
  </section>;
}
