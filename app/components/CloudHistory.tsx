'use client';

import { useEffect, useRef, useState } from 'react';
import type { Records } from '../../lib/practice';

type Snapshot = { records: Records; preferences: Record<string, unknown> };
type Props = Snapshot & { ready: boolean; apply: (state: Snapshot) => void; onOwner: (id: string) => void; onLoading: (value: boolean) => void };

export default function CloudHistory({ records, preferences, ready, apply, onOwner, onLoading }: Props) {
  const [account, setAccount] = useState<{ email: string; name: string } | null>(null);
  const [configured, setConfigured] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Checking cloud history…');
  const [consent, setConsent] = useState(false);
  const [failed, setFailed] = useState(false);
  const version = useRef(0);
  const baseline = useRef('');
  const current = useRef<Snapshot>({ records, preferences });
  current.current = { records, preferences };
  const saving = useRef(false);
  const booted = useRef(false);
  const owner = useRef('');

  async function load(discardPending = false) {
    onLoading(true); setBusy(true); setMessage('Loading cloud history…'); setActive(false);
    try {
      const session = await fetch('/api/auth/session', { cache: 'no-store', signal: AbortSignal.timeout(20000) }).then(r => r.json());
      setAccount(session.account);
      if (!session.account) { setMessage('Sign in through Profile to save history online.'); return; }
      const response = await fetch('/api/progress', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setConfigured(body.configured);
      if (!body.configured) { setMessage('Cloud history is not configured yet. Changes remain on this device.'); return; }
      owner.current = session.storageKey || session.account.email;
      if (body.state) {
        const snapshot = { records: body.state.records, preferences: body.state.preferences };
        baseline.current = JSON.stringify(snapshot); version.current = body.state.version;
        const pendingKey = `thazkirah-pending:${owner.current}`;
        if (discardPending) localStorage.removeItem(pendingKey);
        const pending = JSON.parse(localStorage.getItem(pendingKey) || 'null');
        onOwner(owner.current); apply(pending?.snapshot || snapshot);
        if (pending && pending.version !== body.state.version) {
          setFailed(true); setMessage('Another device saved newer history. Your unsaved device copy is shown. Download a backup, then reload cloud history.'); return;
        }
        setActive(true); setFailed(false);
        setMessage('History loaded. Changes save online automatically.');
      } else { version.current = 0; setFailed(false); setMessage('Enable cloud saving for this account.'); }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Cloud history is unavailable.'); setFailed(true); }
    finally { setBusy(false); onLoading(false); }
  }

  useEffect(() => { if (ready && !booted.current) { booted.current = true; void load(); } }, [ready]);

  async function save(snapshot: Snapshot, first = false) {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try {
      const response = await fetch('/api/progress', { method: 'PUT', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...snapshot, version: version.current }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      version.current = body.version; baseline.current = JSON.stringify(snapshot);
      if (JSON.stringify(current.current) === baseline.current) localStorage.removeItem(`thazkirah-pending:${owner.current}`);
      if (first) { onOwner(owner.current); apply(snapshot); setActive(true); }
      setMessage('Saved online.'); setFailed(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Save failed.'); setFailed(true); }
    finally { saving.current = false; setBusy(false); }
  }

  useEffect(() => {
    if (!active || baseline.current === JSON.stringify(current.current)) return;
    try { localStorage.setItem(`thazkirah-pending:${owner.current}`, JSON.stringify({ version: version.current, snapshot: current.current })); }
    catch { setMessage('Browser backup unavailable. Keep this page open until the online save finishes.'); }
    if (failed || busy) return;
    const timer = setTimeout(() => void save(current.current), 1000);
    return () => clearTimeout(timer);
  }, [records, preferences, active, failed, busy]);

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(current.current, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'thazkirah-history-backup.json'; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="panel cloud-history" style={{ padding: '16px', margin: '16px 0' }} aria-label="Cloud history"><strong>Cloud history{account ? ` · ${account.email}` : ''}</strong><p role="status">{busy ? 'Syncing… Please keep this page open.' : message}</p>
    {configured && !active && !failed && account && <><p>With cloud saving enabled, the site administrator can view your habit history and notes. Only enable this if you agree.</p><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to cloud saving and administrator access.</label><p><button className="outline-button" disabled={!consent || busy} onClick={() => void save(current.current, true)}>Enable and import this device’s history</button></p></>}
    <button className="text-button" onClick={download}>Download history backup</button>{!busy && <button className="text-button" onClick={() => { if ((!active && !failed) || confirm('Discard unsaved changes and reload cloud history? Download a backup first.')) void load(true); }}>Reload cloud history</button>}
  </section>;
}
