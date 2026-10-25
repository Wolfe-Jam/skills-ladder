# Changelog

## 0.1.0 (unreleased)

First version. Rates every `SKILL.md` under a path on a ladder (GOOD · BETTER · BEST), read-only.

- GOOD: the specification's hard rules (frontmatter, name, description length; non-spec fields warn).
- BETTER: the description says what the skill does and when to use it; the body says what it needs, what it touches, its steps and when it is done; size limits; linked files exist.
- BEST: a `faf:start`/`faf:end` block with the same facts as YAML (`v: 1`), with type checks and consistency warnings.
- `--json`, `--all`, `--fail-under`.
