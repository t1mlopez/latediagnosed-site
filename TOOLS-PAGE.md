# Late Diagnosed Tools Page

Updated for WEB-13.

## Purpose

`/tools` is the authenticated Tools Page for LateDiagnosed internal users. It uses the existing LateDiagnosed public-site shell and visual system rather than a separate admin-dashboard design.

The page is a launcher and identity surface. It is not the authorization boundary for downstream applications.

`/account` remains as a compatibility redirect to `/tools` so older links do not break.

## User-facing naming

- Page/product name: **Tools Page**
- Webpage header: **Tools and Additional Resources**
- Authenticated top-navigation label: **Tools**
- The Tools navigation item is rendered only when `Astro.locals.user` contains an authenticated session.
- The `/tools` route also enforces authentication server-side through `requireUser()`.

## Design source of truth

Reuse the production website patterns in:

- `src/styles/global.css`
- `src/layouts/PublicLayout.astro`
- `src/layouts/ArticleLayout.astro`
- `src/components/Header.astro`
- `src/components/home/StartHere.astro`
- `src/pages/internal/design-system.astro`

### Webpage header

The Tools Page uses the same shared article-header treatment as article pages such as **Welcome to ADHD**.

`Tools and Additional Resources` is the page H1 inside the existing `.article-hero` / `.article-hero-inner` structure. This deliberately reuses the production article styling rather than maintaining a separate Tools-specific purple band.

The shared article treatment currently provides:

- `linear-gradient(135deg, #1e2a5e, #4a2068)`
- `5rem 1.5rem` hero padding
- `900px` centered inner width
- white Playfair Display H1
- responsive H1 sizing with `clamp(2.5rem, 6vw, 4.5rem)`
- no photograph/background image

The title is not repeated in the gray content area.

### Main content

The greeting and launcher area below the article-style header sit on one continuous soft gray/lavender page background (`#f8f6fb`).

Greeting treatment:

- compact `max-w-6xl` content area
- navy Playfair `Hi, <name>` heading
- Founder's Club and organizational roles displayed as restrained pill badges
- the same `#f8f6fb` background continues directly into the launcher section

The launcher area reuses the homepage `StartHere.astro` card treatment:

- centered Playfair section heading
- white cards with `rounded-xl`, light gray borders, subtle shadows and restrained hover behavior
- Lucide icons in navy/purple tinted circular wells
- responsive `sm:grid-cols-2 lg:grid-cols-3` layout

The launcher section heading remains **What would you like to access?** and intentionally has no subtext beneath it.

## Identity/session contract

The server-side Okta callback normalizes only the fields needed by the application into `AuthUser`:

- immutable Okta subject ID
- email
- display name
- preferred username
- first name
- preferred first name
- permission/group strings

Preferred first name is resolved from the first available Okta claim in this order:

1. `preferred_first_name`
2. `preferredFirstName`
3. `nickname`

First name is resolved from:

1. `given_name`
2. `first_name`
3. `firstName`

The current OIDC request uses the standard `openid profile email` scopes. No member-since field is shown or required.

## Application/action registry

Launcher definitions live in:

`src/lib/tools-page.ts`

Each launcher supports:

- stable ID
- label
- description
- Lucide icon name
- destination URL/route
- zero, one, or multiple allowed Okta groups
- access mode (`any` by default, optionally `all`)
- internal/external navigation
- ordering
- enabled state
- navy/purple visual tone

The reviewed launcher order is:

1. Content Editor
2. WebMail
3. Okta
4. Confluence
5. Jira

**Donate has been removed from the Tools Page.**

Okta has no launcher entitlement because every current Tools Page user is already authenticated through the Late Diagnosed Okta organization. It is therefore universally visible to authenticated Tools Page users. This can be revisited if the future identity architecture includes users who do not have Okta accounts.

## Entitlement naming

The canonical convention is:

- `Tools - Content Editor`
- `Tools - WebMail`
- `Tools - Confluence`
- `Tools - Jira`
- future: `Tools - <Application Name>`

