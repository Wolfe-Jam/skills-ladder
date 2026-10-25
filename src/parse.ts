// Split a SKILL.md into frontmatter, body and FAF block. Pure: no file system access.
import { parse as parseYaml } from "yaml";

export interface Frontmatter {
  present: boolean;
  /** Parsed mapping, or null when missing or unparseable. */
  data: Record<string, unknown> | null;
  error?: string;
}

export interface FafBlock {
  /** How many `<!-- faf:start -->` markers the file has. */
  starts: number;
  /** How many `<!-- faf:end -->` markers the file has. */
  ends: number;
  /** True when the block sits after the frontmatter and before the first heading. */
  placedFirst: boolean;
  /** Raw YAML from the first fenced block inside, if any. */
  yaml: string | null;
  data: Record<string, unknown> | null;
  error?: string;
}

export interface ParsedSkill {
  frontmatter: Frontmatter;
  /** Everything after the frontmatter. */
  body: string;
  /** The body with the FAF block removed (what the steps are read from). */
  prose: string;
  block: FafBlock | null;
  /** Line count of the whole file. */
  lines: number;
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const START = "<!-- faf:start -->";
const END = "<!-- faf:end -->";

export function parseSkill(text: string): ParsedSkill {
  const src = text.replace(/^﻿/, "");
  const lines = src.split(/\r?\n/).length;
  const m = FM.exec(src);
  let frontmatter: Frontmatter = { present: false, data: null };
  let body = src;
  if (m) {
    body = src.slice(m[0].length);
    try {
      const data = parseYaml(m[1] ?? "");
      frontmatter =
        data && typeof data === "object" && !Array.isArray(data)
          ? { present: true, data: data as Record<string, unknown> }
          : { present: true, data: null, error: "frontmatter is not a YAML mapping" };
    } catch (e) {
      frontmatter = { present: true, data: null, error: (e as Error).message.split("\n")[0] };
    }
  }
  const block = parseBlock(body);
  let prose = body;
  if (block && block.starts >= 1 && block.ends >= 1) {
    const a = body.indexOf(START);
    const b = body.indexOf(END, a);
    if (a >= 0 && b > a) prose = body.slice(0, a) + body.slice(b + END.length);
  }
  return { frontmatter, body, prose, block, lines };
}

function count(hay: string, needle: string): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

function parseBlock(body: string): FafBlock | null {
  const starts = count(body, START);
  const ends = count(body, END);
  if (starts === 0 && ends === 0) return null;
  const a = body.indexOf(START);
  const b = a >= 0 ? body.indexOf(END, a) : -1;
  const before = a >= 0 ? body.slice(0, a) : "";
  // Nothing but blank lines before the block: no heading, no prose.
  const placedFirst = a >= 0 && before.trim() === "";
  const block: FafBlock = { starts, ends, placedFirst, yaml: null, data: null };
  if (a < 0 || b < 0) return block;
  const inner = body.slice(a + START.length, b);
  const fence = /```ya?ml[ \t]*\r?\n([\s\S]*?)\r?\n```/.exec(inner);
  if (!fence) {
    block.error = "no ```yaml fenced block inside the markers";
    return block;
  }
  block.yaml = fence[1] ?? "";
  try {
    const data = parseYaml(block.yaml);
    if (data && typeof data === "object" && !Array.isArray(data)) block.data = data as Record<string, unknown>;
    else block.error = "the block's YAML is not a mapping";
  } catch (e) {
    block.error = (e as Error).message.split("\n")[0];
  }
  return block;
}
