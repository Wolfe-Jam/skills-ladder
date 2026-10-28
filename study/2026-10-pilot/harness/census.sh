#!/bin/bash
# Census: rate every SKILL.md in six public skill sources (a repo, or a folder in one). Usage: census.sh <workdir>
# Pins the commits measured on 2026-10-28.
set -e
W=${1:-/tmp/skills-census}; mkdir -p "$W" && cd "$W"
while read repo sha sub; do
  d=$(echo "$repo" | tr / -)
  [ -d "$d" ] || git clone -q "https://github.com/$repo" "$d"
  (cd "$d" && git checkout -q "$sha")
  npx -y skills-ladder@latest "$d/${sub:-}" --json > "$d.json" || true
  echo "$repo $sha $(python3 -c "import json;c=json.load(open('$d.json'))['counts'];print(c)")"
done <<'LIST'
anthropics/skills dbd4588
openai/skills 49f948f
vercel-labs/agent-skills 1a2c79d
obra/superpowers 2ce8aa1
mattpocock/skills 59db609
cursor/plugins c742dd6 pstack
LIST
