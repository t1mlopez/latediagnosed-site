# Okta + Astro production handoff

Updated: August 30, 2026

## Okta-only editor login architecture (production verified)

The repository now contains the preferred long-term architecture requested after the legacy GitHub OAuth popup appeared blank:

- Decap's `backend.name` is `latediagnosed`, a custom same-origin backend. There is no GitHub login button, OAuth popup, `base_url`, or browser GitHub token.
- Decap silently confirms the existing signed Astro session at `/api/cms/session`. The exact Okta-derived `CMS Editors` permission is required both for CMS assets and every CMS API request.
- `/api/cms/repository` exposes only high-level list, read, write, and delete operations. It requires an exact same-origin `Origin`, JSON requests, and a sealed 15-minute CSRF token bound to the signed-in Okta subject.
- `/api/cms/media` returns only allowlisted media to authorized sessions.
- The server-side GitHub App client mints one-hour installation tokens. Each mint is restricted again to repository `t1mlopez/latediagnosed-site` and `contents: write`; the gateway separately enforces branch `main`, approved Markdown collection folders, approved image types in `public/uploads`, bounded batch/size limits, and traversal/encoded-path rejection.
- GitHub App private keys and installation tokens never appear in `config.yml`, `backend.js`, CMS responses, or browser storage. Repository commits are attributed to the App; Okta remains authoritative for editor identity and eligibility.
- `wrangler.preview.jsonc` defines the route-free `latediagnosed-web-cms-preview` Worker. Preview passed sign-in, denial, content edit, media upload, cleanup, and gateway-policy checks before production promotion.

The approved GitHub App **LateDiagnosed Content Center** is installed only on `t1mlopez/latediagnosed-site` with **Contents: read and write** plus implicit **Metadata: read-only**. Webhooks, GitHub user authorization, device flow, callback URLs, and other repository or organization permissions are disabled. Its credentials are encrypted secrets on preview and production Workers.

New encrypted secret names, for both preview and later production:

- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`

Set values interactively with `npx wrangler secret put NAME --config wrangler.preview.jsonc` for staging and `npx wrangler secret put NAME` only after staging passes. Never print or paste values into chat. For private-key rotation, create a second GitHub App key, update the encrypted Worker secret, verify both environments, then delete the old GitHub key.

The Okta **Content Center** initiate-login URI remains:

`https://latediagnosed.org/auth/login?returnTo=/admin/`

The session is still an encrypted authorization snapshot expiring at the earlier of the Okta ID-token expiration and eight hours. Every gateway call rechecks that snapshot, but there is no live group lookup. Removing `CMS Editors` takes effect on the next login and no later than session expiry; Content Center logout clears the Astro session immediately. Rotating `OKTA_SESSION_SECRET` performs emergency global session revocation.

Automated checks cover exact permission behavior, anonymous redirect, malformed/tampered/expired sessions, safe `returnTo`, repository and branch rejection, traversal, writes outside approved content/media folders, origin rejection, CSRF subject/expiry/tampering, and browser credential leakage. Preview Worker version `46bebca6-5b53-4441-9cb2-42dae44a191c` and production passed real Okta SSO launch directly into Decap, content/media listing, reversible draft and image commits, Decap UI save/delete, cleanup, and rejection checks. The temporary preview callback was removed afterward. The Content Center initiate-login URI is `https://latediagnosed.org/auth/login?returnTo=/admin/`. Production source commits are `376a8fa` (gateway) and `eb96e83` (logout navigation); automatic deployment version `79679e11-fc6d-48b6-9442-483a1eb98a41` was verified.

## Historical transitional CMS authorization update (superseded August 30, 2026)

The former production version adopted the explicitly allowed **transitional** Decap architecture. It has been replaced by the production architecture above:

- Okta is the identity and CMS-eligibility source of truth.
- The exact, case-sensitive Okta-derived permission `CMS Editors` is required at the `latediagnosed-web` Worker boundary for `/admin`, `/admin/`, and every `/admin/*` static asset.
- The CMS shell, configuration, and preview CSS were moved out of `public/admin` into `src/cms` and are served through an allowlisted Astro server route. Local Wrangler tests showed that generated public assets could bypass middleware despite attempted Worker-first configuration. With no public `/admin` asset, Cloudflare must invoke Astro and middleware before any CMS file is returned; unrelated public assets stay asset-first.
- Anonymous CMS requests redirect to `/auth/login?returnTo=/admin/`.
- Signed-in users without `CMS Editors` receive a friendly, non-cacheable HTTP 403 page.
- Authorized users reach Decap, which still uses the GitHub backend and the existing OAuth base URL. This is a second authentication/authorization step for repository access and must not be described as Okta-only CMS login.
- `/account`, `/api/me`, the public site, OIDC state/nonce/PKCE checks, and secure production cookies remain intact.

