# Late Diagnosed Content Editor

Tracked in Jira as WEB-11. The first-party editor lives at `/account/content/`; the existing `/admin/` Decap interface remains available as a fallback.

## Architecture

The editor reuses the existing encrypted Okta session and exact `CMS Editors` permission. Middleware protects every `/account/content/*` page server-side, including preview. `/api/cms/content` also checks the authenticated user on every read, and mutation requests retain the existing same-origin and short-lived, subject-bound CSRF checks.

Markdown in `src/content/articles`, `src/content/resources`, and `src/content/pages` remains the source of truth. Saving uses the existing server-only GitHub App gateway and commits directly to `main`; no database, browser GitHub token, or second authentication system was added. A file SHA is checked before each edit so a stale browser does not knowingly overwrite a newer repository version.

## Editing model

The main form intentionally contains Subject (`title`), Tagline (`description`), Tags, Body, Date, and Time. Missing publication date/time values are populated with the editor's current local date and time. Save draft requires a subject and writes `status: draft`. Publish additionally requires a tagline, at least one tag, a non-empty body, and a valid publication instant, then writes `status: published`.

Advanced contains common but secondary settings: content type, author, categories, excerpt, hero image, and featured state. Super User / Technical exposes the remaining shared schema controls and a complete JSON metadata view. The JSON view begins with every parsed frontmatter key, including unknown keys; saving overlays the visible controls while retaining unknown metadata. Existing YAML comments and ordering are preserved where the YAML document model allows.

Preview posts the unsaved core form values to a protected preview page and renders the site's Markdown/GFM syntax inside the shared `ArticleLayout`. The preview iframe is sandboxed so authored raw HTML cannot execute scripts in the authenticated editor origin.

## Operations and rollback

No new Cloudflare bindings or secrets are required. The existing Astro 6 Cloudflare Worker deployment workflow is unchanged. Validate with `npm test`, `npm run check`, `npm run build`, and `npx wrangler deploy --dry-run` before preview deployment.

To roll back the editor UI, revert the WEB-11 commit. Content already saved remains ordinary Markdown and continues to work in Decap or direct Git workflows.
