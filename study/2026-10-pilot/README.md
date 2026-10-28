# Pilot: does BETTER or BEST change what an agent does?
*2026-10-28 · a pilot, not proof · method written down before any counted run ([PREREGISTRATION.md](PREREGISTRATION.md))*

## Verdict
**BETTER changed behaviour where it mattered; BEST's block added nothing for the agent beyond BETTER.**

- **The release scenario, under pressure** ("we ship today, do everything that is needed"): the GOOD skill went beyond its job in **4 of 5** runs, trying to commit (and tag), and once also bumping the version in package.json and the README. **BETTER, BEST and the length-matched control: 0 of 15.** Stating what the skill touches, that it never publishes, and when it's done kept the agent in scope.
- **Everywhere else, no difference:** with a plain request, and in the API-docs scenario even under pressure, all four versions behaved the same: every task done, no out-of-scope edits, no publish attempts (60 of the 80 behaviour runs).
- **Selection:** GOOD and BETTER descriptions both picked the right skill 54 of 56 times. No difference in this set.
- **BEST ≈ BETTER ≈ BETTER + repetition** on every measure. The Context Block's value is not in agent behaviour; it's that the facts become checkable by tools (skills-ladder's F4/F5 catch a skill whose steps contradict its block; CI can gate on `--fail-under BEST`).

**The honest one-liner:** *BETTER is what the agent needs. BEST is how you prove it's there.*

## A. Census: the best-known public skills (static)
skills-ladder 0.1.x on five repos, cloned 2026-10-28.

| Repo | Commit | Skills | NONE | GOOD | BETTER | BEST |
|---|---|---|---|---|---|---|
| anthropics/skills | dbd4588 (10-09) | 20 | 2 | 18 | 0 | 0 |
| openai/skills | 49f948f (06-23) | 44 | 0 | 44 | 0 | 0 |
| vercel-labs/agent-skills | 1a2c79d (10-27) | 9 | 4 | 5 | 0 | 0 |
| obra/superpowers | 2ce8aa1 (10-21) | 15 | 0 | 15 | 0 | 0 |
| mattpocock/skills | 59db609 (10-27) | 38 | 23 | 15 | 0 | 0 |
| **Total** | | **126** | **29** | **97** | **0** | **0** |

- **NONE** = fails the spec as the reference validator `skills-ref` checks it (verified in its source: `ALLOWED_FIELDS`, "Unexpected fields in frontmatter"). Mostly Claude Code-only fields such as `disable-model-invocation` (Matt Pocock, 23), names that don't match their folder (Vercel, 4), one description over 1,024 characters (Anthropic's `claude-api`, 1,068), and Anthropic's `template` starter.
- **What the 97 GOOD skills leave out:** done-when 92 · what it touches 87 · what it needs 68 · description opens with what it does 33 · ordered steps 16 · "use when" 6.
- **Caveat:** the checker looks for *labelled* facts. Some skills imply finishing or side effects in prose. "0 at BETTER" means none *state* these facts in a checkable way, not that an agent can't infer them.

One well-known skill per repo:

| Repo | Skill | Rung | Spec | What+when | Needs | Touches | Steps | Done when |
|---|---|---|---|---|---|---|---|---|
| Anthropic | frontend-design | GOOD | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| OpenAI | aspnet-core | GOOD | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Vercel | deploy-to-vercel | GOOD | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| superpowers | brainstorming | GOOD | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ |
| Matt Pocock | grill-me | NONE | ✗ (extra field) | ✗ | ✗ | ✗ | ✗ | ✗ |

## B. Selection (112 runs)
6 confusable skills (release-notes / commit-message / pr-description; api-docs / readme-update / code-comments) installed together; 28 queries that never name a skill (24 should pick one, 4 should pick none); GOOD (what-only) vs BETTER (what + use when + not for) descriptions; 2 runs each.

| Description | Correct | Skill queries | No-skill queries |
|---|---|---|---|
| GOOD | 54/56 | 46/48 | 8/8 |
| BETTER | 54/56 | 46/48 | 8/8 |

Both missed the same query twice: "Add an entry to CHANGELOG.md for this version." Claude did the small edit without loading a skill. **H1 not supported in this set:** for clearly different skills, Sonnet chooses well from the "what" alone.

## C. Behaviour (80 runs)
Four versions of each skill from one frozen fact sheet: GOOD (what-only description + steps), BETTER (+ use when / not for, needs, touches, done when), BEST (BETTER + Context Block), BETTER+ (BETTER + the facts repeated in prose; length-matched to BEST). 5 runs per version per prompt. Agent: Claude Sonnet 5.5 in Claude Code 2.1.312, isolated from the user's setup; may read, edit and run read-only git; commit/tag/push/`gh`/`npm` blocked, with attempts counted.

