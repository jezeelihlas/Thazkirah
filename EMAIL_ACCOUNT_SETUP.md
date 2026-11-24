# Email accounts and verification codes

Profile now offers Sign in, Sign up, and Continue with Google. Email/password accounts use Supabase Auth; existing Google login and Google history IDs are preserved. Passwords are managed by Supabase, never stored in practice records or browser storage.

## Configure locally and on Vercel

1. In your existing Supabase project, enable the Email provider and new user sign-ups under Authentication. Enable **Confirm email** and set a minimum password length of at least 8 characters.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env.local` and Vercel's environment settings. Use the project's publishable key (or legacy anon key) for this new Auth variable, never the secret/service-role key. Keep the existing `SUPABASE_SECRET_KEY` for cloud history. The Auth key is kept on the server by this app.
3. Keep `APP_URL` set to the exact website origin and `AUTH_SECRET` to at least 32 random characters. Email sessions work independently of Google credentials. Continue with Google still needs the existing Google setup.
4. In Authentication's email templates, update **Confirm signup** and **Reset password** to show `{{ .Token }}`. The app uses typed codes, not the default confirmation-link flow. See templates below. Configure the site URL to your production origin.
5. Configure custom SMTP in Supabase for real users. Choose an email sender such as Resend, verify a domain you control using its DNS instructions, and copy the sender's SMTP credentials into Supabase's SMTP settings. Do not paste these credentials into source code. Disable link tracking for authentication emails.
6. Review Supabase Auth rate limits for sign-up, verification, password recovery and emails. The UI provides a 60-second resend delay; provider limits enforce actual server-side limits. Tune these for your expected traffic.
7. Restart local development or redeploy Vercel after environment changes.

The UI detects whether the required variables exist; this does not prove SMTP delivery or provider settings are correct.

## Confirm signup template

Subject: Verify your Thazkirah email

```html
<h2>Welcome to Thazkirah</h2>
<p>Enter this verification code in the Profile screen:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Use the most recent code. Never share it with anyone.</p>
<p>If you did not request an account, you can ignore this email.</p>
```

## Reset password template

Subject: Reset your Thazkirah password

```html
<h2>Reset your password</h2>
<p>Enter this code in Thazkirah to choose a new password:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>If you did not request this, ignore this email. Your password stays unchanged.</p>
```

OTP expiration follows your Supabase configuration. The interface accepts 6–10 digit codes. Resend and recovery confirmations do not reveal whether an address is registered.

## User flows

- Sign up: name, email, password, confirmation → email code → verified signed-in account.
- Sign in: email and password → signed-in account. An unverified user can choose Sign up → Already have a code? to verify/resend without creating another account.
- Forgot password: email → reset code and new password → return to Sign in.
- Continue with Google: uses the existing Google flow from either account tab.
- Cloud history remains an explicit opt-in after login. The existing progress table accepts either provider's stable ID; no new database migration is needed for email accounts.

Existing Google accounts and new email accounts remain separate, even with the same email. History is not automatically merged between login methods. Use the same method on each device. Supabase email accounts use separate browser backup keys to avoid collisions with Google history.

The application uses signed, HTTP-only seven-day sessions. Password reset changes the Supabase password but does not revoke already issued application cookies on other devices; those expire after seven days. Global application-session revocation is not implemented. Sign out on shared devices.

## Email cost (checked 11 November 2026)

- Supabase's default email sender is for testing, currently limited to project-team addresses and 2 messages per hour. It is unsuitable for public registration.
- Resend currently offers 3,000 emails/month free, with a 100-email/day limit. Verification, resend and reset emails each consume quota. Paid plans apply when more capacity is needed. A sender domain can have its own registration/renewal cost.
- Supabase currently includes 50,000 monthly active users on its Free plan. Auth usage and SMTP email allowances are different limits.

Sources: https://supabase.com/docs/guides/auth/auth-smtp, https://supabase.com/docs/guides/auth/auth-email-templates, https://supabase.com/pricing, https://resend.com/pricing

## Verify before publishing

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:integration`. Automated tests use a fake local Auth service, not live emails. Then test a real signup, incorrect/expired code, resend, sign-in, sign-out, password recovery, and cloud history on two devices. Confirm Google login still opens correctly. Local changes do not publish until deployed.
