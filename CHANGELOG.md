# Changelog

## 0.1.0 (unreleased)

First version. Rates every `SKILL.md` under a path on a ladder (GOOD · BETTER · BEST), read-only.

- GOOD: the specification's hard rules, as its reference validator `skills-ref` checks them: frontmatter, name (Unicode lowercase, matches its folder), description length, specification fields only, and `compatibility` (a string, at most 500 characters).
- BETTER: the description says what the skill does and when to use it; the body says what it needs, what it touches, its steps and when it is done; size limits; linked files exist.
- BEST: a `faf:start`/`faf:end` block with the same facts as YAML (`v: 1`), with type checks and consistency warnings.
- Follows symlinked skill folders (each skill is counted once).
- Works the same on Windows: code fences close in files with CRLF line endings, and reported paths use forward slashes.
- `--json`, `--all`, `--fail-under`.
