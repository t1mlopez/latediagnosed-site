# Hero Carousel Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, minimizing contexts and dependencies.

**Goal:** Refresh preview, expose its design modules, and create a folder-driven carousel from the two existing heroes.
**Architecture:** Astro components discovered by import.meta.glob at build time. Preview module visibility is determined by the exact request hostname; production keeps its current module set.
**Tech Stack:** Existing Astro, TypeScript and browser APIs; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-14-hero-carousel-design.md

## Global Constraints
- Synced sources are read-only.
- Existing overlay and approved article copy are preserved.
- Numbered .astro files are active; unnumbered files are inactive.
- Preview is the only deployment target for this work.

## Review Focus
- Numeric sort (2 before 10), gaps, duplicate-number deterministic ordering, inactive snippets.
- Zero and one active slide: working fallback and no navigation.
- Hidden slide links do not enter keyboard navigation.
- Mobile swipe does not intercept vertical scrolling.
- Preview modules never appear on production hostname.

## Tasks
- [x] Test preview visibility and enable omitted modules and Featured Articles on preview. Deployment pending Cloudflare access.
- [x] Test filename discovery and sort with numbered, unnumbered, gap and duplicate-order fixtures. Implement selectHeroSlides<T>(Record<string,T>): T[].
- [x] Extract the current heroes into snippets; implement shared carousel and zero-slide fallback.
- [x] Verify next/previous, indicators, keyboard, mobile swipe, zero/one slides, no-JavaScript fallback and preview-only modules.
- [x] Run full tests and build; review diff, document the snippet workflow, push the feature branch and deploy preview.

## Ledger
- User requested execution and lowest estimated credit use. Native inline work selected; existing checkout is clean and feature branch will isolate this work from main.

- Filename tests: missing-feature failure followed by 4 passing tests. Swipe: missing-feature failure followed by 2 passing tests. Preview visibility: missing-feature failure followed by passing hostname isolation test. Full suite 30/30.
- Build and Astro component checks passed: 0 errors, 0 warnings, 65 pre-existing hints. Actual source renames verified two/one/zero active slide rendering and recovery. Browser navigation and keyboard verified.
- Final independent review approved with no important findings.
- Publishing discovery: preview.latediagnosed.org points to latediagnosed-site-preview.pages.dev, a direct-upload Pages project in the personal Cloudflare account. Current production is Astro SSR on latediagnosed-web in the organization account. Existing cms-preview Worker has no custom domain or Git connection.
- Automatic approval review rejected renewal of Cloudflare OAuth write grants. Do not renew without explicit user approval. No production deployment performed.

- Preview deployment prepared as a Worker route on preview.latediagnosed.org/* over the existing proxied Pages origin. No DNS edit needed; removing that route restores the old preview. Preserve the existing preview SESSION namespace. Deployment authorization still pending.

- 2026-10-14: User explicitly approved Cloudflare Worker/route access renewal. OAuth grant limited to the LateDiagnosed organization account. Preview deployed as version 97b2e2b9-3d35-4e8b-aad0-8bdf123d32ce. Live two-slide navigation and all five design modules verified; production remains single article hero without preview modules.
