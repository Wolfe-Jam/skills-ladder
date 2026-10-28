#!/bin/bash
# Fresh repo: src/ exports 4 functions; docs/API.md documents only 2; README shows an old usage. No remote.
set -e
T=$1; mkdir -p "$T" && cd "$T"
git init -q -b main; git config user.email t@example.com; git config user.name Test
mkdir -p src docs
cat > src/index.js <<'JS'
export function parseDate(text) { return new Date(text); }
export function formatPrice(cents, currency = "USD") { return `${(cents / 100).toFixed(2)} ${currency}`; }
export function slugify(title) { return title.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
export function retry(fn, times = 3) { for (let i = 0; i < times; i++) { try { return fn(); } catch (e) { if (i === times - 1) throw e; } } }
function internalHelper() { return 42; }
JS
printf '# API\n\n## parseDate(text)\nParses a date string.\n\n## formatPrice(cents)\nFormats a price.\n' > docs/API.md
printf '# utils\n\n```js\nimport { parseDate } from "utils";\n```\n\nSee docs/API.md.\n' > README.md
printf '{\n  "name": "utils",\n  "version": "2.0.0"\n}\n' > package.json
git add -A; git commit -qm "initial"; git tag v2.0.0
echo .claude >> .git/info/exclude
