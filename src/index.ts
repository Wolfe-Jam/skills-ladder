// Find SKILL.md files under a path and rate each one. Read-only.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve, relative } from "node:path";
import { parseSkill } from "./parse.js";
import { runChecks, rungOf, type Result, type Rung } from "./checks.js";

export { parseSkill } from "./parse.js";
export { runChecks, rungOf } from "./checks.js";
export type { Result, Rung, Level, Status, SkillContext } from "./checks.js";

export interface SkillReport {
  /** Path to the SKILL.md, relative to the path that was checked. */
  file: string;
  name: string | null;
  rung: Rung;
  results: Result[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".venv", "venv", "__pycache__"]);

/** Every SKILL.md under `root` (or `root` itself when it is a SKILL.md). */
export function findSkills(root: string): string[] {
  const abs = resolve(root);
  if (statSync(abs).isFile()) return [abs];
  const found: string[] = [];
  const seen = new Set<string>();
  const walk = (dir: string) => {
    // Follow symlinked skill folders (common in ~/.claude/skills), once each: a loop stops here.
    const real = realpathSync(dir);
    if (seen.has(real)) return;
    seen.add(real);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      let isDir = entry.isDirectory(), isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try { const st = statSync(path); isDir = st.isDirectory(); isFile = st.isFile(); } catch { continue; } // a broken link
      }
      if (isDir) {
        if (!SKIP_DIRS.has(entry.name)) walk(path);
      } else if (isFile && entry.name === "SKILL.md") found.push(path);
    }
  };
  walk(abs);
  return found.sort();
}

/** True when a project.faf sits in `dir` or a parent, stopping at the repository root. */
function hasProjectFaf(dir: string): boolean {
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, "project.faf"))) return true;
    if (existsSync(join(d, ".git")) || dirname(d) === d) return false;
  }
}

export function checkFile(file: string, base = dirname(file)): SkillReport {
  const text = readFileSync(file, "utf8");
  const skill = parseSkill(text);
  const dir = dirname(file);
  const results = runChecks(skill, {
    dir: basename(dir),
    exists: (rel) => existsSync(resolve(dir, decodeURI(rel))),
    projectFaf: hasProjectFaf(dir),
  });
  const name = skill.frontmatter.data && typeof skill.frontmatter.data.name === "string" ? skill.frontmatter.data.name : null;
  return { file: relative(base, file) || basename(file), name, rung: rungOf(results), results };
}

export function checkPath(root: string): SkillReport[] {
  const abs = resolve(root);
  const base = statSync(abs).isFile() ? dirname(abs) : abs;
  return findSkills(abs).map((f) => checkFile(f, base));
}
