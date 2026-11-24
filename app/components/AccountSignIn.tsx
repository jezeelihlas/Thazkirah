'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck, UserRound } from 'lucide-react';

type Step = 'signin' | 'signup' | 'verify' | 'recover' | 'reset';
const headings: Record<Step, string> = { signin: 'Welcome back.', signup: 'Begin your daily journey.', verify: 'Check your inbox.', recover: 'Forgot your password?', reset: 'Choose a new password.' };

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z" /></svg>;
}

export default function AccountSignIn() {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const locked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (new URLSearchParams(window.location.search).get('auth') === 'failed') setError('Google sign-in was cancelled or could not be completed. Please try again.');
    fetch('/api/auth/session', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(data => { setAccount(data.account); setGoogleConfigured(data.configured); setEmailConfigured(data.emailConfigured); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not check your account. Reopen Profile to try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function changeStep(next: Step) {
    setStep(next); setError(''); setMessage(''); setPassword(''); setConfirmation(''); setCode(''); setVisible(false);
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function requestAction(action: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/auth/email', { method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name, email, password, code }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Something went wrong. Please try again.');
      if (data.signedIn) { window.location.assign('/?view=profile'); return; }
      if (data.verificationRequired) { changeStep('verify'); setCooldown(60); }
      if (action === 'recover') { changeStep('reset'); setCooldown(60); }
      if (action === 'resend') setCooldown(60);
      if (data.passwordReset) changeStep('signin');
      setMessage(data.message || 'Please check your email.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not connect. Please try again.'); }
    finally { locked.current = false; setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((step === 'signup' || step === 'reset') && password !== confirmation) { setError('Your passwords do not match.'); return; }
    void requestAction(step);
  }

  async function signOut() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error('Could not sign out. Please try again.');
      window.location.assign('/?view=profile');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); }
    finally { locked.current = false; setBusy(false); }
  }

  const passwordField = step === 'signin' || step === 'signup' || step === 'reset';
  const codeField = step === 'verify' || step === 'reset';
  const mainStep = step === 'signin' || step === 'signup';

  return <section className="account-card auth-card" aria-labelledby="account-title" aria-busy={loading || busy}>
    <div className="auth-eyebrow"><ShieldCheck size={16} /><span>YOUR THAZKIRAH ACCOUNT</span></div>
    {loading ? <p className="auth-loading" role="status"><LoaderCircle className="auth-spinner" size={18} />Checking your account…</p>
      : account ? <>
        <h3 id="account-title">A little consistency, every day.</h3>
        <div className="signed-in-account"><span className="auth-avatar"><UserRound size={25} /></span><div><strong>{account.name}</strong><span>{account.email}</span></div><CheckCircle2 size={19} className="auth-account-check" aria-label="Signed in" /></div>
        <button className="outline-button" disabled={busy} onClick={signOut}>{busy ? 'Signing out…' : 'Sign out'}</button>
      </> : <>
        <div className="auth-tabs" aria-label="Account options">
          <button type="button" aria-pressed={step === 'signin' || step === 'recover' || step === 'reset'} disabled={busy} onClick={() => changeStep('signin')}>Sign in</button>
          <button type="button" aria-pressed={step === 'signup' || step === 'verify'} disabled={busy} onClick={() => changeStep('signup')}>Sign up</button>
        </div>
        <h3 id="account-title" ref={heading} tabIndex={-1}>{headings[step]}</h3>
        <p className="auth-description">{step === 'signin' ? 'Sign in to your account and continue your daily practice.' : step === 'signup' ? 'Create an account with your email, or continue with Google.' : step === 'verify' ? `Enter the code sent to ${email || 'your email address'} to verify your account.` : step === 'recover' ? 'Enter your account email. We’ll send a code to help you reset your password.' : `Enter the reset code sent to ${email || 'your email address'}, then choose a new password.`}</p>
        {mainStep && <><button className="google-sign-in" disabled={busy || !googleConfigured} onClick={() => { locked.current = true; setBusy(true); window.location.assign('/api/auth/google'); }}><GoogleMark />Continue with Google</button>
          {!googleConfigured && <p className="account-notice">Google sign-in is currently unavailable.</p>}
          <div className="auth-divider"><span>or use your email</span></div></>}
        <form className="auth-form" onSubmit={submit}>
          <fieldset disabled={busy || !emailConfigured}>
            {step === 'signup' && <label htmlFor="auth-name">Your name<input id="auth-name" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="What should we call you?" required /></label>}
            <label htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} maxLength={254} placeholder="you@example.com" required readOnly={codeField} /></label>
            {codeField && <label htmlFor="auth-code">Verification code<input id="auth-code" className="auth-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter your code" required aria-describedby="auth-code-help" /><small id="auth-code-help">Check your inbox and spam folder. Use the most recent code.</small></label>}
            {passwordField && <label htmlFor="auth-password">{step === 'reset' ? 'New password' : 'Password'}<span className="auth-password-wrap"><input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete={step === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={step === 'signin' ? 1 : 8} maxLength={128} placeholder={step === 'signin' ? 'Enter your password' : 'At least 8 characters'} required aria-describedby={step === 'signin' ? undefined : 'auth-password-help'} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{step !== 'signin' && <small id="auth-password-help">Use at least 8 characters. A longer, unique password is best.</small>}</label>}
            {(step === 'signup' || step === 'reset') && <label htmlFor="auth-confirm">Confirm password<input id="auth-confirm" name="confirmation" type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} minLength={8} maxLength={128} placeholder="Enter your password again" required /></label>}
            {step === 'signin' && <button type="button" className="text-button auth-forgot" onClick={() => changeStep('recover')}>Forgot password?</button>}
            <button className="primary-button auth-submit" type="submit">{busy && <LoaderCircle size={16} className="auth-spinner" />}{busy ? 'Please wait…' : step === 'signin' ? 'Sign in' : step === 'signup' ? 'Create account' : step === 'verify' ? 'Verify email & sign in' : step === 'recover' ? 'Send reset code' : 'Update password'}</button>
          </fieldset>
        </form>
        {!emailConfigured && <p className="account-notice"><Mail size={16} />Email sign-in and sign-up are not available yet. You can continue with Google when available.</p>}
        {codeField && <div className="auth-step-actions"><button className="text-button" disabled={busy || !emailConfigured || cooldown > 0} onClick={() => void requestAction(step === 'verify' ? 'resend' : 'recover')}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button><button className="text-button" disabled={busy} onClick={() => changeStep(step === 'verify' ? 'signup' : 'recover')}>Change email</button></div>}
        {step === 'signup' && <button className="text-button" disabled={busy || !emailConfigured} onClick={() => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter your email address above first.'); return; } changeStep('verify'); }}>Already have a code? Verify your email</button>}
        {!mainStep && <button className="text-button" disabled={busy} onClick={() => changeStep('signin')}><ArrowLeft size={14} />Back to sign in</button>}
      </>}
    {message && <p className="auth-message" role="status"><CheckCircle2 size={17} /><span>{message}</span></p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!loading && <p className="account-local-note">Your progress stays on this device until you enable Cloud history. Cloud saving is optional and includes administrator access to your saved habits and notes.</p>}
  </section>;
}
