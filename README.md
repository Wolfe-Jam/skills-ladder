# skills-ladder

Rate Agent Skills (`SKILL.md`) on a ladder. Read-only: it never changes a file.

```bash
npx skills-ladder .
```

An agent picks a skill by its description and uses it through its body. This checker asks whether a skill gives an agent what it needs for both: when to load it, what it needs, what it touches, and when it is done.

| Rung | Means |
|---|---|
| **GOOD** | Valid: passes the [specification](https://agentskills.io/specification)'s hard rules, the same ones its reference validator (`skills-ref`) checks |
| **BETTER** | Says when to use it, what it needs, what it touches, its steps, and when it's done |
| **BEST** | BETTER, with those facts in a small block a tool can check |

A skill that doesn't pass GOOD is reported as `NONE`.

The specification asks only for GOOD. BETTER and BEST are this project's view of what an agent needs beyond that, and most skills today stop at GOOD. Run it on yours to see what's missing.

For general linting (formatting, auto-fix, security scanning), use a linter such as [`skill-check`](https://www.npmjs.com/package/skill-check) as well. `skills-ladder` checks what linters don't: whether the skill says what it needs, what it touches and when it's done.

## Example

```text
skills-ladder 0.1.0 · 2 skills

BETTER  release-notes  release-notes/SKILL.md
  ✗ F1 One FAF block, right after the frontmatter — No FAF block. Add one between `<!-- faf:start -->` and `<!-- faf:end -->` (see the README).

GOOD  deploy  deploy/SKILL.md
  ✗ B5 Body says what it touches — Say what it reads, what it writes, and whether it sends or publishes anything. An agent should know before step 1.
  ✗ B7 Body says when it is done — Add a Done when line: the finished state of the work (files, results), not a step in the conversation.

BEST 0 · BETTER 1 · GOOD 1 · NONE 0
```

By default each skill shows the failures that stand between it and the next rung, plus warnings. `--all` shows every check.

## The checks

**GOOD**: the specification's hard rules

| ID | Check |
|---|---|
| G1 | Frontmatter is present and parses as YAML |
| G2 | `name` is 1–64 lowercase letters (Unicode), digits and single hyphens, and matches its folder |
| G3 | `description` is 1–1024 characters |
| G4 | Frontmatter uses only specification fields. Put client-specific fields under `metadata` |
| G5 | `compatibility`, if present, is 1–500 characters |

**BETTER**: chosen correctly, used safely

| ID | Check |
|---|---|
| B1 | The description opens with what the skill does, in the third person |
| B2 | The description says when to use it ("Use when…") |
| B3 | *(warning)* The description says what it is not for, where a nearby task could trigger it |
| B4 | The body says what it needs: tools, versions, access |
| B5 | The body says what it touches: what it reads, what it writes, whether it sends or publishes |
| B6 | The body gives ordered steps |
| B7 | The body says when it is done |
| B8 | Under 500 lines and about 5,000 tokens |
| B9 | Linked local files exist |

B4–B7 look for a heading or a label at the start of a line (`**Needs:**`, `## Steps`, `**Done when:**`). They are heuristics: they find whether the section is there, not whether it is right.

**BEST**: the FAF block

| ID | Check |
|---|---|
| F1 | One block between `<!-- faf:start -->` and `<!-- faf:end -->`, right after the frontmatter |
| F2 | The block's YAML parses |
| F3 | The required fields are present, with the right types |
| F4 | *(warning)* `publishes: false`, but the steps mention pushing, posting or publishing |
| F5 | *(warning)* `writes: []`, but the steps mention writing files |
| F6 | *(warning)* The repo has a `project.faf` and the block doesn't point to it |

## The block

````markdown
---
name: release-notes
description: Drafts release notes from merged pull requests since the last tag. Use when the user asks for release notes or a changelog entry. Not for commit messages.
---

<!-- faf:start -->
```yaml
v: 1
needs: [git, gh >= 2.40]
reads: [git history, GitHub pull requests]
writes: [CHANGELOG.md]
network: [github.com (read)]
publishes: false
done_when: CHANGELOG.md has one new section; nothing pushed
```
<!-- faf:end -->

# Release notes

## Steps
1. …
````

| Field | Type | Meaning |
|---|---|---|
| `v` | `1` | Block format version |
| `needs` | list | Tools with a version floor where it matters, and access (`GITHUB_TOKEN`). `[]` if none |
| `reads` | list | What it reads |
| `writes` | list | Files or state it changes. `[]` means read-only |
| `network` | list | Hosts, with `(read)` or `(write)`. `[]` means offline |
| `publishes` | boolean | `true` if it sends, posts, pushes, deploys or publishes anything beyond the machine |
| `done_when` | string | The finished state of the work. Not a step in the conversation: agents stop at whatever it names |
| `project` | path, optional | The project's `project.faf`, for the agent to read first |

The specification puts no format rules on the body, so the block is valid in any skill today. The body loads only when the skill is used, so the block costs nothing when an agent is choosing between skills.

The block holds facts only. Name access (`GITHUB_TOKEN`), never its value.

## The project around the skills

`skills-ladder` rates each skill. The repo they live in can carry a `project.faf`, which [faf-cli](https://www.npmjs.com/package/faf-cli) scores against its app-type: `skills` for SKILL.md folders, `skills-plugin` for skills shipped as a plugin with a build and CI. The FAF block's `project` field points to it, and F6 checks that it does.

```bash
npx faf-cli auto                                # the repo: project.faf
npx skills-ladder skills --fail-under BEST      # each skill
```

## Options

```text
skills-ladder [path...]          every SKILL.md under each path (default: .)
  --json                         machine-readable output
  --all                          show passing checks too
  --fail-under <GOOD|BETTER|BEST>  exit 1 if any skill is below this rung
```

Exit codes: `0` checked · `1` a skill is below `--fail-under`, or no `SKILL.md` was found · `2` bad arguments or an unreadable path.

In CI:

```bash
npx skills-ladder skills --fail-under BETTER
```

## Library

```js
import { checkPath } from "skills-ladder";

for (const r of checkPath("skills")) console.log(r.rung, r.name);
```

## License

MIT
