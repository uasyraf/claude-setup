#!/usr/bin/env bash
# session-summary.sh — deterministic daily rollup generator.
# Reads ~/.claude/history.jsonl, per-project PROGRESS.md / DEBT.md, and git log;
# writes ~/.claude/logs/<DATE>.md with a <!-- NARRATIVE --> sentinel for Claude to fill in.
# Dates are interpreted in local tz. Usage: session-summary.sh [YYYY-MM-DD]

set -euo pipefail
IFS=$'\n\t'

HISTORY="${HOME}/.claude/history.jsonl"
LOG_DIR="${HOME}/.claude/logs"
PROJECT_ROOT_MARKERS=(.git package.json pyproject.toml Cargo.toml go.mod)
SECRET_PATTERNS='s#sk-[A-Za-z0-9]{20,}#<REDACTED>#g; s#ghp_[A-Za-z0-9]+#<REDACTED>#g; s#xox[baprs]-[A-Za-z0-9-]+#<REDACTED>#g; s#Bearer [A-Za-z0-9._-]+#<REDACTED>#g; s#\b[a-fA-F0-9]{32,}\b#<REDACTED>#g'

DATE="${1:-$(date +%Y-%m-%d)}"
if ! [[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "usage: $(basename "$0") [YYYY-MM-DD]" >&2
  exit 2
fi
if ! date -d "$DATE 00:00:00" +%s >/dev/null 2>&1; then
  echo "invalid date: $DATE" >&2
  exit 2
fi

if [[ ! -f "$HISTORY" ]]; then
  echo "history file not found: $HISTORY" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"
OUT="${LOG_DIR}/${DATE}.md"
TODAY="$(date +%Y-%m-%d)"
NOW="$(date -Iseconds)"

START_MS=$(( $(date -d "$DATE 00:00:00" +%s) * 1000 ))
END_MS=$(( $(date -d "$DATE 23:59:59" +%s) * 1000 + 999 ))

TMP_FILTER="$(mktemp)"
trap 'rm -f "$TMP_FILTER"' EXIT

jq -c --argjson s "$START_MS" --argjson e "$END_MS" \
  'select((.timestamp // 0) >= $s and (.timestamp // 0) <= $e)' \
  "$HISTORY" > "$TMP_FILTER"

# Historical-date caveat under the H1
CAVEAT=""
if [[ "$DATE" < "$TODAY" ]]; then
  CAVEAT="_Commits reflect current git history as of ${NOW}, not a snapshot of that day._"$'\n\n'
fi

if [[ ! -s "$TMP_FILTER" ]]; then
  {
    printf '# Session Summary — %s\n\n' "$DATE"
    [[ -n "$CAVEAT" ]] && printf '%s' "$CAVEAT"
    printf '<!-- NARRATIVE -->\n\n'
    printf 'No sessions recorded on %s.\n' "$DATE"
  } > "$OUT"
  exit 0
fi

find_project_root() {
  local dir="$1"
  [[ -d "$dir" ]] || { echo ""; return; }
  while [[ -n "$dir" && "$dir" != "/" ]]; do
    for marker in "${PROJECT_ROOT_MARKERS[@]}"; do
      if [[ -e "${dir}/${marker}" ]]; then
        echo "$dir"
        return
      fi
    done
    dir="$(dirname "$dir")"
  done
  echo ""
}

is_forbidden_root() {
  local root="$1"
  [[ -z "$root" ]] && return 0
  [[ "$root" == "$HOME" ]] && return 0
  [[ "$root" == "${HOME}/.claude" || "$root" == "${HOME}/.claude/"* ]] && return 0
  return 1
}

# Collect unique project cwds (order preserved), filtering by allowlist regex
UNIQUE_PROJECTS=()
declare -A SEEN_PROJECT=()
while IFS= read -r p; do
  [[ -z "$p" ]] && continue
  if ! [[ "$p" =~ ^/[a-zA-Z0-9_./\ -]+$ ]]; then
    continue
  fi
  if [[ -z "${SEEN_PROJECT[$p]+x}" ]]; then
    SEEN_PROJECT[$p]=1
    UNIQUE_PROJECTS+=("$p")
  fi
done < <(jq -r '.project // empty' "$TMP_FILTER")

# Build per-project metadata: root resolution, prompt counts
declare -A PROJECT_ROOT=()
declare -A PROJECT_EXISTS=()
declare -A PROMPT_COUNT=()
UNIQUE_ROOTS=()
declare -A SEEN_ROOT=()

for p in "${UNIQUE_PROJECTS[@]}"; do
  count=$(jq -r --arg p "$p" 'select(.project == $p) | .project' "$TMP_FILTER" | wc -l)
  PROMPT_COUNT[$p]="$count"
  if [[ ! -e "$p" ]]; then
    PROJECT_EXISTS[$p]=0
    PROJECT_ROOT[$p]=""
    continue
  fi
  PROJECT_EXISTS[$p]=1
  root="$(find_project_root "$p")"
  if is_forbidden_root "$root"; then
    PROJECT_ROOT[$p]=""
  else
    PROJECT_ROOT[$p]="$root"
    if [[ -z "${SEEN_ROOT[$root]+x}" ]]; then
      SEEN_ROOT[$root]=1
      UNIQUE_ROOTS+=("$root")
    fi
  fi
done

{
  printf '# Session Summary — %s\n\n' "$DATE"
  [[ -n "$CAVEAT" ]] && printf '%s' "$CAVEAT"
  printf '<!-- NARRATIVE -->\n\n'

  # Sessions table: one row per (sessionId, project)
  printf '## Sessions\n\n'
  printf '| session | project | prompts | first | last |\n'
  printf '|---|---|---|---|---|\n'
  jq -r '[.sessionId // "unknown", .project // "unknown", .timestamp // 0] | @tsv' "$TMP_FILTER" \
    | awk -F'\t' -v OFS='\t' '{ key=$1 "|" $2; c[key]++; if (!(key in lo) || $3 < lo[key]) lo[key]=$3; if (!(key in hi) || $3 > hi[key]) hi[key]=$3; split(key, kp, "|"); sess[key]=kp[1]; proj[key]=kp[2]; } END { for (k in c) print sess[k], proj[k], c[k], lo[k], hi[k]; }' \
    | sort \
    | while IFS=$'\t' read -r sess proj n lo hi; do
        sess_short="${sess:0:12}"
        lo_hms=$(date -d "@$((lo/1000))" +%H:%M:%S)
        hi_hms=$(date -d "@$((hi/1000))" +%H:%M:%S)
        printf '| `%s` | `%s` | %s | %s | %s |\n' "$sess_short" "$proj" "$n" "$lo_hms" "$hi_hms"
      done
  printf '\n'

  # Projects touched
  printf '## Projects touched\n\n'
  for p in "${UNIQUE_PROJECTS[@]}"; do
    n="${PROMPT_COUNT[$p]}"
    if [[ "${PROJECT_EXISTS[$p]}" == "0" ]]; then
      printf -- '- _project path not found: %s_ (%s prompts)\n' "$p" "$n"
      continue
    fi
    root="${PROJECT_ROOT[$p]}"
    if [[ -z "$root" ]]; then
      printf -- '- `%s` (%s prompts, root=none)\n' "$p" "$n"
    else
      printf -- '- `%s` (%s prompts, root=`%s`)\n' "$p" "$n" "$root"
    fi
  done
  printf '\n'

  # Commits per project root
  printf '## Commits\n\n'
  if [[ ${#UNIQUE_ROOTS[@]} -eq 0 ]]; then
    printf '_none_\n\n'
  else
    any_commits=0
    for root in "${UNIQUE_ROOTS[@]}"; do
      if [[ ! -d "${root}/.git" ]]; then
        continue
      fi
      commits="$(git -C "$root" log --since="${DATE} 00:00:00" --until="${DATE} 23:59:59" --pretty=format:'- %h %s' --no-merges 2>/dev/null || true)"
      if [[ -n "$commits" ]]; then
        any_commits=1
        printf '### `%s`\n\n' "$root"
        printf '%s\n\n' "$commits"
      fi
    done
    [[ "$any_commits" == "0" ]] && printf '_none_\n\n'
  fi

  # Progress log entries (section-based extraction)
  printf '## Progress log entries\n\n'
  any_progress=0
  for root in "${UNIQUE_ROOTS[@]}"; do
    pfile="${root}/PROGRESS.md"
    [[ -f "$pfile" ]] || continue
    block="$(awk -v d="$DATE" '
      /^### / { in_block = (index($0, "### " d "T") == 1); next }
      /^<!-- AUTO-PROGRESS-END -->/ { in_block = 0 }
      in_block { print }
    ' "$pfile")"
    # Trim leading/trailing blank lines
    block="$(printf '%s\n' "$block" | awk 'NF { found=1 } found { print }' | awk 'BEGIN{RS=""} {print; exit}')"
    if [[ -n "$block" ]]; then
      any_progress=1
      printf '### `%s`\n\n' "$root"
      printf '%s\n\n' "$block"
    fi
  done
  [[ "$any_progress" == "0" ]] && printf '_none_\n\n'

  # New debt markers
  printf '## New debt markers\n\n'
  any_debt=0
  for root in "${UNIQUE_ROOTS[@]}"; do
    dfile="${root}/DEBT.md"
    [[ -f "$dfile" ]] || continue
    rows="$(grep -E "^\| ${DATE} \|" "$dfile" 2>/dev/null || true)"
    if [[ -n "$rows" ]]; then
      any_debt=1
      printf '### `%s`\n\n' "$root"
      printf '| date | severity | location | marker | message |\n'
      printf '|---|---|---|---|---|\n'
      printf '%s\n\n' "$rows"
    fi
  done
  [[ "$any_debt" == "0" ]] && printf '_none_\n\n'

  # Top prompts (non-slash, redacted, truncated)
  printf '## Top prompts\n\n'
  printf '| time | project | prompt |\n'
  printf '|---|---|---|\n'
  jq -r 'select((.display // "") | startswith("/") | not)
         | [.timestamp // 0, .project // "unknown", (.display // "") | tostring] | @tsv' "$TMP_FILTER" \
    | head -n 200 \
    | awk -F'\t' '{
        ts=$1; proj=$2; disp=$3;
        gsub(/\r/, " ", disp); gsub(/\n/, " ", disp); gsub(/\|/, "\\|", disp); gsub(/`/, "'"'"'", disp);
        if (length(disp) > 120) disp = substr(disp, 1, 117) "...";
        print ts "\t" proj "\t" disp;
      }' \
    | sed -E "$SECRET_PATTERNS" \
    | sort -n \
    | head -n 10 \
    | while IFS=$'\t' read -r ts proj disp; do
        hms=$(date -d "@$((ts/1000))" +%H:%M:%S)
        printf '| %s | `%s` | %s |\n' "$hms" "$proj" "$disp"
      done
  printf '\n'
} > "$OUT"
