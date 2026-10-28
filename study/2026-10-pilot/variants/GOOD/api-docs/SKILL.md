---
name: api-docs
description: Generates reference documentation for the functions a module exports.
---

# Api Docs

Generates reference documentation for the functions a module exports.

## Steps

1. Find the exported functions in src/ with `grep -n "^export function" -r src`.
2. Read each one's parameters and return value.
3. Write docs/API.md: one section per exported function, with its signature and one sentence on what it does.
4. Check that every exported function has a section.
