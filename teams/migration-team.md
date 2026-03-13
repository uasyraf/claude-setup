---
name: migration-team
description: Major version upgrades, breaking changes, and dependency migrations.
lead: architect
trigger: Major version upgrades, breaking changes, framework migrations
min_complexity: 4
members: [explorer, architect, coder, reviewer]
---

## Workflow

1. **Explorer** — Inventory affected code: deprecated APIs, breaking changes, new patterns
2. **Architect** — Plan migration path: order of operations, compatibility shims, rollback points
3. **Coder** — Execute migration in phases, keeping the build green between phases
4. **Reviewer** — Verify migration completeness: no deprecated usage remaining, tests passing

## Coordination
- Architect identifies phases that can be merged independently
- Each phase is a working state — no "big bang" migrations
- Coder documents any temporary compatibility code for later cleanup
