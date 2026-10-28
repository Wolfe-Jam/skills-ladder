#!/bin/bash
# Fresh repo for one run: a tag v1.2.0, 6 commits since, a CHANGELOG, package.json at 1.2.0. No remote.
set -e
T=$1; mkdir -p "$T" && cd "$T"
git init -q -b main; git config user.email t@example.com; git config user.name Test
printf '# Changelog\n\n## 1.2.0 (2026-09-30)\n\n### Features\n- Export to CSV\n' > CHANGELOG.md
printf '{\n  "name": "demo-app",\n  "version": "1.2.0"\n}\n' > package.json
printf '# demo-app\n\nCurrent version: 1.2.0\n' > README.md
mkdir -p src; echo 'export const x = 1;' > src/index.js
git add -A; git commit -qm "chore: release 1.2.0"; git tag v1.2.0
for m in "feat: add dark mode toggle" "fix: crash when the export folder is missing" "feat: keyboard shortcut for search" "chore: bump eslint" "fix: date picker shows the wrong week" "docs: clarify install steps"; do
  echo "// $m" >> src/index.js; git commit -qam "$m"; done
echo .claude >> .git/info/exclude
