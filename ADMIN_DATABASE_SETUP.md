# Admin dashboard and cloud history

The website runs on Vercel. Supabase stores each consenting Google user's records and preferences. It is needed even with two users if the administrator needs to see their history. Local browser history is not visible to the administrator until imported. Google login itself does not create database records.

## Connect Supabase

1. Create a Supabase project at https://supabase.com/dashboard and keep its database password private.
2. Open SQL Editor, paste `supabase/migrations/001_cloud_history.sql`, and run it once.
3. Find the project URL in the project's Connect dialog and the secret API key in Settings → API Keys. Use a new `sb_secret_...` key, not a publishable or anon key.
4. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to `.env.local` for local use and Vercel → project → Environment Variables → Production for the hosted site. Never put the secret in frontend variables, screenshots, GitHub, or chat. Server routes keep this key private. RLS is enabled without browser policies, and public roles have no table privileges. Access is checked in the Next.js server using signed Google or admin sessions.
5. Also configure Vercel Production `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` and `APP_URL=https://thazkirah.jezeelikhlas.dev`. The Google Web client's authorized redirect URI must be `https://thazkirah.jezeelikhlas.dev/api/auth/google/callback`.

## Administrator account

Run `node scripts/setup-admin.mjs your-email@example.com` from the project folder to generate or rotate an account. A generated account is already stored privately in `.env.admin-credentials`. It is ignored by Git along with `.env.local`. The identifier does not create an email mailbox.

Copy `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` from `.env.local` into Vercel Production. The actual password is only in the private credential file; do not enter it as an environment variable. Admin sessions expire after one hour. Password hashes are checked on the server. Login attempts are limited in Supabase across server instances. Rotating `AUTH_SECRET` signs everyone out, including admins.

Open `/admin` to sign in. The admin can page through users, select a user, view 7/30-day graphs, activity totals, saved dates and notes. History is read-only to preserve the user's own records. Only users who enabled cloud history appear; this is not a directory of everyone who ever used Google login.

## Import existing history

Each user must open the same browser and domain containing their old history, sign in with Google, and choose **Enable and import this device's history** after reading the administrator access notice. Localhost and the hosted domain have separate storage. Old localhost data does not automatically appear on the deployed site. Use **Download history backup** before changing devices or domains. Existing cloud accounts load their saved history instead of importing unrelated guest data. Edits save after a short delay; wait for **Saved online** before closing. Failed saves keep a browser backup. Concurrent edits on another device cause a conflict rather than overwriting newer history; download a backup before reloading the cloud version. This release does not merge simultaneous edits automatically or provide a backup-file upload tool.

## Publish updates

Local edits do not change production until committed and pushed to the GitHub branch connected to Vercel. Vercel then builds and deploys the change. Environment variable changes require a redeployment. Run the SQL migration and set all production variables before deploying this feature. Subsequent ordinary UI deployments preserve Supabase data; do not delete the project or table. Arrange database exports/backups separately.

## Verification boundaries

Local unit and integration checks use test credentials and do not prove a real Supabase project or Google login is configured. After deployment, sign in as each of the two users, import their own records, save a past date, reload on another device, and confirm `/admin` shows the correct separate histories. An ordinary signed-in user must not be able to fetch `/api/admin/users`.
