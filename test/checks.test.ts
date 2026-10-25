import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkPath, parseSkill, runChecks, rungOf } from "../src/index.ts";

const FIX = fileURLToPath(new URL("./fixtures", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const ctx = (dir = "demo", over: Partial<Parameters<typeof runChecks>[1]> = {}) => ({ dir, exists: () => true, projectFaf: false, ...over });
const skill = (fm: string, body = "") => parseSkill(`---\n${fm}\n---\n${body}`);
const status = (s: ReturnType<typeof parseSkill>, id: string, c = ctx()) => runChecks(s, c).find((r) => r.id === id)?.status;

const GOOD_DESC = "description: Drafts release notes from merged pull requests. Use when the user asks for release notes. Not for commit messages.";
const BETTER_BODY = `
**Needs:** git.

**Writes:** CHANGELOG.md. Never publishes.

## Steps
1. Read the tags.
2. Write the section.

**Done when:** CHANGELOG.md has one new section.
`;
const block = (yaml: string) => `\n<!-- faf:start -->\n\`\`\`yaml\n${yaml}\n\`\`\`\n<!-- faf:end -->\n`;
const FULL_BLOCK = "v: 1\nneeds: [git]\nreads: [git history]\nwrites: [CHANGELOG.md]\nnetwork: []\npublishes: false\ndone_when: CHANGELOG.md has one new section";

test("fixtures land on the expected rungs", () => {
  const byName = Object.fromEntries(checkPath(FIX).map((r) => [r.file.split("/")[0], r.rung]));
  assert.deepEqual(byName, { "best-notes": "BEST", "better-notes": "BETTER", "broken-name": "NONE", "good-notes": "GOOD" });
});

test("GOOD: name must be a slug and match its folder", () => {
  assert.equal(status(skill(`name: demo\n${GOOD_DESC}`), "G2"), "pass");
  assert.equal(status(skill(`name: other\n${GOOD_DESC}`), "G2"), "fail");
  assert.equal(status(skill(`name: Demo_X\n${GOOD_DESC}`), "G2", ctx("Demo_X")), "fail");
  assert.equal(status(skill(`name: -demo\n${GOOD_DESC}`), "G2", ctx("-demo")), "fail");
  assert.equal(status(skill(`name: a--b\n${GOOD_DESC}`), "G2", ctx("a--b")), "fail");
});

test("GOOD: description length limit is 1024", () => {
  assert.equal(status(skill(`name: demo\ndescription: ${"x".repeat(1024)}`), "G3"), "pass");
  assert.equal(status(skill(`name: demo\ndescription: ${"x".repeat(1025)}`), "G3"), "fail");
  assert.equal(status(skill(`name: demo\ndescription: ""`), "G3"), "fail");
});

test("GOOD: missing or broken frontmatter fails G1 and the rung", () => {
  const none = parseSkill("# no frontmatter\n");
  assert.equal(status(none, "G1"), "fail");
  assert.equal(rungOf(runChecks(none, ctx())), "NONE");
  assert.equal(status(parseSkill("---\nname: [unclosed\n---\n"), "G1"), "fail");
});

test("GOOD: client-specific fields warn but don't block", () => {
  const s = skill(`name: demo\n${GOOD_DESC}\nargument-hint: "[path]"`);
  assert.equal(status(s, "G4"), "warn");
  assert.notEqual(rungOf(runChecks(s, ctx())), "NONE");
});

test("BETTER B1: what first, third person", () => {
  assert.equal(status(skill(`name: demo\n${GOOD_DESC}`), "B1"), "pass");
  assert.equal(status(skill("name: demo\ndescription: I help you write notes. Use when asked."), "B1"), "fail");
  assert.equal(status(skill("name: demo\ndescription: You can use this to write notes. Use when asked."), "B1"), "fail");
  assert.equal(status(skill("name: demo\ndescription: Use this skill whenever notes are needed."), "B1"), "fail");
});

test("BETTER B2: recognises the common trigger phrasings", () => {
  for (const d of ["Use when the user asks.", "Use this skill whenever a .docx is involved.", "Use this skill any time a deck is mentioned.", "Use for changelogs.", "Triggers include any mention of PDF."])
    assert.equal(status(skill(`name: demo\ndescription: Drafts notes. ${d}`), "B2"), "pass", d);
  assert.equal(status(skill("name: demo\ndescription: Helps with release notes."), "B2"), "fail");
});

test("BETTER: needs, touches, steps and done-when, in prose", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, BETTER_BODY);
  for (const id of ["B4", "B5", "B6", "B7"]) assert.equal(status(s, id), "pass", id);
  assert.equal(rungOf(runChecks(s, ctx())), "BETTER");
});

