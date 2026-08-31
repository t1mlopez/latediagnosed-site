# Late Diagnosed Content Center

Updated for WEB-13.

## Purpose

`/account` is the authenticated Content Center landing page. It uses the existing LateDiagnosed public-site shell and visual system rather than a separate admin-dashboard design.

The page is a launcher and identity surface. It is not the authorization boundary for downstream applications.

## Design source of truth

Reuse the production website patterns in:

- `src/styles/global.css`
- `src/layouts/PublicLayout.astro`
- `src/components/Header.astro`
- `src/components/home/StartHere.astro`
- `src/pages/internal/design-system.astro`

Core visual conventions:

- Playfair Display headings
- Libre Franklin body copy
- Navy `#1e2a5e`
- Deep purple `#4a2068`
- Soft lavender `#f8f6fb`
- Text gray `#4b5563`
- White cards, light borders, rounded-xl corners, subtle shadows, restrained motion
- Lucide icons in small tinted circular wells

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

The current OIDC request uses the standard `openid profile email` scopes. No member-since field is shown or required by the Content Center.

## Application/action registry

Launcher definitions live in:

`src/lib/content-center.ts`

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

Donate has no access group and is therefore universal by default.

### Multiple groups for one launcher

Put every qualifying Okta group in the launcher's `allowedGroups` array. With the default `any` mode, matching any one group displays that launcher.

A launcher is rendered from one registry record, so a person who matches multiple allowed groups still sees only one card. `getVisibleLaunchers()` also deduplicates by launcher ID as a defensive measure.

Example:

```ts
allowedGroups: [
  'Content Center - WebMail',
  'Another approved WebMail group',
]
```

Do not duplicate the WebMail registry entry for Staff, Volunteer, or another population.

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

**Founder's Club** is a universal honorary designation shown to Content Center users. It is not an Okta access entitlement and grants no downstream permission.

Display-role mappings and application access must remain separate unless an explicit, documented access decision deliberately uses the same group.

## Adding an application/action

1. Create or identify the appropriate Okta access group(s).
2. Ensure those groups are included in the server-side permission claim configured by `OKTA_PERMISSION_CLAIMS`.
3. Add one registry record to `CONTENT_CENTER_LAUNCHERS`.
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

## Current implementation dependency

The Okta Content Center tile has historically been configured to send users directly to `/admin/`. For the Content Center to become the normal tile landing page, the Okta app initiate-login target should use `/auth/login` or `/auth/login?returnTo=/account` after the new page is reviewed. This is an Okta configuration change, not a reason to duplicate or bypass the existing Astro login flow.