Okta is currently universal to authenticated Tools Page users and does not require a `Tools - Okta` entitlement.

To avoid breaking existing access during the rename, the registry temporarily accepts the previous aliases:

- `Content Center - WebMail`
- `Content Center - Content Editor`
- `Content Center - Confluence`

`CMS Editors` also remains an accepted Content Editor group during the existing migration period.

New Okta groups should use the `Tools - ...` convention. Legacy `Content Center - ...` aliases can be removed once no assigned users depend on them.

### Multiple groups for one launcher

Put every qualifying Okta group in the launcher's `allowedGroups` array. With the default `any` mode, matching any one group displays that launcher.

A launcher is rendered from one registry record, so a person who matches multiple allowed groups still sees only one card. `getVisibleLaunchers()` also deduplicates by launcher ID as a defensive measure.

Example:

```ts
allowedGroups: [
  'Tools - WebMail',
  'Another approved WebMail group',
]
```

Do not duplicate a registry entry for Staff, Volunteer, or another population.

## Initial destinations

- Content Editor: `/admin/`
- WebMail: Microsoft Outlook Web (`https://outlook.cloud.microsoft/mail/`)
- Okta: Late Diagnosed Okta end-user dashboard (`https://latediagnosed.okta.com/app/UserHome`)
- Confluence: Late Diagnosed internal Confluence Home space
- Jira: Late Diagnosed Jira (`https://latediagnosed.atlassian.net/jira/`)

If a destination changes, update the single registry definition rather than editing the page component.

## Display roles and Founder's Club

Display roles are mapped separately from launcher entitlements in `DISPLAY_ROLE_MAPPINGS`.

Initial labels:

- Volunteer
- Contributor
- Donor
- Staff

**Founder's Club** is a universal honorary designation shown to authenticated Tools Page users. It is not an Okta access entitlement and grants no downstream permission.

Display-role mappings and application access must remain separate unless an explicit, documented access decision deliberately uses the same group.

## Adding an application/action

1. Create or identify the appropriate Okta access group(s), using `Tools - <Application Name>` for new restricted launchers.
2. Ensure those groups are included in the server-side permission claim configured by `OKTA_PERMISSION_CLAIMS`.
3. Add one registry record to `TOOLS_PAGE_LAUNCHERS`.
4. Configure its label, description, icon, URL, order, tone, and `allowedGroups`.
5. Omit `allowedGroups` only when the launcher is intentionally universal for every authenticated Tools Page user.
6. Use `accessMode: 'all'` only when every configured group is genuinely required; otherwise omit it or use `any`.
7. Verify a qualifying user sees exactly one card.
8. Verify a non-qualifying user does not see restricted cards.
9. Verify the downstream application still enforces its own authorization.

## Adding/changing a display role

1. Add or update one entry in `DISPLAY_ROLE_MAPPINGS`.
2. Map the visible label to the exact Okta group string(s) that represent that organizational role.
3. Test users with one and multiple simultaneous roles.
4. Do not use a display label as an implicit application entitlement.

## Authentication and navigation

The Tools item is intentionally not part of the public `menuItems` array. `Header.astro` renders it only inside the authenticated `user ? ... : ...` branch for both desktop and mobile navigation.

Direct requests to `/tools` still require a valid authenticated session through `requireUser()`. Hiding the navigation item is only a presentation choice and is not the security boundary.

## Current implementation dependency

The Okta application/tile has historically used the **Content Center** name and has sent users directly to `/admin/`. When the reviewed Tools Page becomes the normal authenticated landing page, the Okta application should be renamed to **Tools Page** and its initiate-login target should use `/auth/login?returnTo=/tools` (or an equivalent flow that lands at `/tools`).

Jira visibility now expects the new `Tools - Jira` entitlement. Users without that exact entitlement will not see the Jira card even though Atlassian remains responsible for its own downstream access controls.
