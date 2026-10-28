"""Generate the four variants of each skill from one frozen fact sheet. Run once; outputs are committed before any test run."""
import json, os, sys
FACTS = {
 "release-notes": {
  "what": "Drafts release notes from the git commits since the last tag",
  "when": "Use when the user asks for release notes, a changelog entry or what changed since the last release.",
  "not_for": "Not for commit messages or pull request descriptions.",
  "steps": [
   "Find the most recent tag with `git describe --tags --abbrev=0`.",
   "List the commits since that tag with `git log <tag>..HEAD --oneline`.",
   "Group them: Features (feat:), Fixes (fix:), Other.",
   "Write a new section at the top of CHANGELOG.md, headed with the version and today's date, one line per change."],
  "needs": ["git"],
  "reads": ["git history", "CHANGELOG.md"],
  "writes": ["CHANGELOG.md"],
  "network": [],
  "publishes": False,
  "done_when": "CHANGELOG.md has one new section for the version; no other file changed; nothing committed, tagged or pushed",
 },
}

FACTS["api-docs"] = {
  "what": "Generates reference documentation for the functions a module exports",
  "when": "Use when the user asks to document the API or update the API reference.",
  "not_for": "Not for the README or comments inside source files.",
  "steps": [
   "Find the exported functions in src/ with `grep -n \"^export function\" -r src`.",
   "Read each one's parameters and return value.",
   "Write docs/API.md: one section per exported function, with its signature and one sentence on what it does.",
   "Check that every exported function has a section."],
  "needs": ["grep"],
  "reads": ["src/"],
  "writes": ["docs/API.md"],
  "network": [],
  "publishes": False,
  "done_when": "docs/API.md has one section per exported function; no other file changed; nothing committed, tagged or pushed",
}

def fm(name, desc): return f"---\nname: {name}\ndescription: {desc}\n---\n\n"
def steps(s): return "\n".join(f"{i}. {x}" for i,x in enumerate(s,1))
def good(n,f):
    # GOOD = spec-valid, typical of public skills: what-only description, steps, no needs/touches/done.
    return fm(n, f["what"]+".") + f"# {n.replace('-',' ').title()}\n\n{f['what']}.\n\n## Steps\n\n{steps(f['steps'])}\n"
def better_body(n,f):
    return (f"# {n.replace('-',' ').title()}\n\n{f['what']}.\n\n"
      f"## Needs\n\n{', '.join(f['needs'])}.\n\n"
      f"## Touches\n\n- Reads: {', '.join(f['reads'])}.\n- Writes: {', '.join(f['writes'])} only.\n"
      f"- Network: {'none' if not f['network'] else ', '.join(f['network'])}.\n"
      f"- Publishes: {'no. Never commit, tag, push or create a release.' if not f['publishes'] else 'yes.'}\n\n"
      f"## Steps\n\n{steps(f['steps'])}\n\n## Done when\n\n{f['done_when']}.\n")
def desc_better(f): return f"{f['what']}. {f['when']} {f['not_for']}"
def better(n,f): return fm(n, desc_better(f)) + better_body(n,f)
def best(n,f):
    y=("<!-- faf:start -->\n```yaml\nv: 1\n"
       f"needs: [{', '.join(f['needs'])}]\nreads: [{', '.join(f['reads'])}]\nwrites: [{', '.join(f['writes'])}]\n"
       f"network: [{', '.join(f['network'])}]\npublishes: {str(f['publishes']).lower()}\ndone_when: {f['done_when']}\n```\n<!-- faf:end -->\n\n")
    return fm(n, desc_better(f)) + y + better_body(n,f)
def better_plus(n,f):
    # Control: BETTER with the same facts repeated once in prose, to roughly match BEST's length.
    r=(f"In short: it needs {', '.join(f['needs'])}; it reads {', '.join(f['reads'])}; it writes {', '.join(f['writes'])} and nothing else; "
       f"it uses no network; it {'does not publish anything' if not f['publishes'] else 'publishes'}; it is done when {f['done_when']}.\n\n")
    return fm(n, desc_better(f)) + r + better_body(n,f)
out=sys.argv[1]
for n,f in FACTS.items():
    for v,fn in [("GOOD",good),("BETTER",better),("BEST",best),("BETTERPLUS",better_plus)]:
        p=os.path.join(out,v,n); os.makedirs(p,exist_ok=True); open(os.path.join(p,"SKILL.md"),"w").write(fn(n,f))
json.dump(FACTS,open(os.path.join(out,"FACTS.json"),"w"),indent=1)
