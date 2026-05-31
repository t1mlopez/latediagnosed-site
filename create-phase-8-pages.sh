#!/bin/bash

set -e

PAGES=(
  "resources:Resources"
  "community:Community"
  "about:About"
  "organization:Organization"
  "updates:Updates"
  "contact:Contact"
  "donate:Donate"
  "privacy-policy:Privacy Policy"
  "terms-of-use:Terms of Use"
  "medical-disclaimer:Medical Disclaimer"
)

for PAGE in "${PAGES[@]}"; do
  SLUG="${PAGE%%:*}"
  TITLE="${PAGE#*:}"

  FILE="src/pages/${SLUG}.astro"

  cat > "$FILE" <<EOF
---
import Layout from "../layouts/Layout.astro";
---

<Layout title="${TITLE} | Late Diagnosed">
  <main class="min-h-screen bg-slate-950 text-white">
    <section class="mx-auto max-w-5xl px-6 py-24">
      <p class="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-300">
        Late Diagnosed
      </p>

      <h1 class="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
        ${TITLE}
      </h1>

      <p class="max-w-2xl text-lg leading-8 text-slate-300">
        This page is currently being built. Placeholder content will be replaced in a future phase.
      </p>
    </section>
  </main>
</Layout>
EOF

  echo "Created $FILE"
done

echo ""
echo "Phase 8 pages created."
echo "Run: npm run dev"
