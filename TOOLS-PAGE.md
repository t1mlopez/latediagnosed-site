# Late Diagnosed Tools Page

Updated for WEB-13.

## Purpose

`/tools` is the authenticated Tools Page for LateDiagnosed internal users. It uses the existing LateDiagnosed public-site shell and visual system rather than a separate admin-dashboard design.

The page is a launcher and identity surface. It is not the authorization boundary for downstream applications.

`/account` remains as a compatibility redirect to `/tools` so older links do not break.

## User-facing naming

- Page/product name: **Tools Page**
- Visible page label: **Tools and Additional Resources**
- Authenticated top-navigation label: **Tools**
- The Tools navigation item is rendered only when `Astro.locals.user` contains an authenticated session.
- The `/tools` route also enforces authentication server-side through `requireUser()`.

## Design source of truth

Reuse the production website patterns in:

- `src/styles/global.css`
- `src/layouts/PublicLayout.astro`
- `src/components/Header.astro`
- `src/components/home/StartHere.astro`
- `src/pages/internal/design-system.astro`

Immediately below the white site header, the Tools Page includes a decorative LateDiagnosed navy-to-purple band (`#1e2a5e` → `#4a2068`). It contains no photograph and no account content.

Current band sizing:

- 20rem below 768px
- 24rem at 768px and above

The greeting area and launcher area below that band sit on one continuous soft gray/lavender page background (`#f8f6fb`).

Greeting treatment:

- compact `max-w-6xl` content area rather than a hero
- visible label **Tools and Additional Resources**
- navy Playfair greeting
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

The initial registry contains:

- WebMail
- Content Editor
- Confluence
- Donate

Donate has no access group and is therefore universal by default for authenticated Tools Page users.

## Entitlement naming

The canonical convention is now:

- `Tools - WebMail`
- `Tools - Content Editor`
- `Tools - Confluence`
- future: `Tools - <Application Name>`

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

- WebMail: Microsoft Outlook Web (`https://outlook.cloud.microsoft/mail/`)
- Content Editor: `/admin/`
- Confluence: Late Diagnosed internal Confluence Home space
- Donate: existing Givebutter donation page

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

1. Create or identify the appropriate Okta access group(s), using `Tools - <Application Name>` for new groups.
2. Ensure those groups are included in the server-side permission claim configured by `OKTA_PERMISSION_CLAIMS`.
3. Add one registry record to `TOOLS_PAGE_LAUNCHERS`.
4. Configure its label, description, icon, URL, order, tone, and `allowedGroups`.
5. Use `accessMode: 'all'` only when every configured group is genuinely required; otherwise omit it or use `any`.
6. Verify a qualifying user sees exactly one card.
7. Verify a non-qualifying user does not see the card.
8. Verify the downstream application still enforces its own authorization.

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
