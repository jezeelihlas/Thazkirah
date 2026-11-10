# Thazkirah · تَذْكِرَة
Daily Islamic practice app with Arabic and Tamil readings.

## Open in VS Code
1. Install Node.js 22.13 or newer (LTS) from https://nodejs.org.
2. Extract this ZIP. In VS Code choose File > Open Folder > thzkirah.
3. Open Terminal > New Terminal. Run `npm install`, then `npm run dev`.
4. Open http://localhost:3000. Press Ctrl+C in the terminal to stop.
If PowerShell blocks npm.ps1, select Command Prompt as your terminal, or use `npm.cmd install` and `npm.cmd run dev`.

## Edit
- app/page.tsx: ordered routine, prayer tracking, dhikr selection, readings, history, and profile.
- lib/practice.ts: default order, Jamaath/prayed rules, progress, Sri Lankan dates, and cities.
- lib/dhikr.ts: sourced morning/evening adhkar, repetition counts, and concise English meanings.
- app/api/prayer-times/route.ts: exact published Sri Lankan prayer times from ACJU.
- app/globals.css: colours, fonts, responsive layout.
- app/layout.tsx: browser title and description.
- public/data/36.json: complete Yaseen, 83 verses.
- public/data/67.json: complete Mulk, 30 verses.
Save while the dev server runs to see changes. Run `npm run typecheck` and `npm run build` before release. Run `npm start` after building for production locally.

## Data
Daily history is saved in localStorage on the same browser and origin. Google account login is optional; no backend progress database or cross-device sync is included. Localhost and hosted history are separate. Clearing browser data removes progress. The legacy key noor-daily-v1 is preserved for compatibility.
Arabic and Tamil Quran: QuranEnc, Omar Sharif translation. The dhikr library includes 19 sourced entries with Arabic text, concise English meanings, repetition counts, and hadith grading links. It is a curated collection, not an exhaustive catalogue of every authentic narration. Fonts load from Google Fonts with system fallbacks. Basic tracking works without environment variables. Google sign-in requires the configuration below.

## Daily routine
The default order is five daily prayers, Tahajjud, morning dhikr, Yaseen, evening dhikr, Mulk, and total istighfar. Use **Edit routine** to move sections, remove or restore built-in practices, and add personal practices. Removing items preserves their daily records. Profile settings, order, and separate morning/evening dhikr selections are saved under `thazkirah-preferences-v2`.

Selecting Jamaath automatically marks Prayed. Clearing Prayed also clears Jamaath; clearing Jamaath leaves Prayed checked. Each prayer contributes once to progress. Individual selected adhkar can be checked off; completing the whole selected group also completes that period's practice. Istighfar totals are stored separately for each date.

Prayer times appear on Home only and use the exact monthly tables published at https://www.acju.lk/prayer-times/. Colombo is the default. Each selectable city maps to its ACJU district zone, and Profile chooses the published Shafi'i or Hanafi Asr column. Dates roll over in Asia/Colombo. No offsets or AlAdhan estimates are used. The source month PDF is linked beside the schedule. These are the base published table values; apartment-height adjustments in the PDFs are not automatically applied, and mosque Jamaath schedules remain separate. The bundled tables work without contacting ACJU at runtime. Run on a host supporting Next.js API routes.

## Verification
Run `npm test` for tracking, history, and signed-session checks, followed by `npm run typecheck` and `npm run build`. After building, run `npm run test:integration` to test the real authentication routes locally. Integration checks use test-only credentials and never contact Google. A real Google account sign-in still needs your configured OAuth credentials.

## Coding assistant prompt
This is Thzkirah, my Islamic daily practice app. Read README.md and the app files. Help me improve it step by step. Preserve the Arabic Quran text, Tamil meanings, and daily progress. Explain each change.

## Hosting
This is a standalone Next.js project without private Sites credentials or deployment identity. Push it to your own Git repository and deploy with a Next.js-compatible host when ready.

## Appearance and history
The circular button in the navigation opens Light mode, Dark mode, and Device preference. Profile no longer contains appearance settings. The header intention is "Towards Allah, one day at a time."

History includes 7-day and 30-day graphs, daily routine completion, each prayer and practice, and istighfar repetitions. The activity selector includes Jamaath and previously recorded individual dhikr. A dashed column means no saved day. Completion uses the current routine; tracked-day counts use dates with saved records, rather than assuming every missing day was a failure. Open any chart column to revisit that day's full checklist. Archived custom practices retain their data, although their names cannot be recovered if removed before this version.

## Enable Google sign-in
1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client with application type **Web application**. If the consent screen is in testing, add your Google account as a test user.
2. Register `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI. For production, register `https://YOUR-DOMAIN/api/auth/google/callback` as well.
3. Copy `.env.example` to `.env.local`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (at least 32 random characters), and `APP_URL` (your exact origin, with HTTPS in production). Generate the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never commit `.env.local` or paste secrets into chat.
4. Restart the development server, open Profile, and select **Continue with Google**.

The implementation uses Google's authentication library, authorization code flow with PKCE, signed state and nonce validation, verified Google ID tokens, and a signed HTTP-only seven-day session cookie. Logout uses a same-origin POST. Only name and verified email are kept in the session; Google access/refresh tokens are not stored. Signing in identifies the account; progress stays in this browser and does not become an account backup or sync service. Until credentials are configured, Profile clearly shows that Google sign-in is unavailable.

Reference: https://developers.google.com/identity/protocols/oauth2/web-server

