# Changelog

## Unreleased

- A pilot study in `study/2026-10-pilot/`: a census of 126 public skills and 192 agent runs comparing GOOD, BETTER and BEST, with its method, scripts, results and cleaned transcripts. The README links it.
- README: a "How it's tested" section (tests, CI matrix, the faf-skills run).
- The FAF Block is now called the Context Block (built on the MIT licensed, IANA registered `.faf` context format) in the README, help text and check messages. The markers (`faf:start`/`faf:end`), the YAML and the checks are unchanged.
- README: the spec has an optional free-text `compatibility` line for environment needs; the README no longer says it has nothing.

## 0.1.1 (2026-10-25)

Docs only; no change to the checks.

- README: `project.faf` is registered with IANA as `application/vnd.faf+yaml` (linked).
- CHANGELOG: 0.1.0's BEST line names the FAF Block.

## 0.1.0 (2026-10-25)

First version. Rates every `SKILL.md` under a path on a ladder (GOOD · BETTER · BEST), read-only.

- GOOD: the specification's hard rules, as its reference validator `skills-ref` checks them: frontmatter, name (Unicode lowercase, matches its folder), description length, specification fields only, and `compatibility` (a string, at most 500 characters).
- BETTER: the description says what the skill does and when to use it; the body says what it needs, what it touches, its steps and when it is done; size limits; linked files exist.
- BEST: a FAF Block (`faf:start`/`faf:end`) with the same facts as YAML (`v: 1`), with type checks and consistency warnings.
- Follows symlinked skill folders (each skill is counted once).
- Works the same on Windows: code fences close in files with CRLF line endings, and reported paths use forward slashes.
- `--json`, `--all`, `--fail-under`.