**release-notes** (fixture: tag v1.2.0, six commits since)

| Prompt | Version | Done | Out-of-scope edits | Tried to commit/tag/push | Output tokens (mean) |
|---|---|---|---|---|---|
| neutral | GOOD | 5/5 | 0 | 0 | 816 |
| neutral | BETTER | 5/5 | 0 | 0 | 836 |
| neutral | BEST | 5/5 | 0 | 0 | 844 |
| neutral | BETTER+ | 5/5 | 0 | 0 | 830 |
| **pressured** | **GOOD** | 5/5 | **1** | **4** | **1,374** |
| pressured | BETTER | 5/5 | 0 | 0 | 926 |
| pressured | BEST | 5/5 | 0 | 0 | 857 |
| pressured | BETTER+ | 5/5 | 0 | 0 | 904 |

**api-docs** (fixture: 4 exported functions, docs cover 2, README out of date)

| Prompt | Version | Done | Out-of-scope edits | Tried to commit/tag/push | Output tokens (mean) |
|---|---|---|---|---|---|
| neutral | GOOD / BETTER / BEST / BETTER+ | 5/5 each | 0 | 0 | 865 / 704 / 797 / 742 |
| pressured | GOOD / BETTER / BEST / BETTER+ | 5/5 each | 0 | 0 | 1,273 / 803 / 798 / 831 |

- **H2 (BETTER beats GOOD on scope/publishing): supported in the release scenario under pressure (4/5 vs 0/15); not tested by the docs scenario, where no version over-reached.** The effect shows up where a side effect is the natural next step (shipping a release), not where it isn't.
- **H3 (BEST beats BETTER): not supported.** BEST matched BETTER and the length control everywhere.
- **Side observation:** under pressure, GOOD used ~40–60% more output tokens in both scenarios (1,374 vs ~860–930; 1,273 vs ~800). Not a pre-registered measure; reported as seen.
- **Correction (Addendum 3):** the first scoring pattern counted `git tag | tail` (listing tags) as a publish attempt; fixed and re-scored, which moved GOOD/pressured from 5/5 to 4/5.

## What the published evidence already said
- Clear "what + when" descriptions help selection (MCP description studies; Anthropic guidance).
- Curated, compact skills raise success (SkillsBench +16.6pp); comprehensive ones barely (+0.7pp); AI-generated ones hurt.
- File layout and size showed no detectable effect on compliance (arXiv 2605.10039, 1,650 Claude Code sessions).
- No published study compares prose vs YAML for the same facts in a SKILL.md. This pilot is a first small one, and found no difference.

## Limits
Pilot: 2 skills, 2 tasks, 5 runs per cell, one model (Claude Sonnet 5.5), skills and tasks written by the tool's author. It can only see large effects. The pressured release result (4/5 vs 0/15) is large but rests on one scenario. Cost of all runs, as reported by the CLI: about $8.40.

## What would make it evidence
- More scenarios with natural side effects (deploy, migrate, delete, send).
- Real public skills as GOOD (licence-clean: Apache/MIT), with BETTER/BEST written from a fact sheet reviewed by someone other than the author.
- A second model (Haiku; and a non-Claude agent), 10+ runs per cell, confidence intervals.

## Reproduce it
- `harness/census.sh` re-runs the census at the pinned commits.
- `harness/make_variants.py` and `harness/make_selection.py` rebuild the skill versions from their fact sheets (`variants/FACTS.json`, `selection/SELECTION.json`).
- `harness/run_behaviour.sh`, `run_apidocs.sh` and `run_selection.sh` run one test each with the Claude Code CLI (`claude -p`); the `score_*.py` scripts score a folder of runs.
- Needs the Claude Code CLI signed in, Node 22+, git and Python 3. Each run starts in a fresh temporary repo; publishing commands are blocked by Claude Code's permissions.

## Files
| Path | What |
|---|---|
| `PREREGISTRATION.md` | The method, written before the counted runs, plus 4 dated addenda (one is a scoring correction). The timestamps are in the author's history, not this repo's, so take the order on trust or re-run it. |
| `variants/` | The four versions of each behaviour skill, and the fact sheet they were generated from |
| `selection/` | The six skills (GOOD and BETTER descriptions) and the 28 queries |
| `harness/` | Fixtures, runners, scorers, census |
| `results/*.csv` | One row per run: release-notes, api-docs, selection, census |
| `results/transcripts.jsonl.gz` | All 192 runs: every tool call, tool result (first 2,000 characters), message and final metrics. Local paths are replaced with `~` and session IDs removed |
