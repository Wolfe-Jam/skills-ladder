// The ladder's checks, as defined in the spec draft (GOOD G1–G5, BETTER B1–B9, BEST F1–F6).
import type { ParsedSkill } from "./parse.js";

export type Rung = "NONE" | "GOOD" | "BETTER" | "BEST";
export type Level = "GOOD" | "BETTER" | "BEST";
/** pass · fail · warn (reported, never blocks a rung) · skip (not applicable) */
export type Status = "pass" | "fail" | "warn" | "skip";

export interface Result {
  id: string;
  level: Level;
  title: string;
  status: Status;
  /** What was found, and what to do about it when it isn't a pass. */
  detail?: string;
}

export interface SkillContext {
  /** Name of the folder that holds SKILL.md. */
  dir: string;
  /** True when each relative link target exists (resolved by the caller). */
  exists: (relPath: string) => boolean;
  /** True when a project.faf sits in the skill's folder or an ancestor inside the repo. */
  projectFaf: boolean;
}

/** Frontmatter fields the Agent Skills specification defines. */
export const SPEC_FIELDS = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];
export const MAX_DESCRIPTION = 1024;
export const MAX_COMPATIBILITY = 500;
export const MAX_LINES = 500;
export const MAX_TOKENS = 5000;

// Unicode lowercase letters and digits, single hyphens between them: the rule skills-ref applies (after NFKC).
const NAME = /^[\p{Ll}\p{Lo}\p{N}]+(?:-[\p{Ll}\p{Lo}\p{N}]+)*$/u;

