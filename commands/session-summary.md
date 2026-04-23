---
name: session-summary
description: Generate a daily rollup of sessions, commits, progress entries, and new debt markers in ~/.claude/logs/YYYY-MM-DD.md. Optional date arg (YYYY-MM-DD, local tz); defaults to today.
---

# session-summary

Produce a daily activity rollup.

## Steps

1. Parse any date from the user's invocation matching `YYYY-MM-DD`. If absent, use today.
2. Run `bash ~/.claude/scripts/session-summary.sh <DATE>` via the Bash tool (pass the parsed date as an explicit argv, not via shell interpolation of a variable name — this command does **not** rely on `$ARGUMENTS` expansion).
3. Read the generated file at `~/.claude/logs/<DATE>.md`.
4. If the file is the "No sessions recorded" short form, report that to the user and stop.
5. Otherwise, replace the `<!-- NARRATIVE -->` line with a 2-3 sentence factual synthesis: which projects absorbed the day, notable shipped work, any new debt that looks load-bearing. No speculation; no praise; no emoji. If the sentinel is missing (narrative was already written in a prior run), insert the new narrative on the line immediately after the H1 instead.
6. Confirm to the user with the output path and paste the narrative.

## Notes

- Do not re-parse `history.jsonl` or run `git` yourself — the script owns mechanical data.
- Do not fabricate entries absent from the rollup sections.
- If the script exits non-zero, surface its stderr to the user; do not retry.
