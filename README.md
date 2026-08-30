# LateDiagnosed.org

## Okta accounts

Accounts use Okta-hosted OpenID Connect sign-in. The site does not maintain a separate user/password database. Copy `.env.example` to `.env` and fill in the Okta values.

Use the issuer supported by the tenant. This LateDiagnosed.org tenant uses its org authorization server (`https://latediagnosed.okta.com`); tenants with API Access Management may instead use a custom issuer such as `/oauth2/default`.

Create an Okta **OIDC Web Application** with Authorization Code enabled and configure these redirect URIs:

- Local sign-in: `http://localhost:4321/auth/callback`
- Production sign-in: `https://latediagnosed.org/auth/callback`

The app reads permission values from the ID-token claims listed in `OKTA_PERMISSION_CLAIMS` (by default `okta_groups`, `groups`, `roles`, and `permissions`). This Okta app uses the `okta_groups` federated claim because Okta reserves the standard `groups` and `permissions` names in this editor. Values are exposed as `Astro.locals.user.permissions`; use `requireUser()` or `requirePermission()` from `src/lib/auth/guards.ts` to protect pages and endpoints. Each guard returns either the authorized user or a `Response`; return that response from the page or endpoint before rendering protected content.

Generate the session secret with at least 32 random bytes. Never commit `.env`.

Production runs as an Astro 6 server-rendered Cloudflare Worker. Build with `npm run build` and deploy with `npm run deploy`; do not publish `dist/` as a static-only site.

## Content Center / Decap CMS access

Content Center uses Okta as its only interactive login and authorization source:

1. **Okta authenticates the person and decides CMS eligibility.** The `okta_groups` ID-token claim becomes an application permission. The CMS shell, configuration, backend JavaScript, and preview CSS live outside `public/` and are served by an allowlisted Astro server route, so middleware requires the exact, case-sensitive `CMS Editors` permission before returning any CMS byte.
2. **A same-origin Decap backend reuses that signed Astro session.** Decap does not open a GitHub popup or receive a GitHub token. It obtains a short-lived, subject-bound CSRF token from `/api/cms/session` and calls only the high-level `/api/cms/repository` and `/api/cms/media` routes.
3. **The Worker performs repository operations as a GitHub App installation.** It mints an installation token on the server, scopes each token request to `t1mlopez/latediagnosed-site` and `contents: write`, and never returns the App private key or installation token to the browser. The gateway accepts only repository `t1mlopez/latediagnosed-site`, branch `main`, Markdown below the configured `src/content/*` collection folders, and supported images below `public/uploads`.

GitHub remains the content store, but editors do not authenticate to GitHub. Repository commits are made by the GitHub App, while Okta remains authoritative for which people may invoke the gateway. Never place a GitHub personal access token, App private key, installation token, OAuth client secret, or other privileged credential in browser JavaScript or `config.yml`.

The Okta application tile named **Content Center** must use this initiate-login URI:

```text
https://latediagnosed.org/auth/login?returnTo=/admin/
```

Anonymous `/admin/` requests are redirected to that same application path. Signed-in users without `CMS Editors` receive a friendly HTTP 403 response. `/account` remains a separate, useful authenticated account page.

### Session and group-removal behavior

The encrypted Astro session is an authorization snapshot of the Okta ID-token claims. Its expiry is the earlier of the ID token expiry and eight hours after login. The gateway checks that session and `CMS Editors` on every operation, but it does not call Okta to revalidate group membership during an existing session. Removing `CMS Editors` therefore removes CMS access on the next login and no later than the current Astro session expiry. Content Center logout clears the Astro session immediately. For urgent global revocation, rotate `OKTA_SESSION_SECRET`; this signs out every site user.

### Configuration and secrets

The `latediagnosed-web` Worker requires these encrypted Cloudflare secret names:

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OKTA_SESSION_SECRET`
- `OKTA_PERMISSION_CLAIMS`
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`

Set them interactively with `npx wrangler secret put NAME`; use `--config wrangler.preview.jsonc` for the isolated preview Worker. Never put their values in Wrangler configuration, source control, logs, browser responses, or chat. The GitHub App must be installed for **only** `t1mlopez/latediagnosed-site`, with **Contents: read and write** and the implicit **Metadata: read-only** permission. Webhooks, user authorization, callback URLs, client secrets, issues, pull requests, administration, actions, and organization permissions are not required.

To rotate a GitHub App private key, create a second App key, update `GITHUB_APP_PRIVATE_KEY` through Cloudflare encrypted secrets, verify preview and production, then delete the old key in GitHub. Rotate the App or installation IDs only when replacing/reinstalling the App. Rotating `OKTA_CLIENT_SECRET` also requires changing the Okta application value. Rotating `OKTA_SESSION_SECRET` invalidates all active site sessions.

### Local development and verification

Copy `.env.example` to the ignored `.env`, provide local Okta values, and keep the localhost callback registered in Okta. Then run:

```sh
npm run test
npm run check
npm run build
npx wrangler deploy --dry-run
npm run dev
```

For local repository operations, put development GitHub App values in the ignored `.env`; do not reuse a production private key unless that access is deliberate. Verify `/auth/login?returnTo=/admin/`, `/account`, `/api/me`, all three CMS authorization outcomes, content listing/editing, media upload, and logout. Unit tests cover permission decisions, safe return targets, tampered/malformed/expired sessions, exact repository and branch enforcement, traversal, write-path restrictions, origin, CSRF expiry/tampering, and browser credential leakage.

### Deployment and rollback

Before production deployment, record `npx wrangler deployments list --name latediagnosed-web` and `npx wrangler versions list --name latediagnosed-web`. Build, deploy the route-free staging Worker with `npx wrangler deploy --config wrangler.preview.jsonc`, then configure preview secrets with `npx wrangler secret put NAME --config wrangler.preview.jsonc`. Add its exact `/auth/callback` URL to the Okta application only for preview testing. Complete authorization, content edit, and media tests there before `npx wrangler deploy` promotes production. No DNS change is required for the preview Worker.

The CMS files must not be moved back under `public/admin`. Local Wrangler testing showed that public CMS files could be served asset-first without invoking Astro middleware. Keeping them in `src/cms` and serving only `index.html`, `config.yml`, `backend.js`, and `preview.css` through `src/pages/admin/[...asset].ts` makes the authorization boundary deterministic while allowing ordinary public assets to remain asset-first.

Rollback with `npx wrangler rollback VERSION_ID`. The pre-gateway rollback version that retains the rotated Okta credential is `d1b2d245-b9bc-48be-a497-3ea3e38c8b3b`. Cloudflare rollback does not remove the GitHub App or revert the Okta tile. The gateway source is committed to `main`, so future content commits and automatic builds retain the Okta-only editor login architecture.

The GitHub App **LateDiagnosed Content Center** is installed only on `t1mlopez/latediagnosed-site`. Preview Worker version `46bebca6-5b53-4441-9cb2-42dae44a191c` and production both passed real Okta SSO launch, direct Decap collection access without a GitHub login or popup, content/media listing, reversible draft and image commits, Decap UI save/delete, repository/branch/path/origin/CSRF rejection, browser credential-leak checks, tile launch, and logout. The temporary preview callback was removed. Production uses the automatic deployment from source commit `eb96e83`; the active version recorded after that build is `79679e11-fc6d-48b6-9442-483a1eb98a41`.

## Original Astro starter notes

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
