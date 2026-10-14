# Homepage hero slides

Each numbered `.astro` file is one slide. The homepage discovers this folder automatically during the site build.

- `01-giving-yourself-grace.astro`: first slide
- `02-welcome.astro`: second slide
- `welcome.astro`: inactive (no number)

## Add a slide
Copy `01-giving-yourself-grace.astro` into a new file such as `03-community.astro`. Change the exported `title` (used by the controls), heading, description, button, link and image paths. Keep the `first` prop forwarding so the carousel prioritizes only the first image. Store image assets in `public/images/` (their URLs begin `/images/`). No homepage change or slide-list change is needed.

## Pause or restore
Rename `03-community.astro` to `community.astro` to take it out of rotation. Restore the numeric prefix to enable it again. This works in GitHub's file editor: change the filename and commit.

## Reorder
Change numeric prefixes. They sort as numbers, so `2-...` comes before `10-...`. Gaps are allowed. If numbers match, filenames break the tie alphabetically.

Commit changes to the branch deployed by preview; publishing rebuilds the folder. Changes become visible after deployment, not immediately when a file is renamed. Production uses its own branch/build.

`Welcome.astro` is a shared, unnumbered fallback: it never joins rotation on its own. The numbered `02-welcome.astro` wraps it. If no numbered slides remain, the welcome hero appears without controls. One numbered slide also appears without controls.

The carousel advances every five seconds. Arrows, labeled indicators, keyboard arrows and horizontal touch swipes also work. A pause/play control is available. Rotation pauses while hovered, while keyboard focus is inside the carousel, or while the tab is hidden. Reduced-motion preferences start rotation paused; visitors can explicitly start it. Without JavaScript only the first active slide appears and the controls remain hidden.

These are trusted website source snippets, not visitor-submitted HTML. Keep disabled snippets valid Astro code because the build imports the folder.
