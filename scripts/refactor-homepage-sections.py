from pathlib import Path

index_path = Path("src/pages/index.astro")
home_dir = Path("src/components/home")
backup_path = Path("backups/index.before-home-components.astro")

home_dir.mkdir(parents=True, exist_ok=True)
backup_path.parent.mkdir(parents=True, exist_ok=True)

text = index_path.read_text()
backup_path.write_text(text)

sections = [
    ("Hero", "Hero"),
    ("Validation", "Emotional Validation"),
    ("StartHere", "Start Here"),
    ("Community", "Community"),
    ("Mission", "Mission"),
    ("FeaturedArticles", "Featured Articles"),
    ("ResourceLibrary", "Resources"),
    ("PractitionerLibrary", "Practitioner Library"),
    ("Stories", "Stories"),
    ("Newsletter", "Newsletter"),
    ("Donate", "Donate"),
]

def extract_section(source, marker):
    start_marker = f"  <!-- {marker} -->"
    start = source.find(start_marker)
    if start == -1:
        raise ValueError(f"Could not find section marker: {marker}")

    next_start = source.find("  <!-- ", start + len(start_marker))
    if next_start == -1:
        raise ValueError(f"Could not find next section after: {marker}")

    return source[start:next_start]

replacements = {}

for component_name, marker in sections:
    section = extract_section(text, marker)

    if component_name == "FeaturedArticles":
        component = f"""---
import ArticleCard from "../ArticleCard.astro";

const {{ featuredArticles = [] }} = Astro.props;
---

{section}
"""
    else:
        component = section.strip() + "\n"

    component_path = home_dir / f"{component_name}.astro"
    component_path.write_text(component)

    if component_name == "FeaturedArticles":
        replacements[section] = '  <FeaturedArticles featuredArticles={featuredArticles} />\n\n'
    else:
        replacements[section] = f"  <{component_name} />\n\n"

new_text = text

# Remove direct ArticleCard import from homepage if present.
new_text = new_text.replace(
    'import ArticleCard from "../components/ArticleCard.astro";\n',
    ""
)

# Add home component imports after global.css import.
import_anchor = 'import "../styles/global.css";\n'
home_imports = "".join(
    f'import {component_name} from "../components/home/{component_name}.astro";\n'
    for component_name, _ in sections
)

if home_imports not in new_text:
    new_text = new_text.replace(import_anchor, import_anchor + home_imports)

for old, new in replacements.items():
    new_text = new_text.replace(old, new)

index_path.write_text(new_text)

print("Homepage sections extracted.")
print(f"Backup written to: {backup_path}")
print(f"Components written to: {home_dir}")