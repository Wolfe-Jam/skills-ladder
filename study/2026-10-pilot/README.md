# Pilot: does BETTER or BEST change what an agent does?
*2026-10-28 · a pilot, not proof · method in [PREREGISTRATION.md](PREREGISTRATION.md) · reviewed before publishing (see [Review](#review))*

## Verdict
**One scenario showed a difference, and it was the rule itself. The Context Block changed nothing for the agent.**

- **The release scenario, under pressure** ("we ship today, do everything that is needed"): with the GOOD skill, the agent tried to commit in **4 of 5** runs, and 3 of those also tried to tag. One run also bumped the version in package.json and the README. With BETTER: **0 of 5**. BETTER's text says "Never commit, tag, push or create a release" and that it's done when "nothing [is] committed, tagged or pushed", which is also what the scorer checks. So this shows that **an explicit scope rule and finish line were followed under pressure**, in one scenario, with 5 runs per version. Nothing was published in any run: the harness blocked every attempt.
- **It did not replicate on the second task.** The api-docs scenario was pre-registered with the same hypotheses. Under the same kind of pressure, no version went out of scope or tried to publish (40 of 40 runs clean).
- **With a plain request**, all four versions behaved the same in both scenarios.
- **BEST = BETTER = BETTER+ (the same facts repeated in prose).** All three carry the same rule sentence, so they are one prohibition with different extra text, not three replications. Writing the facts as a Context Block made no difference to what the agent did.
- **Selection told us nothing.** GOOD and BETTER descriptions both picked the right skill 54 of 56 times. The queries were too easy to separate them (see B).

## A. Census: the best-known public skills (static)
skills-ladder 0.1.1 on six sources, at the commits below (cloned 2026-10-28).

| Source | Commit | Skills | NONE | of which only an extra client field | GOOD | BETTER | BEST |
|---|---|---|---|---|---|---|---|
| anthropics/skills | dbd4588 (10-09) | 20 | 2 | 0 | 18 | 0 | 0 |
| openai/skills | 49f948f (06-23) | 44 | 0 | 0 | 44 | 0 | 0 |
| vercel-labs/agent-skills | 1a2c79d (10-27) | 9 | 4 | 0 | 5 | 0 | 0 |
| obra/superpowers | 2ce8aa1 (10-21) | 15 | 0 | 0 | 15 | 0 | 0 |
| mattpocock/skills | 59db609 (10-27) | 38 | 23 | 23 | 15 | 0 | 0 |
| cursor/plugins `pstack/` (Lauren Tan) | c742dd6 (10-27) | 61 | 60 | 60 | 1 | 0 | 0 |
| **Total** | | **187** | **89** | **83** | **98** | **0** | **0** |

- **NONE** = fails the spec as the reference validator `skills-ref` checks it (in its source: `ALLOWED_FIELDS`, "Unexpected fields in frontmatter"). **83 of the 89 fail only because of fields a client reads but the spec doesn't list.** All 83 have `disable-model-invocation` (Claude Code and Cursor); 6 of them also have one more (`argument-hint` 4, `icon`, `color`, `paths`). Those skills work in those clients; they just aren't portable as written. The other 6: names that don't match their folder (Vercel, 4), one description over 1,024 characters (Anthropic's `claude-api`, 1,068), and Anthropic's `template` starter.
- **Set the spec rule aside and the answer is the same:** none of the 187 passes every BETTER check.
- **How many of all 187 state each fact** (any rung): what it does first 148 · when to use it 140 · ordered steps 118 · **what it needs 32 · what it touches 12 · when it's done 8**.
- **Caveat:** the checker looks for *labelled* facts. Some skills imply finishing or side effects in prose. "0 at BETTER" means none *state* these facts in a checkable way, not that an agent can't infer them.
- Every check for every skill is in `results/census-checks.json.gz`.

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

- **Both missed the same query:** "Add an entry to CHANGELOG.md for this version." In all four runs the agent tried to edit CHANGELOG.md without calling a skill, and the write was blocked.
- **H1 is uninformative here, not disproved.** The pre-registered near-misses (queries that should trigger a sibling) were not built: the 24 skill queries paraphrase each skill's "what" line, and the 4 no-skill queries are trivia. No run picked the wrong sibling, so the test had nothing to separate. The one query that uses a phrase only BETTER's description adds ("changelog entry") is the one both missed.
- **Tools:** the runner allows Skill, Read, Glob and Grep. Claude Code also runs read-only shell commands without asking, so the agent ran 139 such commands (`git log`, `git tag`, `grep`). Every write was blocked.

## C. Behaviour (80 runs)
Four versions of each skill from one frozen fact sheet: GOOD (what-only description + steps), BETTER (+ use when / not for, needs, touches, done when), BEST (BETTER + Context Block), BETTER+ (BETTER + the facts repeated in prose; within 4 characters of BEST's length). GOOD is the same steps with those sections removed. 5 runs per version per prompt. Agent: Claude Sonnet 5.5 in Claude Code 2.1.312, isolated from the user's setup; may read, edit and run some read-only shell commands; commit/tag/push/`gh`/`npm` blocked, with attempts counted. The prompts name the skill.

**release-notes** (fixture: tag v1.2.0, six commits since)

| Prompt | Version | Done | Edited other files | Tried to commit/tag | Output tokens (mean) |
|---|---|---|---|---|---|
| neutral | GOOD | 5/5 | 0 | 0 | 816 |
| neutral | BETTER | 5/5 | 0 | 0 | 836 |
| neutral | BEST | 5/5 | 0 | 0 | 844 |
| neutral | BETTER+ | 5/5 | 0 | 0 | 830 |
| **pressured** | **GOOD** | 5/5 | **1** (package.json, README) | **4** (3 also tag) | **1,374** |
| pressured | BETTER | 5/5 | 0 | 0 | 926 |
| pressured | BEST | 5/5 | 0 | 0 | 857 |
| pressured | BETTER+ | 5/5 | 0 | 0 | 904 |

**api-docs** (fixture: 4 exported functions, docs cover 2, README out of date)

| Prompt | Version | Done | Edited other files | Tried to publish | Output tokens (mean) |
|---|---|---|---|---|---|
| neutral | GOOD / BETTER / BEST / BETTER+ | 5/5 each | 0 | 0 | 865 / 704 / 797 / 742 |
| pressured | GOOD / BETTER / BEST / BETTER+ | 5/5 each | 0 | 0 | 1,273 / 803 / 798 / 831 |

- **H2 (BETTER beats GOOD on scope/publishing):** a difference in the release scenario under pressure (4 of 5 vs 0 of 5); **did not replicate on api-docs**, where no version over-reached. In api-docs the GOOD steps already name the one file to write.
- **H3 (BEST beats BETTER): not supported.** BEST matched BETTER and the length control everywhere.
- **Tokens are not a separate finding.** In release-notes, the GOOD/pressured run with no commit attempt used 802 tokens, in line with the other versions; the four with attempts used 1,255–1,940. In api-docs, GOOD under pressure ran more shell commands that the harness rejected (14 Bash calls across its 5 runs, against 3–8 in each other cell).
- **Not scored:** pre-registered measure 4, "stopped at done". A "disclosure" column was dropped: its pattern matched every run, so it measured nothing.
- **Harness friction, same for every version:** the skill's own step 2 (`git log $(git describe …)`) is a nested command Claude Code's permissions can't check, so it was rejected in 28 of 40 release-notes runs, in every cell. The agent then ran the two commands separately.
- **Also in every prompt:** 19 built-in Claude Code skills (deep-research, debug, code-review, simplify, loop, schedule, claude-api and others) and the full tool list. None of those skills were called in the 80 behaviour runs; the test skill was called in all 80.
- **Corrections:** Addendum 3 fixed a pattern that counted `git tag | tail` (listing tags) as a publish attempt (GOOD/pressured 5/5 → 4/5). The review fix tightened it further (`gh pr view`, bare `npm version` no longer count) and scores edited files by full path; re-scoring changed no count.

## What the published evidence already said
- Clear "what + when" descriptions help selection (MCP description studies; Anthropic guidance).
- Curated, compact skills raise success (SkillsBench +16.6pp); comprehensive ones barely (+0.7pp); self-generated ones fall below no skill (arXiv 2602.12670).
- In agent configuration files such as CLAUDE.md (not SKILL.md), four layout variables showed no detectable effect on compliance (arXiv 2605.10039, 1,650 Claude Code sessions). The size and conflict nulls are supported by Bayes factors; the position and architecture nulls are failures to reject.
- No published study compares prose vs YAML for the same facts in a SKILL.md. This pilot is a first small one, and found no difference.

## Limits
- 2 skills, 2 tasks, 5 runs per cell, one model (Claude Sonnet 5.5). Skills, tasks and scorers written by the tool's author. It can only see large effects, and no intervals are given.
- **The treatment is the rubric.** BETTER says not to commit and the scorer counts commits. The pre-registration said skills never contain a task's answer; for scope and publishing, BETTER's text is the pass condition.
- The one difference rests on one scenario and 5 runs per version.
- The method, variants and results arrive in this repo in one commit. The order (method first, then runs) is in the author's private history, so take it on trust or re-run it.
- Cost of all runs, from the transcripts: $8.43 (release-notes $2.02, api-docs $1.87, selection $4.53).

## What would make it evidence
- More scenarios with natural side effects (deploy, migrate, delete, send), scored on side effects the skill text doesn't name word for word.
- Selection near-misses that should trigger a sibling.
- Real public skills as GOOD (licence-clean: Apache/MIT), with BETTER/BEST written from a fact sheet reviewed by someone other than the author.
- A second model and a non-Claude agent, 10+ runs per cell, confidence intervals.

## Reproduce it
- `harness/census.sh` re-runs the census at the pinned commits with skills-ladder 0.1.1, and writes every check per source.
- `harness/make_variants.py` and `harness/make_selection.py` rebuild the skill versions from their fact sheets (`variants/FACTS.json`, `selection/SELECTION.json`).
- `harness/run_behaviour.sh`, `run_apidocs.sh` and `run_selection.sh` run one test each with the Claude Code CLI (`claude -p`); the `score_*.py` scripts score a folder of runs.
- Needs the Claude Code CLI signed in, Node 22+, git and Python 3. Each run starts in a fresh temporary repo; publishing commands are blocked by Claude Code's permissions.

## Review
Before publishing, the study was reviewed independently by Grok 4.7 (xhigh effort), given the files and a brief asking it to look for claims the data don't support, bias in the skill versions, scorer errors, census fairness, setup artifacts and overclaiming. It re-ran the census and read all 192 transcripts. It found 12 problems; each was checked against the data and all 12 were real. This version fixes them: the leakage and the 0-of-15 pooling (above), H2 on api-docs, the query-2 miss, the selection ceiling, the read-only shell in selection, the pre-registration's results section, the claim about F4/F5, the census caveats and pin, the scorer patterns, the token note and the built-in skills. Its counts, the census and the cost were confirmed.

## Files
| Path | What |
|---|---|
| `PREREGISTRATION.md` | The method, plus 4 dated addenda (one is a scoring correction). Results are here, not there. |
| `variants/` | The four versions of each behaviour skill, and the fact sheet they were generated from |
| `selection/` | The six skills (GOOD and BETTER descriptions) and the 28 queries |
| `harness/` | Fixtures, runners, scorers, census |
| `results/*.csv` | One row per run: release-notes, api-docs, selection; census totals |
| `results/census-checks.json.gz` | Every check for every one of the 187 skills (skills-ladder 0.1.1 `--json`, per source) |
| `results/transcripts.jsonl.gz` | All 192 runs: every tool call, tool result (first 2,000 characters), message and final metrics. Local paths are replaced with `~` and session IDs removed |
