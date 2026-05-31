#!/bin/bash

set -e

mkdir -p content/pages

cat > content/pages/resources.md <<'EOF'
---
title: Resources
---

Placeholder content for Resources.
EOF

cat > content/pages/community.md <<'EOF'
---
title: Community
---

Placeholder content for Community.
EOF

cat > content/pages/about.md <<'EOF'
---
title: About
---

Placeholder content for About.
EOF

cat > content/pages/organization.md <<'EOF'
---
title: Organization
---

Placeholder content for Organization.
EOF

cat > content/pages/updates.md <<'EOF'
---
title: Updates
---

Placeholder content for Updates.
EOF

cat > content/pages/contact.md <<'EOF'
---
title: Contact
---

Placeholder content for Contact.
EOF

cat > content/pages/donate.md <<'EOF'
---
title: Donate
---

Placeholder content for Donate.
EOF

echo "Tina page content files created."
