---
name: api-docs
description: Generates reference documentation for the functions a module exports. Use when the user asks to document the API or update the API reference. Not for the README or comments inside source files.
---

<!-- faf:start -->
```yaml
v: 1
needs: [grep]
reads: [src/]
writes: [docs/API.md]
network: []
publishes: false
done_when: docs/API.md has one section per exported function; no other file changed; nothing committed, tagged or pushed
```
<!-- faf:end -->

# Api Docs

Generates reference documentation for the functions a module exports.

## Needs

grep.

## Touches

- Reads: src/.
- Writes: docs/API.md only.
- Network: none.
- Publishes: no. Never commit, tag, push or create a release.

## Steps

1. Find the exported functions in src/ with `grep -n "^export function" -r src`.
2. Read each one's parameters and return value.
3. Write docs/API.md: one section per exported function, with its signature and one sentence on what it does.
4. Check that every exported function has a section.

## Done when

docs/API.md has one section per exported function; no other file changed; nothing committed, tagged or pushed.
