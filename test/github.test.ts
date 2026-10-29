import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGithub, label, parseGithubTarget } from "../src/github.ts";

const FIX = fileURLToPath(new URL("./fixtures", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const pkg = JSON.parse(execFileSync("node", ["-p", "JSON.stringify(require('./package.json'))"]).toString()) as { version: string };

// A local stand-in for github.com: <base>/acme/skills.git holds two fixture skills under skills/.
const base = mkdtempSync(join(tmpdir(), "sl-remote-"));
const repo = join(base, "acme", "skills.git");
mkdirSync(join(repo, "skills"), { recursive: true });
for (const name of ["good-notes", "best-notes"]) cpSync(join(FIX, name), join(repo, "skills", name), { recursive: true });
const git = (...a: string[]) => execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", ...a]).toString().trim();
git("init", "-q"); git("add", "."); git("commit", "-qm", "two skills");
const SHA = git("rev-parse", "HEAD");
const BASE = base.split("\\").join("/");
process.on("exit", () => rmSync(base, { recursive: true, force: true }));

const run = (...args: string[]) =>
  spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { encoding: "utf8", env: { ...process.env, SKILLS_LADDER_GIT_BASE: BASE } });

test("github: targets parse into owner, repo, path and ref", () => {
  assert.deepEqual(parseGithubTarget("github:acme/skills"), { owner: "acme", repo: "skills", path: "", ref: null });
  assert.deepEqual(parseGithubTarget("github:acme/plugins/pstack/@v2"), { owner: "acme", repo: "plugins", path: "pstack", ref: "v2" });
  assert.deepEqual(parseGithubTarget("github:acme/skills.git/a/b@abc1234"), { owner: "acme", repo: "skills", path: "a/b", ref: "abc1234" });
  assert.equal(parseGithubTarget("./skills"), null);
  assert.equal(label({ owner: "acme", repo: "plugins", path: "pstack", ref: null }), "acme/plugins (pstack/)");
});

test("github: malformed targets are refused", () => {
  for (const bad of ["github:acme", "github:/skills", "github:ac me/skills", "github:acme/skills/../x", "github:acme/skills@a b"]) {
    assert.throws(() => parseGithubTarget(bad), /github:owner\/repo/, bad);
  }
});

test("github: fetches one commit, rates it, and leaves nothing behind", () => {
  const before = readdirSync(tmpdir()).filter((n) => n.startsWith("skills-ladder-")).length;
  const f = fetchGithub({ owner: "acme", repo: "skills", path: "skills", ref: null }, BASE);
  assert.equal(f.commit, SHA);
  assert.deepEqual(readdirSync(f.dir).sort(), ["best-notes", "good-notes"]);
  f.cleanup();
  assert.equal(readdirSync(tmpdir()).filter((n) => n.startsWith("skills-ladder-")).length, before);
});

test("--census prints one row per target, pinned to the commit and version", () => {
  const r = run(`github:acme/skills/skills@${SHA}`, "--census");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `repo,commit,skills,NONE,GOOD,BETTER,BEST,skills_ladder\nacme/skills (skills/),${SHA.slice(0, 7)},2,0,1,0,1,${pkg.version}\n`);
});

test("--json names the fetched source and commit", () => {
  const r = run("github:acme/skills", "--json");
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.sources, [{ target: "github:acme/skills", source: "acme/skills", commit: SHA }]);
  assert.equal(out.skills, 2);
  assert.deepEqual(out.reports.map((x: { file: string }) => x.file), ["skills/best-notes/SKILL.md", "skills/good-notes/SKILL.md"]);
});

test("github: a missing repo or folder exits 2 with a reason", () => {
  const r1 = run("github:acme/nope");
  assert.equal(r1.status, 2);
  assert.match(r1.stderr, /Can't read github:acme\/nope/);
  const r2 = run("github:acme/skills/missing");
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /no folder missing/);
});

test("--census and --json together are refused", () => {
  assert.equal(run(".", "--census", "--json").status, 2);
});

test("github: a short SHA says to use the full one", () => {
  const r = run(`github:acme/skills@${SHA.slice(0, 7)}`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, new RegExp(`${SHA.slice(0, 7)} looks like a short commit SHA. Use the full 40-character SHA, a branch or a tag.`));
});
