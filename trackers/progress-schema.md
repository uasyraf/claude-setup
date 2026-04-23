# PROGRESS.md Schema

Auto-maintained by `~/.claude/hooks/progress-tracker.cjs` on every `Stop` event.

## File structure

```markdown
# Progress

_Auto-maintained. Rows above the sentinel are machine-written._

### 2026-04-23T12:48:00.000Z
_session: `abc123def456`_

**Completed tasks:**
- Phase 1: Foundation
- Phase 2: Memory recall hooks

**Commits:**
- `a1b2c3d feat: add debt scanner`
- `d4e5f6g test: verify self-heal cascade`

**Files touched:**
- `src/foo.ts`
- `tests/foo.test.ts`

### 2026-04-22T17:03:12.000Z
...

<!-- AUTO-PROGRESS-END -->

## Manual notes

_Add long-form updates below._
```

## Rules

- Sentinel `<!-- AUTO-PROGRESS-END -->` separates auto from manual sections
- Entries sorted newest-first (hook prepends)
- After 100 entries, oldest half rotate to `PROGRESS-archive.md`
- Never writes to `$HOME` or `~/.claude/` — only real project roots

## Signals captured (in order of preference)

1. **Completed tasks** — `TaskUpdate(status=completed)` calls from transcript
2. **Commits** — `git log --since="1 hour ago"` within project
3. **Files touched** — `Write`/`Edit`/`MultiEdit` tool uses from transcript

If none of the three signals fire, the hook skips — no empty entries.