## Optional daily habits
Home now suggests Sleep on time, Wake up on time, Duha prayer (Luha), Gym or jogging, Learn the Quran, and Care for your parents. Bedtime and wake-up times begin as editable examples (22:00 and 05:00). Every habit supports an optional planned time; these are daily targets, not alarms or recorded sleep duration. In **Edit routine**, rename habits, reorder them, hide or remove them, show hidden items, restore removed items, and add custom habits with a time. Hidden items are excluded from daily completion totals. Removing or hiding an item keeps its history; removed items are archived with their names and planned times for restoration. New suggestions are added once to existing preferences and stay removed if you remove them later.

The Home page ends with two reminders about kindness to parents. They include Arabic, English and Tamil meanings, and source links: Sunan an-Nasa'i 3104 (Sahih, Darussalam) and Jami' at-Tirmidhi 1899 (Hasan). The mother narration is shown as an excerpt in its context rather than an unattributed slogan.

Every activity now has an editable daily planned time, including prayer check-in, Tahajjud, dhikr, surah reading, istighfar, and custom tasks. These planned times save with preferences and survive hiding, removal, and restoration. The five calculated prayer start times stay separate. Routine cards use simple monochrome outline icons; custom activities use a checklist icon.

## Automatic date and publishing
Home follows the Sri Lankan date (`Asia/Colombo`) and refreshes at midnight and when the browser resumes, regains focus, or restores the page. Home, the brand name, and Today always return to the current date. Selecting another date deliberately pauses this until you return to Today; a visible banner identifies that view. The clock comes from the user's device, so the device date and time should be correct.

This is one Next.js application: React renders the interface, and the `app/api` route handlers provide the backend for prayer times and Google sign-in. The current progress store is the browser's localStorage. It is not a hosted account database, so Google login does not currently provide history sync or backups.

To publish on Vercel, put the project in a GitHub repository, import that repository into Vercel as a Next.js project, and deploy. Vercel can run both this frontend and its API routes; a static-file-only host cannot run the authentication and prayer routes. Configure the variables from `.env.example` in the hosting dashboard, set `APP_URL` to the final site origin, and register that origin's `/api/auth/google/callback` URL in Google Cloud. Do not commit `.env.local`.

You can start with the deployment's `vercel.app` address, then buy an available domain from Vercel or a domain registrar. Add it to the Vercel project's Domains settings and apply the DNS records Vercel specifies at the registrar. Domain names renew separately from hosting; check both initial and renewal prices. Publishing or changing domains does not transfer local browser history from the old origin.

Hosting references: https://vercel.com/docs/frameworks/full-stack/nextjs and https://vercel.com/docs/domains/working-with-domains/add-a-domain

## Google login setup helper
The domain-specific setup is documented in [GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md). `npm run setup:google` prepares the private local environment and preserves the existing session secret. Import a downloaded Web application client with `npm run setup:google -- --origin https://thazkirah.jezeelikhlas.dev --import "C:\path\to\downloaded-client.json"`, then run `npm run check:google`. Neither command displays credentials. Add the same variables to your hosting service and redeploy; local environment files do not update the hosted deployment.

## Routine card layout and reflections
Laptop screens show four habit cards per row; tablets show two and phones show one. Five prayers remain a separate full-width checklist. The new default habit order is wake-up, Tahajjud, Duha, gym/jogging, Quran learning, care for parents, Mulk, Yaseen, and sleep. Morning and evening dhikr follow in a two-column row on laptops and stack on phones. Istighfar remains a separate section after dhikr. Existing saved routines migrate to the new default order once, preserving hidden/removed items and planned times; subsequent custom order is saved.

Drag a card's grip to reorder within its habits or dhikr group. Touch dragging uses the same handle; keyboard users can focus it and press up/down. Edit routine retains arrow controls. Prayer and istighfar sections stay separate. Each non-prayer card includes an optional reason-missed note, saved for the selected date. Notes survive refreshes, hiding, and removal, and can be revisited by opening a saved day. Individual selected dhikr have expandable Arabic and Tamil text directly in each period's card.

Total istighfar now sits immediately before sleep in the default habit grid and can be reordered with the other habits. Existing custom order is preserved while istighfar is moved before sleep once. The parents section includes the full user-requested Arabic narrations, English and Tamil meanings, and an expandable bilingual transmission note for Tirmidhi 1899.

History now uses a single progress explorer with a responsive trend chart and daily selection tiles. Choose Overall routine or an individual activity, Jamaath, or dhikr from the selector. Select a date to inspect its value and saved note, then open its checklist. Missing days are gaps rather than zeroes. Compact activity progress rows replace the many separate bar charts, and all saved dates are in an expandable section.

## ACJU prayer timetable data
`data/acju-prayer-times.json` contains exact rows from all 156 monthly PDFs (13 district zones, 12 months) linked on the official ACJU page. Each source PDF's URL and SHA-256 hash are retained. The printed tables have month/day labels, including 29 February, and no printed year; the app uses them as a recurring month/day schedule. Impossible calendar dates are rejected. Both Asr columns are kept, and no geographical interpolation or minute adjustments are made. The app's original city choices map to the correct district zones, including Negombo in Gampaha and Kalmunai in Ampara.

For future ACJU revisions, refresh the bundled snapshot with `npm run refresh:prayer-times`. This requires Python with pypdf (`python -m pip install pypdf`) for the development-time import, plus internet access. Runtime hosting requires neither Python nor PDF parsing. The importer checks every PDF's zone, month labels, column headings, day count, time format and prayer order, and fails if a source changes unexpectedly. After an interrupted download, run `node scripts/fetch-acju.mjs --resume` then `python scripts/import-acju.py`. Rebuild/redeploy after refreshing. Daily date changes automatically select the correct row from this snapshot; later publisher revisions require refreshing it.

Source and attribution: All Ceylon Jamiyyathul Ulama (ACJU), https://www.acju.lk/prayer-times/.
