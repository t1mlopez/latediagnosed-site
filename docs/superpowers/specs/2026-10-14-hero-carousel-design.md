# Hero carousel and preview design

Keep production's article promotion in place while preparing the carousel on preview. Preview starts from main commit 4508234 and exposes ResourceLibrary, PractitionerLibrary, Stories and Newsletter in their existing homepage positions. Production does not expose those design modules.

Load trusted Astro snippet components from src/components/home/hero-slides. Only filenames matching digits, a hyphen, and a name with .astro extension are active. Sort numerically, then by filename to break ties. Removing the number disables a snippet without deleting it. Number gaps are allowed. A non-numbered Welcome.astro is the zero-active-slides fallback.

Initial order: 01-giving-yourself-grace.astro (current live tree/article hero), 02-welcome.astro (preview forest/welcome hero). Shared carousel frame keeps the navy/purple overlay, white text, full-width responsive images and present hero scale. Manual previous/next buttons, labeled indicators, keyboard arrows within the carousel and horizontal touch swipe. No automatic advancement; no animation necessary. Only active slide links are focusable. Single-slide/fallback states omit navigation. Without JavaScript the first slide remains visible and controls remain hidden.

Use existing Astro/Vite glob discovery at build time, with no external dependency or GitHub request from the visitor's browser. Document GitHub filename editing and normal rebuild/deploy requirements. Deploy only preview; save source on a dedicated GitHub branch.