The Okta **Content Center** application must have this initiate-login URI:

`https://latediagnosed.org/auth/login?returnTo=/admin/`

### Existing CMS OAuth Worker inspection

Public inspection of `https://fragrant-hall-b531.tim-0a7.workers.dev` found:

- `/` identifies it as the Late Diagnosed CMS OAuth Worker.
- `/auth` redirects to GitHub OAuth for the current GitHub OAuth application and requests `repo` scope.
- The observed GitHub authorization redirect did not include an OAuth `state` parameter. Because the source is inaccessible, its CSRF protections cannot be confirmed; this is a remaining transitional risk.
- The hostname remains configured as Decap's `base_url`.
- Wrangler reports that a Worker named `fragrant-hall-b531` does not exist in the only connected Cloudflare account. Its source, secret names, routes, versions, and rollback point therefore could not be inspected or changed from that account.

Do not rotate or replace the legacy OAuth Worker until its owning Cloudflare account/source repository is recovered. Its current broad GitHub OAuth grant is a remaining risk and a reason to prefer the long-term GitHub App gateway.

### Rollback point and baseline

Recorded before CMS changes:

- Repository commit: `6ea998c69779980f6af59209297cb79ae08deaf7` (`chore: verify Cloudflare Worker builds`)
- Active `latediagnosed-web` Worker version: `75ad6821-ffa4-4945-83e1-feb409cad6e2`
- Active deployment created: August 30, 2026 at `2026-08-30T01:00:44Z`
- Existing Cloudflare secret names: `OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_SESSION_SECRET`, `OKTA_PERMISSION_CLAIMS`
- Baseline `npm run check`: 0 errors (63 existing informational hints)
- Baseline `npm run build`: successful

Rollback production code with:

`npx wrangler rollback 75ad6821-ffa4-4945-83e1-feb409cad6e2`

This does not roll back Okta tile settings or the separate GitHub OAuth Worker.

### Session revocation behavior

Astro stores an encrypted, HttpOnly authorization snapshot. The session expires at the earlier of the Okta ID token expiry and eight hours after sign-in. Okta group membership is not revalidated during that session. Removing `CMS Editors` takes effect on the next Okta login and no later than the current Astro session expiry; logout clears access immediately. Rotating `OKTA_SESSION_SECRET` invalidates all Astro sessions and should be reserved for emergency global revocation or planned rotation.

### Required production configuration

Cloudflare encrypted secrets for `latediagnosed-web`:

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OKTA_SESSION_SECRET`
- `OKTA_PERMISSION_CLAIMS`

Use `npx wrangler secret put NAME` interactively and never print values. For rotation, update the encrypted Worker secret, test the new deployment, then revoke the old Okta credential. An `OKTA_SESSION_SECRET` change signs everyone out.

### One-login gateway decision

The server-side gateway and custom Decap backend described above are now deployed. The GitHub App is installed and its three values are encrypted Worker secrets; no GitHub credential is returned to Decap or the browser.

### Verification and deployment

Run `npm run test`, `npm run check`, `npm run build`, and `npx wrangler deploy --dry-run`. The custom gateway tests are mandatory before preview deployment. Configure all eight secret names on the `preview` environment, add the emitted preview `/auth/callback` URL to Okta, and run the complete preview checklist before production.

Production verification must cover login, account, `/api/me`, the `CMS Editors` claim, anonymous redirect, permitted CMS load, 403 denial, GitHub content listing/editing, media upload to `public/uploads`, the Okta tile target, and logout. Do not change production DNS for this transitional Worker update.

### Historical transitional deployment status (superseded)

Deployed to the existing production `latediagnosed-web` Worker on August 30, 2026:

- New production Worker version: `134ccc63-2294-4b2f-ab7e-f4747415b53a`
- Previous rollback version: `75ad6821-ffa4-4945-83e1-feb409cad6e2`
- DNS and custom-domain routing were not changed.
- Anonymous production checks pass for `/auth/login`, `/account`, `/api/me`, `/admin`, `/admin/`, `/admin/config.yml`, and `/`.
- Local built-Worker integration checks pass for authorized editor access, non-editor 403, expired/tampered session rejection, `/account`, and `/api/me`.
- Signed-in production `/account` is verified and displays Tim Lopez with the `CMS Editors` permission.
- Signed-in production `/admin/` is verified and loads Decap's `Login with GitHub` screen, confirming the Okta authorization boundary.
- Decap repository listing/editing and media upload remain pending a GitHub sign-in in the preserved OAuth popup.
- Updating the Okta tile remains pending Okta Admin Console reauthentication; the admin console requires Tim's password after Okta Verify.
- Logout verification remains pending until the Decap and Okta Admin checks are complete.

## Resolution update

The production launch failure is resolved. The site now runs as the `latediagnosed-web` Cloudflare Worker using `@astrojs/cloudflare`, with the production domains routed through the Worker and all five Okta secret bindings configured.

Verified in production on August 30, 2026:

- `https://latediagnosed.org/auth/login` returns an Okta authorization redirect instead of 404.
- The Okta **Content Center** dashboard tile completes the OIDC flow and lands on `/account`.
- The account page identifies **Tim Lopez** and shows the **CMS Editors** permission received from Okta.
- `/api/me` returns the authenticated user and `CMS Editors` permission.
- The login transaction cookie is `Secure`, `HttpOnly`, and `SameSite=Lax`.
- `npm run check` completes with no errors (existing informational hints remain).
- `npm run build` completes successfully with the Cloudflare adapter.