test("BETTER B4: a label inside a blockquote counts", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, "\n# Notes\n\n> **Needs:** git 2.40 or later.\n");
  assert.equal(status(s, "B4"), "pass");
});

test("BETTER B9: a missing linked file fails", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, "See [guide](references/guide.md) and [site](https://example.com).");
  assert.equal(status(s, "B9", ctx("demo", { exists: (p) => p !== "references/guide.md" })), "fail");
  assert.equal(status(s, "B9"), "pass");
});

test("BETTER B8: over 500 lines fails", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, "line\n".repeat(600));
  assert.equal(status(s, "B8"), "fail");
});

test("BEST: a full block satisfies B4, B5, B7 and reaches BEST", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK) + "\n# Notes\n\n1. Read the tags.\n2. Write the section.\n");
  const r = runChecks(s, ctx());
  for (const id of ["B4", "B5", "B7", "F1", "F2", "F3"]) assert.equal(r.find((x) => x.id === id)?.status, "pass", id);
  assert.equal(rungOf(r), "BEST");
});

test("BEST F1: the block must come before the first heading, once", () => {
  const late = skill(`name: demo\n${GOOD_DESC}`, "\n# Notes\n" + block(FULL_BLOCK) + BETTER_BODY);
  assert.equal(status(late, "F1"), "fail");
  const twice = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK) + block(FULL_BLOCK) + BETTER_BODY);
  assert.equal(status(twice, "F1"), "fail");
});

test("BEST F2/F3: bad YAML, missing fields and wrong types fail", () => {
  assert.equal(status(skill(`name: demo\n${GOOD_DESC}`, block("needs: [unclosed") + BETTER_BODY), "F2"), "fail");
  const missing = skill(`name: demo\n${GOOD_DESC}`, block("v: 1\nneeds: [git]") + BETTER_BODY);
  assert.equal(status(missing, "F3"), "fail");
  const wrongType = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK.replace("publishes: false", "publishes: no thanks")) + BETTER_BODY);
  assert.equal(status(wrongType, "F3"), "fail");
  const noVersion = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK.replace("v: 1\n", "")) + BETTER_BODY);
  assert.equal(status(noVersion, "F3"), "fail");
});

test("BEST F4/F5: effects that disagree with the steps warn, never fail", () => {
  const pushes = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK) + "\n## Steps\n1. Commit.\n2. Run `git push`.\n");
  const r = runChecks(pushes, ctx());
  assert.equal(r.find((x) => x.id === "F4")?.status, "warn");
  assert.equal(rungOf(r), "BEST");
  const writes = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK.replace("writes: [CHANGELOG.md]", "writes: []")) + "\n## Steps\n1. Write to the CHANGELOG.\n2. Done.\n");
  assert.equal(status(writes, "F5"), "warn");
});

test("BEST F6: a repo with project.faf should be pointed to", () => {
  const s = skill(`name: demo\n${GOOD_DESC}`, block(FULL_BLOCK) + BETTER_BODY);
  assert.equal(status(s, "F6", ctx("demo", { projectFaf: true })), "warn");
  assert.equal(status(s, "F6"), undefined);
});

const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { encoding: "utf8" });

test("CLI: text output, tally and exit 0", () => {
  const r = run(FIX);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /BEST 1 · BETTER 1 · GOOD 1 · NONE 1/);
});

test("CLI: --json shape", () => {
  const r = run(FIX, "--json");
  const d = JSON.parse(r.stdout);
  assert.equal(d.skills, 4);
  assert.deepEqual(d.counts, { NONE: 1, GOOD: 1, BETTER: 1, BEST: 1 });
  assert.ok(Array.isArray(d.reports[0].results));
});

test("CLI: --fail-under exits 1 when a skill is below the rung", () => {
  assert.equal(run(FIX, "--fail-under", "GOOD").status, 1);
  assert.equal(run(`${FIX}/best-notes`, "--fail-under", "BEST").status, 0);
  assert.equal(run(FIX, "--fail-under", "SILVER").status, 2);
});

test("CLI: no SKILL.md found exits 1; unknown option exits 2", () => {
  const empty = run(`${FIX}/not-a-skill`);
  assert.equal(empty.status, 1);
  assert.match(empty.stdout, /No SKILL\.md found/);
  assert.equal(run("--nope").status, 2);
});

test("CLI never writes: fixture files are unchanged after a run", async () => {
  const { readFileSync } = await import("node:fs");
  const before = readFileSync(`${FIX}/good-notes/SKILL.md`, "utf8");
  run(FIX, "--all");
  assert.equal(readFileSync(`${FIX}/good-notes/SKILL.md`, "utf8"), before);
});
