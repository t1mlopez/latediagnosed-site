# LateDiagnosed.org

## Okta accounts

Accounts use Okta-hosted OpenID Connect sign-in. The site does not maintain a separate user/password database. Copy `.env.example` to `.env` and fill in the Okta values.

Use the issuer supported by the tenant. This LateDiagnosed.org tenant uses its org authorization server (`https://latediagnosed.okta.com`); tenants with API Access Management may instead use a custom issuer such as `/oauth2/default`.

Create an Okta **OIDC Web Application** with Authorization Code enabled and configure these redirect URIs:

- Local sign-in: `http://localhost:4321/auth/callback`
- Production sign-in: `https://latediagnosed.org/auth/callback`

The app reads permission values from the ID-token claims listed in `OKTA_PERMISSION_CLAIMS` (by default `okta_groups`, `groups`, `roles`, and `permissions`). This Okta app uses the `okta_groups` federated claim because Okta reserves the standard `groups` and `permissions` names in this editor. Values are exposed as `Astro.locals.user.permissions`; use `requireUser()` or `requirePermission()` from `src/lib/auth/guards.ts` to protect pages and endpoints. Each guard returns either the authorized user or a `Response`; return that response from the page or endpoint before rendering protected content.

Generate the session secret with at least 32 random bytes. Never commit `.env`.

The production deployment must run the generated Node server (`node ./dist/server/entry.mjs`), not serve `dist/` as static files.

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
