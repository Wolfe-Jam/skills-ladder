#!/bin/bash
# Usage: run_selection.sh <variant> <query-index> <run#> <outdir>  — which skill (if any) does the agent invoke?
# Note: Claude Code also runs read-only shell commands without asking, even though Bash isn't in --allowedTools.
# The published transcripts show 118 such calls; writes stay blocked. The score is the first Skill call.
D=$(cd "$(dirname "$0")/.." && pwd); V=$1; Q=$2; I=$3; OUT=$4
QUERY=$(python3 -I -c "import json,sys;q=json.load(open('$D/selection/SELECTION.json'))['queries'];a=[(k,x) for k in q for x in q[k]];print(a[$Q][1])")
T=$(mktemp -d /tmp/sel-$V-$Q-$I.XXXX); bash "$D/harness/fixture.sh" "$T" >/dev/null
mkdir -p "$T/.claude/skills"; cp -R "$D/selection/$V/"* "$T/.claude/skills/"; cd "$T"
claude -p "$QUERY" --model claude-sonnet-5-5 --setting-sources project --strict-mcp-config --no-session-persistence \
  --output-format stream-json --verbose --permission-mode default --allowedTools "Skill" "Read" "Glob" "Grep" \
  < /dev/null > "$OUT/$V-q$Q-r$I.jsonl" 2>/dev/null
