#!/usr/bin/env node
// skills-ladder [path...] — rate every SKILL.md under each path. Read-only: it never writes a file
// (a github: target is fetched into a temporary folder, which is deleted afterwards).
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { checkPath, type SkillReport } from "./index.js";
import type { Rung } from "./checks.js";
import { fetchGithub, label, parseGithubTarget } from "./github.js";

const RUNGS: Rung[] = ["NONE", "GOOD", "BETTER", "BEST"];
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

const HELP = `skills-ladder ${pkg.version}

Rate Agent Skills (SKILL.md) on a ladder. Read-only.

  GOOD    valid: passes the specification's hard rules
  BETTER  an agent can choose it correctly and use it safely
  BEST    BETTER, with the facts in a checkable Context Block

Usage
  skills-ladder [path...]        every SKILL.md under each path (default: .)
  skills-ladder github:owner/repo[/path][@ref]
                                 a public GitHub repo or folder, fetched at one commit
                                 into a temporary folder (GITHUB_TOKEN is used if set)

Options
  --json                         machine-readable output
  --all                          show passing checks too
  --fail-under <GOOD|BETTER|BEST>  exit 1 if any skill is below this rung
  --census                       one CSV row per path: source, commit, counts, version
  -h, --help                     this help
  -v, --version                  print the version
`;

function main(argv: string[]): number {
  const paths: string[] = [];
  let json = false, all = false, census = false, failUnder: Rung | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") { process.stdout.write(HELP); return 0; }
    if (a === "-v" || a === "--version") { process.stdout.write(pkg.version + "\n"); return 0; }
    if (a === "--json") json = true;
    else if (a === "--all") all = true;
    else if (a === "--census") census = true;
    else if (a === "--fail-under") {
      const r = (argv[++i] ?? "").toUpperCase() as Rung;
      if (!["GOOD", "BETTER", "BEST"].includes(r)) { process.stderr.write("--fail-under takes GOOD, BETTER or BEST\n"); return 2; }
      failUnder = r;
    } else if (a.startsWith("-")) { process.stderr.write(`Unknown option ${a}. Run skills-ladder --help.\n`); return 2; }
    else paths.push(a);
  }
  if (!paths.length) paths.push(".");
  if (census && json) { process.stderr.write("Use --census or --json, not both.\n"); return 2; }

  const reports: SkillReport[] = [];
  const sources: Source[] = [];
  for (const p of paths) {
    try {
      const t = parseGithubTarget(p);
      if (!t) {
        const found = checkPath(p);
        reports.push(...found);
        sources.push({ target: p, source: p, commit: localCommit(p), reports: found });
        continue;
      }
      const f = fetchGithub(t);
      try {
        const found = checkPath(f.dir);
        reports.push(...found);
        sources.push({ target: p, source: label(t), commit: f.commit, reports: found });
      } finally { f.cleanup(); }
    } catch (e) { process.stderr.write(`Can't read ${p}: ${(e as Error).message}\n`); return 2; }
  }

  const below = failUnder ? reports.filter((r) => RUNGS.indexOf(r.rung) < RUNGS.indexOf(failUnder!)) : [];
  if (census) {
    process.stdout.write(CENSUS_HEADER + "\n" + sources.map(censusRow).join("\n") + "\n");
  } else if (json) {
    const counts = countRungs(reports);
    const src = sources.filter((s) => s.commit).map(({ target, source, commit }) => ({ target, source, commit }));
    process.stdout.write(JSON.stringify({ version: pkg.version, skills: reports.length, counts, ...(src.length ? { sources: src } : {}), reports }, null, 2) + "\n");
  } else {
    const fetched = sources.filter((s) => s.target !== s.source);
    const head = fetched.map((s) => `${s.target} @ ${s.commit!.slice(0, 7)}`).join("\n");
    process.stdout.write((head ? head + "\n" : "") + render(reports, all));
  }
  if (!reports.length) return 1;
  return below.length ? 1 : 0;
}

interface Source { target: string; source: string; commit: string | null; reports: SkillReport[] }

const countRungs = (rs: SkillReport[]) => Object.fromEntries(RUNGS.map((k) => [k, rs.filter((r) => r.rung === k).length])) as Record<Rung, number>;

/** The same columns as the study's census.csv, plus the version that measured it. */
const CENSUS_HEADER = "repo,commit,skills,NONE,GOOD,BETTER,BEST,skills_ladder";
function censusRow(s: Source): string {
  const c = countRungs(s.reports);
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [cell(s.source), s.commit ? s.commit.slice(0, 7) : "-", s.reports.length, c.NONE, c.GOOD, c.BETTER, c.BEST, pkg.version].join(",");
}

/** The commit a local path is at, or null when it isn't in a git repo. */
function localCommit(p: string): string | null {
  try { return execFileSync("git", ["-C", statSync(p).isFile() ? dirname(p) : p, "rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null; }
  catch { return null; }
}

const MARK = { pass: "✓", fail: "✗", warn: "!", skip: "·" } as const;

function render(reports: SkillReport[], all: boolean): string {
  if (!reports.length) return "No SKILL.md found.\n";
  const lines: string[] = [`skills-ladder ${pkg.version} · ${reports.length} skill${reports.length === 1 ? "" : "s"}`, ""];
  for (const r of reports) {
    const label = r.rung === "NONE" ? "NONE  (doesn't pass GOOD yet)" : r.rung;
    lines.push(`${label}  ${r.name ?? "(no name)"}  ${r.file}`);
    const next = RUNGS[RUNGS.indexOf(r.rung) + 1];
    for (const x of r.results) {
      const show = all || x.status === "fail" || x.status === "warn";
      // Below the next rung up, only that rung's failures matter; hide higher-rung noise.
      const relevant = all || x.level === r.rung || x.level === next || x.status === "warn";
      if (!show || !relevant) continue;
      lines.push(`  ${MARK[x.status]} ${x.id} ${x.title}${x.detail ? ` — ${x.detail}` : ""}`);
    }
    lines.push("");
  }
  const tally = RUNGS.slice().reverse().map((k) => `${k} ${reports.filter((r) => r.rung === k).length}`).join(" · ");
  lines.push(tally, "");
  return lines.join("\n");
}

process.exitCode = main(process.argv.slice(2));
