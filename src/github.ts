// Fetch a public GitHub repo (or one folder of it) into a temporary folder, read-only, pinned to one commit.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface GithubTarget {
  owner: string;
  repo: string;
  /** A folder inside the repo, with no leading or trailing slash; "" for the whole repo. */
  path: string;
  /** A branch, tag or commit; null for the default branch. */
  ref: string | null;
}

const NAME = /^[A-Za-z0-9_.-]+$/;

/** `github:owner/repo[/path...][@ref]`, or null when `spec` doesn't start with `github:`. Throws on a malformed one. */
export function parseGithubTarget(spec: string): GithubTarget | null {
  if (!spec.startsWith("github:")) return null;
  let rest = spec.slice("github:".length);
  let ref: string | null = null;
  const at = rest.lastIndexOf("@");
  if (at !== -1) { ref = rest.slice(at + 1); rest = rest.slice(0, at); }
  const parts = rest.split("/").filter(Boolean);
  const [owner, repo, ...sub] = parts;
  const bad = (why: string) => new Error(`${spec}: ${why}. Use github:owner/repo[/path][@ref].`);
  if (!owner || !repo) throw bad("needs an owner and a repo");
  if (!NAME.test(owner) || !NAME.test(repo)) throw bad("owner and repo may use letters, digits, '-', '_' and '.' only");
  if (sub.some((s) => s === "." || s === "..")) throw bad("the path can't contain . or ..");
  if (ref !== null && !/^[A-Za-z0-9_./-]+$/.test(ref)) throw bad("the ref may use letters, digits, '-', '_', '.' and '/' only");
  return { owner, repo: repo.replace(/\.git$/, ""), path: sub.join("/"), ref: ref || null };
}

/** How the target reads in a census row: `owner/repo`, or `owner/repo (path/)` for a folder. */
export function label(t: GithubTarget): string {
  return `${t.owner}/${t.repo}${t.path ? ` (${t.path}/)` : ""}`;
}

export interface Fetched {
  /** The folder to rate: the clone, or the target folder inside it. */
  dir: string;
  /** The full commit that was fetched. */
  commit: string;
  /** Deletes the temporary clone. */
  cleanup: () => void;
}

/**
 * Shallow-fetches one commit into a new temporary folder. Nothing is written anywhere else.
 * `base` is where repos live (https://github.com; tests pass a local folder).
 * GITHUB_TOKEN, when set, is passed to git in the environment, never on the command line.
 */
export function fetchGithub(t: GithubTarget, base = process.env.SKILLS_LADDER_GIT_BASE || "https://github.com"): Fetched {
  const tmp = mkdtempSync(join(tmpdir(), "skills-ladder-"));
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  const token = process.env.GITHUB_TOKEN;
  if (token && base.startsWith("https://github.com")) {
    const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
    Object.assign(env, { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader", GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}` });
  }
  const git = (...args: string[]) => execFileSync("git", ["-C", tmp, ...args], { env, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  try {
    git("init", "-q");
    git("remote", "add", "origin", `${base.replace(/\/$/, "")}/${t.owner}/${t.repo}.git`);
    git("fetch", "-q", "--depth", "1", "origin", t.ref ?? "HEAD");
    git("checkout", "-q", "FETCH_HEAD");
    const commit = git("rev-parse", "HEAD");
    const dir = t.path ? join(tmp, ...t.path.split("/")) : tmp;
    try { statSync(dir); } catch { throw new Error(`${label(t)}: no folder ${t.path} at ${commit.slice(0, 7)}`); }
    return { dir, commit, cleanup };
  } catch (e) {
    cleanup();
    const err = e as Error & { stderr?: Buffer };
    let why = err.stderr?.toString().trim().split("\n").pop() || err.message;
    // git can't fetch a commit by a short SHA, and census rows print short ones.
    if (t.ref && /^[0-9a-f]{7,39}$/i.test(t.ref) && /couldn't find remote ref/.test(why)) {
      why = `${t.ref} looks like a short commit SHA. Use the full 40-character SHA, a branch or a tag.`;
    }
    throw new Error(why.startsWith(label(t)) ? why : `${label(t)}${t.ref ? `@${t.ref}` : ""}: ${why}`);
  }
}
