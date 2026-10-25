#!/usr/bin/env node
// skills-ladder [path...] — rate every SKILL.md under each path. Read-only: it never writes a file.
import { readFileSync } from "node:fs";
import { checkPath, type SkillReport } from "./index.js";
import type { Rung } from "./checks.js";

const RUNGS: Rung[] = ["NONE", "GOOD", "BETTER", "BEST"];
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

const HELP = `skills-ladder ${pkg.version}

Rate Agent Skills (SKILL.md) on a ladder. Read-only.

  GOOD    valid: passes the specification's hard rules
  BETTER  an agent can choose it correctly and use it safely
  BEST    BETTER, with the facts in a checkable FAF Block

Usage
  skills-ladder [path...]        every SKILL.md under each path (default: .)

Options
  --json                         machine-readable output
  --all                          show passing checks too
  --fail-under <GOOD|BETTER|BEST>  exit 1 if any skill is below this rung
  -h, --help                     this help
  -v, --version                  print the version
`;

function main(argv: string[]): number {
  const paths: string[] = [];
  let json = false, all = false, failUnder: Rung | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") { process.stdout.write(HELP); return 0; }
    if (a === "-v" || a === "--version") { process.stdout.write(pkg.version + "\n"); return 0; }
    if (a === "--json") json = true;
    else if (a === "--all") all = true;
    else if (a === "--fail-under") {
      const r = (argv[++i] ?? "").toUpperCase() as Rung;
      if (!["GOOD", "BETTER", "BEST"].includes(r)) { process.stderr.write("--fail-under takes GOOD, BETTER or BEST\n"); return 2; }
      failUnder = r;
    } else if (a.startsWith("-")) { process.stderr.write(`Unknown option ${a}. Run skills-ladder --help.\n`); return 2; }
    else paths.push(a);
  }
  if (!paths.length) paths.push(".");

  const reports: SkillReport[] = [];
  for (const p of paths) {
    try { reports.push(...checkPath(p)); }
    catch (e) { process.stderr.write(`Can't read ${p}: ${(e as Error).message}\n`); return 2; }
  }

  const below = failUnder ? reports.filter((r) => RUNGS.indexOf(r.rung) < RUNGS.indexOf(failUnder!)) : [];
  if (json) {
    const counts = Object.fromEntries(RUNGS.map((k) => [k, reports.filter((r) => r.rung === k).length]));
    process.stdout.write(JSON.stringify({ version: pkg.version, skills: reports.length, counts, reports }, null, 2) + "\n");
  } else {
    process.stdout.write(render(reports, all));
  }
  if (!reports.length) return 1;
  return below.length ? 1 : 0;
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