// Description voice and triggers.
const OPENS_FIRST_OR_SECOND = /^\s*["'(]?\s*(i|i'm|i am|my|me|we|our|you|your|you're)\b/i;
const OPENS_WITH_TRIGGER = /^\s*["'(]?\s*(use|invoke|trigger|activate|call|run)\b/i;
const WHEN = /\b(use[sd]?\s+(?:it\s+|this\s+(?:skill\s+)?)?(?:when|whenever|if|for|any\s?time)\b|when\s+(?:the\s+)?(?:user|you|working|asked|someone|a user)\b|when\s+\w+ing\b|whenever\b|trigger(?:s|ed)?\b)/i;
const NOT_FOR = /\b(not for|don'?t use|do not use|avoid (?:using )?(?:it|this) (?:for|when))\b/i;

// Body sections, written as a heading or a label at the start of a line.
const label = (words: string) => new RegExp(`^\\s*(?:>\\s*)?(?:#{1,6}\\s+|[-*+]\\s+)?(?:\\*\\*|__)?(?:${words})\\b`, "im");
const NEEDS = label("needs|requires|requirements|prerequisites|dependencies|before you start");
const TOUCHES = label("writes|reads|touches|side effects|changes|network|publishes|effects|read-only|safety");
const DONE = label("done when|done-when|done_when|definition of done|success criteria|finished when|stop when|you(?:'re| are) done when|done");
const STEPS_HEADING = label("steps|workflow|procedure|instructions|how to run|process");

// Verbs in the steps that suggest effects, for the consistency warnings (F4, F5).
// Commands and actions only: the bare nouns ("deploy checks", "publishing") appear in plenty of read-only skills.
const PUBLISH_VERBS = /\b(git push|npm publish|cargo publish|twine upload|gh (?:pr|release|issue) create|wrangler deploy|vercel deploy|deploy(?:s|ing)? (?:to|it|the)|publish(?:es|ing)? (?:to|it|the)|post(?:s|ing)? (?:to|on)|send(?:s|ing)? (?:an? )?(?:email|message)|tweet)\b/i;
const WRITE_VERBS = /\b(write(?:s)? (?:to|the|a)|creat(?:e|es|ing) (?:a |the )?(?:file|folder|directory)|edit(?:s)? (?:the|a)|overwrit(?:e|es)|sed -i|> ?[\w./-]+\.\w+|save(?:s)? (?:to|the))\b/i;

/** The text with fenced code blocks removed. A fence closes on the same
 *  character, at least as long as the one that opened it, with nothing but
 *  spaces after it (CommonMark), so "```bash" never closes a block. */
function withoutFencedCode(text: string): string {
  const kept: string[] = [];
  let open: { ch: string; len: number } | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (open) {
      const m = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (m && m[1]![0] === open.ch && m[1]!.length >= open.len) open = null;
      continue;
    }
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (m) { open = { ch: m[1]![0]!, len: m[1]!.length }; continue; }
    kept.push(line);
  }
  return kept.join("\n");
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function isStrList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function runChecks(skill: ParsedSkill, ctx: SkillContext): Result[] {
  const out: Result[] = [];
  const add = (id: string, level: Level, title: string, status: Status, detail?: string) =>
    out.push(detail === undefined ? { id, level, title, status } : { id, level, title, status, detail });

  // ---- GOOD: the specification's hard rules ----
  const fm = skill.frontmatter;
  if (!fm.present) add("G1", "GOOD", "Frontmatter is present and parses", "fail", "No `---` frontmatter at the top of the file.");
  else if (!fm.data) add("G1", "GOOD", "Frontmatter is present and parses", "fail", `Frontmatter does not parse: ${fm.error}`);
  else add("G1", "GOOD", "Frontmatter is present and parses", "pass");

  const data = fm.data ?? {};
  const rawName = str(data.name);
  const name = rawName === null ? null : rawName.trim().normalize("NFKC");
  if (!name) add("G2", "GOOD", "Name is valid and matches its folder", "fail", "`name` is missing or not a string.");
  else if (name.length > 64 || !NAME.test(name))
    add("G2", "GOOD", "Name is valid and matches its folder", "fail", `\`${name}\`: use 1–64 lowercase letters, digits and single hyphens, not at the start or end.`);
  else if (name !== ctx.dir.normalize("NFKC"))
    add("G2", "GOOD", "Name is valid and matches its folder", "fail", `\`${name}\` doesn't match its folder \`${ctx.dir}\`. Rename one so they match.`);
  else add("G2", "GOOD", "Name is valid and matches its folder", "pass");

  const desc = str(data.description);
  if (!desc || desc.trim() === "") add("G3", "GOOD", "Description is 1–1024 characters", "fail", "`description` is missing or empty.");
  else if (desc.length > MAX_DESCRIPTION)
    add("G3", "GOOD", "Description is 1–1024 characters", "fail", `${desc.length} characters, over the limit of ${MAX_DESCRIPTION}. Cut ${desc.length - MAX_DESCRIPTION}.`);
  else add("G3", "GOOD", "Description is 1–1024 characters", "pass", `${desc.length} characters`);

  const extra = Object.keys(data).filter((k) => !SPEC_FIELDS.includes(k));
  if (fm.data && extra.length)
    add("G4", "GOOD", "Frontmatter uses only specification fields", "fail", `Not in the specification: ${extra.map((k) => `\`${k}\``).join(", ")}. The reference validator (skills-ref) rejects them. Move them under \`metadata\`, or keep them only in the client that reads them.`);
  else if (fm.data) add("G4", "GOOD", "Frontmatter uses only specification fields", "pass");

  if (fm.data && "compatibility" in data) {
    const c = data.compatibility;
    if (typeof c !== "string") add("G5", "GOOD", `Compatibility is at most ${MAX_COMPATIBILITY} characters`, "fail", "`compatibility` must be a string.");
    else if (c.length > MAX_COMPATIBILITY) add("G5", "GOOD", `Compatibility is at most ${MAX_COMPATIBILITY} characters`, "fail", `${c.length} characters, over the limit of ${MAX_COMPATIBILITY}.`);
    else add("G5", "GOOD", `Compatibility is at most ${MAX_COMPATIBILITY} characters`, "pass");
  }

  // ---- BETTER: chosen correctly, used safely ----
  const d = desc ?? "";
  if (!d) add("B1", "BETTER", "Description opens with what the skill does", "fail", "No description to read.");
  else if (OPENS_FIRST_OR_SECOND.test(d))
    add("B1", "BETTER", "Description opens with what the skill does", "fail", "Opens in the first or second person. Start with what the skill does, in the third person (\"Drafts release notes from…\").");
  else if (OPENS_WITH_TRIGGER.test(d))
    add("B1", "BETTER", "Description opens with what the skill does", "fail", "Opens with when to use it. Say what it does first, then \"Use when…\".");
  else add("B1", "BETTER", "Description opens with what the skill does", "pass");

  if (d && WHEN.test(d)) add("B2", "BETTER", "Description says when to use it", "pass");
  else add("B2", "BETTER", "Description says when to use it", "fail", "Add a trigger: \"Use when the user asks for…\". The description is all an agent sees when it chooses a skill.");

  if (d && NOT_FOR.test(d)) add("B3", "BETTER", "Description says what it is not for", "pass");
  else add("B3", "BETTER", "Description says what it is not for", "warn", "Optional: add \"Not for…\" when a nearby task could trigger it by mistake.");

  const bd = skill.block?.data ?? null;
  const prose = skill.prose;

  if (bd && "needs" in bd) add("B4", "BETTER", "Body says what it needs", "pass", "In the Context Block.");
  else if (NEEDS.test(prose)) add("B4", "BETTER", "Body says what it needs", "pass");
  else add("B4", "BETTER", "Body says what it needs", "fail", "Add a Needs line: tools, versions and access, and what to do if one is missing.");

  if (bd && ("writes" in bd || "reads" in bd || "publishes" in bd)) add("B5", "BETTER", "Body says what it touches", "pass", "In the Context Block.");
  else if (TOUCHES.test(prose)) add("B5", "BETTER", "Body says what it touches", "pass");
  else add("B5", "BETTER", "Body says what it touches", "fail", "Say what it reads, what it writes, and whether it sends or publishes anything. An agent should know before step 1.");

  const numbered = /^\s*1[.)]\s+\S/m.test(prose) && /^\s*2[.)]\s+\S/m.test(prose);
  if (numbered || STEPS_HEADING.test(prose)) add("B6", "BETTER", "Body gives ordered steps", "pass");
  else add("B6", "BETTER", "Body gives ordered steps", "fail", "Give the work as a numbered list of steps.");

  if (bd && str(bd.done_when)) add("B7", "BETTER", "Body says when it is done", "pass", "In the Context Block.");
  else if (DONE.test(prose)) add("B7", "BETTER", "Body says when it is done", "pass");
  else add("B7", "BETTER", "Body says when it is done", "fail", "Add a Done when line: the finished state of the work (files, results), not a step in the conversation.");

  const tokens = Math.ceil(skill.body.length / 4);
  if (skill.lines > MAX_LINES) add("B8", "BETTER", `Under ${MAX_LINES} lines and about ${MAX_TOKENS} tokens`, "fail", `${skill.lines} lines. Move detail into files in references/.`);
  else if (tokens > MAX_TOKENS) add("B8", "BETTER", `Under ${MAX_LINES} lines and about ${MAX_TOKENS} tokens`, "warn", `About ${tokens} tokens (estimated from length). Move detail into files in references/.`);
  else add("B8", "BETTER", `Under ${MAX_LINES} lines and about ${MAX_TOKENS} tokens`, "pass", `${skill.lines} lines, about ${tokens} tokens`);

  const outsideFences = withoutFencedCode(skill.body);
  const links = [...outsideFences.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .map((m) => (m[1] ?? "").split("#")[0] ?? "")
    .filter((h) => h && !/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith("/"))
    // A local file link looks like a path; `[Title](URL)` in a template is a placeholder.
    .filter((h) => /[./]/.test(h));
  const missing = [...new Set(links.filter((h) => !ctx.exists(h)))];
  if (missing.length) add("B9", "BETTER", "Linked files exist", "fail", `Missing: ${missing.map((h) => `\`${h}\``).join(", ")}`);
  else add("B9", "BETTER", "Linked files exist", "pass", links.length ? `${links.length} checked` : "no local links");

  // ---- BEST: the Context Block ----
  const blk = skill.block;
  if (!blk) {
    add("F1", "BEST", "One Context Block, right after the frontmatter", "fail", "No Context Block. Add one between `<!-- faf:start -->` and `<!-- faf:end -->` (see the README).");
    for (const [id, t] of [["F2", "The block's YAML parses"], ["F3", "Required fields, right types"]] as const)
      add(id, "BEST", t, "skip", "No Context Block.");
    return out;
  }
  if (blk.starts !== 1 || blk.ends !== 1)
    add("F1", "BEST", "One Context Block, right after the frontmatter", "fail", `Found ${blk.starts} start and ${blk.ends} end markers; use exactly one of each.`);
  else if (!blk.placedFirst)
    add("F1", "BEST", "One Context Block, right after the frontmatter", "fail", "Move the block above the first heading, right after the frontmatter.");
  else add("F1", "BEST", "One Context Block, right after the frontmatter", "pass");

  if (!blk.data) add("F2", "BEST", "The block's YAML parses", "fail", blk.error ?? "No YAML inside the markers.");
  else add("F2", "BEST", "The block's YAML parses", "pass");

  if (blk.data) {
    const b = blk.data;
    const problems: string[] = [];
    if (b.v !== 1) problems.push("`v: 1`");
    for (const k of ["needs", "reads", "writes", "network"]) if (!isStrList(b[k])) problems.push(`\`${k}\` (a list; \`[]\` for none)`);
    if (typeof b.publishes !== "boolean") problems.push("`publishes` (true or false)");
    if (!str(b.done_when)) problems.push("`done_when` (one sentence)");
    if (b.project !== undefined && !str(b.project)) problems.push("`project` (a path)");
    if (problems.length) add("F3", "BEST", "Required fields, right types", "fail", `Missing or wrong: ${problems.join(", ")}.`);
    else add("F3", "BEST", "Required fields, right types", "pass");

    const steps = skill.prose;
    if (b.publishes === false && PUBLISH_VERBS.test(steps))
      add("F4", "BEST", "`publishes` agrees with the steps", "warn", "The steps mention pushing, posting or publishing, but `publishes: false`. Check the steps.");
    else if (typeof b.publishes === "boolean") add("F4", "BEST", "`publishes` agrees with the steps", "pass");
    if (isStrList(b.writes) && b.writes.length === 0 && WRITE_VERBS.test(steps))
      add("F5", "BEST", "`writes: []` agrees with the steps", "warn", "The steps mention writing files, but `writes: []`. Check the steps.");
    else if (isStrList(b.writes)) add("F5", "BEST", "`writes` agrees with the steps", "pass");
    if (ctx.projectFaf && !str(b.project))
      add("F6", "BEST", "Points to the project's project.faf", "warn", "This repo has a project.faf. Add `project: project.faf` so an agent reads it first.");
  } else {
    add("F3", "BEST", "Required fields, right types", "skip", "The block didn't parse.");
  }
  return out;
}

/** The highest rung whose checks (and every rung below) have no failures. */
export function rungOf(results: Result[]): Rung {
  const failsAt = (lvl: Level) => results.some((r) => r.level === lvl && r.status === "fail");
  if (failsAt("GOOD")) return "NONE";
  if (failsAt("BETTER")) return "GOOD";
  if (failsAt("BEST")) return "BETTER";
  return "BEST";
}