The historical failure analysis below is retained for deployment context.

## Current outcome

The Okta application is named **Content Center** and is assigned to Tim Lopez through an Okta group. It appears on Tim's Okta My Apps dashboard with the supplied pen-and-paper icon.

Okta is configured with:

- Login initiated by: **Either Okta or App**
- Display application icon to users: **Enabled**
- Login flow: **Redirect to app to initiate login (OIDC Compliant)**
- Initiate login URI: `https://latediagnosed.org/auth/login`
- Production callback: `https://latediagnosed.org/auth/callback`
- Local callback: `http://localhost:4321/auth/callback`
- Production sign-out redirect: `https://latediagnosed.org/`
- Local sign-out redirect: `http://localhost:4321/`

The dashboard tile itself now works as configured, but its target fails in production.

## Confirmed production failure

Launching Content Center reaches:

`https://latediagnosed.org/auth/login?iss=https%3A%2F%2Flatediagnosed.okta.com`

The production site returns **HTTP 404** for that route.

This is not currently an Okta assignment or dashboard-tile problem. The repository contains the `/auth/login` server route, but the authenticated Astro server build has not been deployed to production. The live site is still serving the older static build.

## Important architecture change

Authentication changed the Astro project from a static site to a server-rendered application:

- `astro.config.mjs` uses `output: 'server'`.
- It currently uses `@astrojs/node` in standalone mode.
- The production host must run `node ./dist/server/entry.mjs` after `npm run build`.
- A host that only publishes the `dist/` directory as static files will not serve `/auth/login`, `/auth/callback`, `/auth/logout`, `/account`, or `/api/me` correctly.

Do not simply upload the generated `dist/` folder to a static host.

## Work needed next

1. Identify the service currently deploying `latediagnosed.org` from this GitHub repository. The site is behind Cloudflare, but the origin/deployment provider was not yet confirmed.
2. Choose a server-capable deployment target:
   - Keep the Node adapter and deploy to a Node-capable host such as Render, Railway, Fly.io, or another container/Node service; or
   - If the existing deployment is Cloudflare Pages/Workers, replace `@astrojs/node` with the appropriate Cloudflare Astro adapter and validate all authentication/session behavior in the Workers runtime.
3. Configure the production environment variables in the hosting provider. Copy the variable names from `.env.example`; use the real values from the local ignored `.env`. Never commit `.env` or paste secret values into chat.
4. Deploy the current repository changes.
5. Confirm that DNS/Cloudflare routes `latediagnosed.org` to the new server deployment.
6. Test the full Okta launch flow from the My Apps dashboard.

## Required production environment variables

