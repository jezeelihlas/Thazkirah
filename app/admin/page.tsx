'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Cloud, Eye, EyeOff, House, LoaderCircle, LockKeyhole, LogOut, Moon, RefreshCw, ShieldCheck, Sun, Users, UserRound } from 'lucide-react';
import History from '../components/History';
import { practiceCatalog, sanitisePractice, sriLankaDate, type Records, type Practice } from '../../lib/practice';
import './admin.css';

type User = { user_id: string; name: string; email: string; updated_at: string; records?: Records; preferences?: { routine?: unknown[]; archived?: unknown[] } };
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState('');
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(false);
  async function load(start = offset, id?: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/users?${new URLSearchParams(id ? { id } : { offset: String(start) })}`, { cache: 'no-store' });
      if (response.status === 401) { setLoggedIn(false); setUsers([]); setSelected(null); return; }
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setLoggedIn(true);
      if (id) { setSelected(body.users[0] || null); setDay(''); }
      else { setUsers(body.users); setOffset(start); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    void load(0).finally(() => setChecking(false));
    let theme = 'light';
    try { theme = JSON.parse(localStorage.getItem('thazkirah-preferences-v2') || '{}').theme || 'light'; } catch {}
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const next = theme === 'dark' || (theme === 'system' && media.matches); setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.dataset.theme = next ? 'dark' : 'light'; }
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw Error('Could not sign out. Please try again.');
      setLoggedIn(false); setSelected(null); setUsers([]); setDay('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  }
  const practices = (values?: unknown[]) => values?.map(sanitisePractice).filter((p): p is Practice => !!p);
  return <div className="app-shell admin-app">
    <header className="topbar"><nav aria-label="Administration navigation">
      <a className="wordmark" href="/" aria-label="Thazkirah home"><Moon size={28} /><span className="brand-copy"><span className="brand-title">Thazkirah<small lang="ar" dir="rtl">تَذْكِرَة</small></span><em>Towards Allah, one day at a time.</em></span></a>
      <a className="top-link" href="/"><House size={17} />Home</a><span className="top-link active admin-nav-label"><ShieldCheck size={17} />Administration</span>
      {loggedIn && <button className="top-link" disabled={busy} onClick={() => void logout()}><LogOut size={17} />Sign out</button>}
      <button className="admin-theme" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
    </nav></header>
    <main className="admin-shell">
    <div className="admin-intro"><div><span className="overline">A SPACE FOR CARE & CONSISTENCY</span><h1>{loggedIn ? 'Every journey matters.' : 'A thoughtful space to oversee.'}</h1><p>{loggedIn ? 'A gentle overview of the daily practices shared with you.' : 'Sign in to view the journeys your community has chosen to share.'}</p></div><span className="admin-private"><ShieldCheck size={15} />Administrator access</span></div>
    {error && <p role="alert" className="alert admin-error">{error}</p>}
    {checking ? <div className="panel admin-checking" role="status"><LoaderCircle size={20} className="auth-spinner" />Checking your session…</div> : !loggedIn ? <div className="admin-login-layout"><aside className="admin-welcome"><span className="admin-welcome-icon"><Moon size={29} /></span><span className="overline">WITH INTENTION. WITH CARE.</span><h2>Small acts.<br /> Meaningful journeys.</h2><p>A quiet place to support consistency, celebrate effort, and understand each person’s progress.</p><div className="admin-welcome-ar" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div><span className="admin-welcome-note"><LockKeyhole size={15} />Only history shared with consent is visible.</span></aside><form className="panel admin-login" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        setPassword(''); await load(0);
      } catch (e) { setError(e instanceof Error ? e.message : 'Login failed.'); }
      finally { setBusy(false); }
    }}><span className="admin-form-icon"><ShieldCheck size={25} /></span><div><span className="overline">WELCOME BACK</span><h2>Administrator sign in</h2><p>Enter your credentials to continue.</p></div><label>Email address<input required type="email" autoComplete="username" placeholder="Your administrator email" disabled={busy} value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<span className="admin-password"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" disabled={busy} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle size={17} className="auth-spinner" /> : <ArrowRight size={17} />}{busy ? 'Signing in…' : 'Sign in'}</button><span className="admin-login-note"><LockKeyhole size={13} />Private access for the site administrator.</span></form></div>
      : <>
        <div className="admin-overview"><div className="panel admin-metric"><span className="admin-metric-icon"><Users size={21} /></span><div><strong>{users.length}{users.length === 50 ? '+' : ''}</strong><span>Users on this page</span></div></div><div className="panel admin-metric"><span className="admin-metric-icon"><Cloud size={21} /></span><div><strong>Cloud history</strong><span>Shared with permission</span></div></div><div className="panel admin-metric"><span className="admin-metric-icon"><ShieldCheck size={21} /></span><div><strong>View only</strong><span>Personal records stay protected</span></div></div></div>
        <section className="panel admin-users" aria-busy={busy}><div className="admin-section-heading"><div><span className="overline">YOUR COMMUNITY</span><h2>Shared journeys</h2><p>View the history users have chosen to save online.</p></div><button className="outline-button" disabled={busy} onClick={() => void load()}><RefreshCw size={15} className={busy ? 'auth-spinner' : ''} />{busy ? 'Refreshing…' : 'Refresh users'}</button></div>
        {users.length === 0 && <div className="admin-empty"><span className="admin-empty-icon"><Users size={30} /></span><h3>{offset ? 'No more journeys here.' : 'Every journey begins with a first step.'}</h3><p>{offset ? 'Return to the previous page to view shared histories.' : 'No users have enabled cloud saving yet. When someone signs in and chooses to share their history, they’ll appear here.'}</p><span><Cloud size={14} />Progress appears after Cloud history is enabled.</span></div>}
        <ul>{users.map(user => <li key={user.user_id}><button disabled={busy} aria-pressed={selected?.user_id === user.user_id} onClick={() => void load(offset, user.user_id)}><span className="admin-user-avatar"><UserRound size={21} /></span><span className="admin-user-info"><strong>{user.name || user.email}</strong><span>{user.email}</span><small>Last saved: {new Date(user.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} · Sri Lanka</small></span><ArrowRight size={16} /></button></li>)}</ul>
        <div className="admin-pagination"><span>Page {Math.floor(offset / 50) + 1} · {users.length} {users.length === 1 ? 'user' : 'users'} shown</span><div><button className="outline-button" disabled={busy || offset === 0} onClick={() => void load(Math.max(0, offset - 50))}><ChevronLeft size={15} />Previous</button><button className="outline-button" disabled={busy || users.length < 50} onClick={() => void load(offset + 50)}>Next<ChevronRight size={15} /></button></div></div></section>
      {selected && <section className="admin-history"><div className="admin-section-heading"><div><span className="overline">A CLOSER LOOK</span><h2>{selected.name || selected.email}’s journey</h2><p>{selected.email}</p></div><button className="text-button" onClick={() => { setSelected(null); setDay(''); }}><ArrowLeft size={14} />Close history</button></div><History records={selected.records || {}} routine={practices(selected.preferences?.routine) || practiceCatalog} archived={practices(selected.preferences?.archived) || []} today={sriLankaDate()} openDay={setDay} />{day && <section className="panel admin-day"><span className="overline">DAILY DETAILS</span><h3>{day}</h3><dl>{Object.entries(selected.records?.[day] || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'boolean' ? value ? 'Completed' : 'Not completed' : String(value)}</dd></div>)}</dl></section>}</section>}</>}
    <footer className="admin-footer"><span className="footer-brand">Thazkirah · تَذْكِرَة</span><span>With intention. With remembrance. With peace.</span><small><ShieldCheck size={12} />Private administration</small></footer>
  </main></div>;
}
