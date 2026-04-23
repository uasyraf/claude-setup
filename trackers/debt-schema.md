# DEBT.md Schema

Auto-maintained by `~/.claude/hooks/debt-scanner.cjs` on every `Write`/`Edit`/`MultiEdit`.

## File structure

```markdown
# Technical Debt

_Auto-maintained. Rows above the sentinel are machine-written; do not hand-edit._

| Date | Severity | Location | Marker | Message |
|------|----------|----------|--------|---------|
| 2026-04-23 | HIGH | src/payments.py:47 | HACK | hardcoded currency conversion |
| 2026-04-23 | MEDIUM | src/payments.py:88 | FIXME | off-by-one on refund calc |
| 2026-04-22 | LOW | src/utils.ts:12 | TODO | extract to shared module |
<!-- AUTO-DEBT-END -->

## Notes

_Add analysis, context, or resolution plans below this line._
```

## Markers detected

| Marker | Severity | Intent |
|--------|----------|--------|
| `HACK` | HIGH | Known kludge; must fix before production |
| `KLUDGE` | HIGH | Same as HACK |
| `XXX` | HIGH | Dangerous spot; revisit |
| `TECHDEBT` | HIGH | Explicit debt tag |
| `FIXME` | MEDIUM | Known bug in the spot |
| `DEBT` | MEDIUM | Lighter debt tag |
| `TODO` | LOW | Future improvement |

## Rules

- Sentinel `<!-- AUTO-DEBT-END -->` separates auto rows from manual notes
- Entries deduplicated by `file:line + marker + message`
- Project root detected by walking up for `.git` / `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod`, falling back to `cwd`
- Pipe characters in messages escaped with backslash
- Scanner skips edits to `DEBT.md` itself

## What it does NOT capture

- AI-introduced silent debt (added abstractions, dead branches) — no proven tool exists
- Debt in untouched files — only scans what the model edits
- Duplicate or paraphrased entries the model might write out-of-band