Configure these as encrypted secrets in the deployment platform:

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OKTA_SESSION_SECRET`
- `OKTA_PERMISSION_CLAIMS`

Expected non-secret structure:

- Issuer is the LateDiagnosed Okta organization URL.
- Permission claims include `okta_groups` so Okta group membership can flow into Astro permissions.
- Session secret must be a strong random value of at least 32 bytes.

Do not rotate the existing Okta client secret unless necessary. If it is rotated, update the hosting secret at the same time and invalidate the old secret only after production is verified.

## Repository state

The Okta/Astro implementation is present locally but uncommitted. Relevant work includes:

- Astro Node server adapter and environment schema
- Okta OIDC login, callback, and logout routes
- Signed/encrypted session handling
- Authentication middleware
- Account page and `/api/me`
- Permission extraction from Okta claims
- Header sign-in/account integration
- SSR-compatible content routes
- Updated privacy policy and documentation

Before committing, review `git status` and `git diff` carefully. Preserve unrelated user changes.

## Verification checklist

Run locally before deployment:

```sh
npm run build
npm run astro check
```

Then test locally with the real ignored `.env`:

```sh
npm run dev
```

Verify:

- `/auth/login` redirects to the correct Okta authorize endpoint.
- Okta returns to `/auth/callback` without a redirect URI error.
- The callback creates a secure session and redirects to the intended page.
- `/account` displays Tim's name/email.
- `/api/me` returns the signed-in user and permission values.
- The `CMS Editors` Okta group appears in the permission list.
- Logout clears the local session and completes the expected Okta logout behavior.
- An unauthenticated request to a protected route redirects to login.
- A signed-in user without a required permission receives the intended denial response.
- Existing article, resource, and page routes still render under server output.

After deployment, verify with production URLs:

- `https://latediagnosed.org/auth/login` must redirect, not return 404.
- Launching **Content Center** from Okta must complete sign-in.
- `https://latediagnosed.org/auth/callback` must be accepted by Okta.
- `https://latediagnosed.org/account` must show the authenticated account.
- `https://latediagnosed.org/api/me` must reflect the active user.
- Refreshing a server-rendered content URL directly must not produce a 404.
- Cookies must be `Secure`, `HttpOnly`, and use an appropriate `SameSite` policy in production.

## Other things to check

- Confirm whether all assigned users should see Content Center or only selected Okta groups.
- Decide which Okta groups map to application permissions and document the naming convention.
- Avoid treating every group name as authorization unless that is intentional; consider an allowlist or explicit role mapping.
- Confirm that the org authorization server continues to include the `okta_groups` claim in the ID token for every intended user.
- Define behavior when Okta removes a user or group membership while an Astro session is still active. Consider a short session lifetime or periodic token refresh/revalidation.
- Add authorization tests for permission-protected routes.
- Add CSRF/state/nonce and session-tampering regression tests.
- Add production logging that does not log tokens, secrets, authorization codes, or full session cookies.
- Add friendly error pages for expired login transactions and Okta callback failures.
- Confirm the privacy policy accurately describes Okta account data and session cookies.
- Decide whether the attached Okta icon should also replace `public/images/okta-app-icon.png` in the repository for source-of-truth consistency.
- Remove or archive superseded icon variants only after confirming they are not referenced elsewhere.

## Suggested ChatGPT prompt

Use this with regular ChatGPT, supplying the repository files or a GitHub link but **not** the contents of `.env`:

> I have an Astro 6 site that was converted from static output to server output for Okta OIDC authentication. The repository uses `@astrojs/node` standalone mode and contains `/auth/login`, `/auth/callback`, `/auth/logout`, `/account`, `/api/me`, authentication middleware, signed sessions, and Okta permission extraction. The live site at `https://latediagnosed.org` is behind Cloudflare but currently serves an older static deployment, so `https://latediagnosed.org/auth/login` returns HTTP 404. Help me identify the current origin/deployment provider, choose the smallest safe server-capable deployment path, configure the required production environment variables without exposing secrets, deploy the current build, and test the full Okta dashboard launch flow. Preserve Okta as the identity source of truth and preserve the `okta_groups` permission claim. Read `OKTA-ASTRO-HANDOFF.md`, `README.md`, `astro.config.mjs`, `.env.example`, `package.json`, and the authentication files before proposing changes. Do not ask me to paste client secrets into chat. Give exact provider-specific steps and a rollback plan.

## Rollback plan

Before changing production routing:

1. Record the current hosting project, deployment ID, DNS records, and Cloudflare proxy settings.
2. Keep the current static production deployment available.
3. Deploy the authenticated server build to a preview/staging URL first.
4. Add the staging callback URI to Okta only if staging login must be tested; remove it afterward if it is no longer needed.
5. Switch production traffic only after the preview passes.
6. If errors occur, restore the previous origin/DNS target while leaving the Okta application intact.
