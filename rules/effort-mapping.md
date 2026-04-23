## Effort Level Mapping

Map complexity tier to native Claude Code effort level so reasoning depth scales with task scope.

| Tier | Effort | When |
|------|--------|------|
| 1 | `low` | Direct question, typo, single-file edit, config tweak |
| 2 | `medium` | Multi-file change in one domain, feature addition, debugging |
| 3 | `high` | 3+ modules, architectural decision, full-codebase audit |
| Override | `xhigh` | User explicitly invokes `/effort xhigh` or task requires deepest reasoning (Opus 4.7 only) |

### Behavior
- Default at session start: `medium`
- Tier router auto-suggests effort level; user may override via `/effort <level>`
- Never downgrade below the user's explicit choice
- `xhigh` is opt-in — reserved for genuinely hard reasoning, not routine work

### Implementation
- `settings.json` → `effortLevel` controls baseline
- Tier router in `CLAUDE.md` determines task tier; route-handler bumps effort when task exceeds current tier
- A Tier 3 task at `low` effort triggers a one-line suggestion: "Consider `/effort high` for this scope"

### Override precedence
1. User explicit `/effort <level>` — highest
2. Task-detected tier mapping — automatic
3. Session default from `settings.json` — baseline
