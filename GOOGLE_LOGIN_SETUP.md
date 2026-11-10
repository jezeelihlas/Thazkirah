# Google login for Thazkirah

Website: `https://thazkirah.jezeelikhlas.dev`

Exact authorized redirect URI:

```text
https://thazkirah.jezeelikhlas.dev/api/auth/google/callback
```

The application code is implemented. A private `.env.local` has been prepared with the website origin and a generated session secret. The Google client ID and client secret still need to come from your Google account. Do not upload `.env.local` or the downloaded Google credential file to a public repository or paste either into chat.

## 1. Make the website reachable

The HTTPS check during setup returned `ERR_SSL_TLSV1_UNRECOGNIZED_NAME`. Add `thazkirah.jezeelikhlas.dev` to your hosting project's custom domains, configure the DNS records that host provides, and wait for HTTPS provisioning. The website must open successfully over HTTPS before testing the hosted Google callback. Fix this at the host/domain configuration rather than disabling certificate verification.

## 2. Create the Google client in your account

1. Open <https://console.cloud.google.com/auth/overview> and select or create your project.
2. Configure Google Auth Platform branding with the application name **Thazkirah** and your support/developer email. Use **External** audience for users outside a Workspace organisation. Supply the website's real branding/contact details; do not use invented details.
3. Open **Clients**, create a **Web application** client, and add the exact redirect URI above. This server-side flow does not need an authorized JavaScript origin.
4. Download the client JSON to a private location outside this repository. Google may show the secret only at creation, so keep that file private.
5. During testing, add the Google accounts you intend to test under **Audience → Test users**. For a public launch, change the OAuth audience's publishing status to production and complete any requirements Google shows. Google Workspace administrators can still restrict access.

Only basic `openid`, `email`, and `profile` scopes are requested. The app does not request Gmail, Drive, or Calendar access.

Reference: <https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred>

## 3. Import the downloaded client without showing its secrets

From the project terminal, replacing the path with the real downloaded file:

```powershell
npm run setup:google -- --origin https://thazkirah.jezeelikhlas.dev --import "C:\path\to\downloaded-client.json"
npm run check:google
```

The helper validates that this is a Web application client, creates/preserves the session secret, and updates `.env.local`. It never prints the client secret or session secret. A successful check confirms that configuration values are present; it does not prove that the provider has accepted a real user login.

## 4. Configure the hosting service

In the hosting project's private environment-variable settings, set:

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID from `.env.local` or the Google client |
| `GOOGLE_CLIENT_SECRET` | Client secret from the downloaded Google client |
| `AUTH_SECRET` | Generated secret already saved in the private `.env.local` |
| `APP_URL` | `https://thazkirah.jezeelikhlas.dev` |

Redeploy the latest source after setting these values. Editing `.env.local` alone does not update your hosted service. The hosting service must run Next.js API routes; uploading static HTML alone is insufficient.

## 5. Verify a real login

1. Open `https://thazkirah.jezeelikhlas.dev/api/auth/session`. It should return `configured: true` and `account: null` before login.
2. Open the website, go to **Profile**, and choose **Continue with Google**.
3. Complete Google's account chooser/consent screen. The callback should return you to Profile showing your name and email.
4. Refresh to verify that the session persists, then test **Sign out**.

Authentication identifies the account. Practice history remains in the browser; account sync and cloud backups are not implemented.

## Local checks

```powershell
npm test
npm run typecheck
npm run build
npm run test:integration
```

The authentication integration tests use test credentials and do not contact Google. Real Google login still needs steps 1–5 above.
