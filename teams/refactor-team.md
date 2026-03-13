---
name: refactor-team
description: Large-scale refactoring across 5+ files with safety guarantees.
lead: architect
trigger: Large-scale refactoring involving 5+ files
min_complexity: 5
members: [explorer, architect, coder, reviewer]
---

## Workflow

1. **Explorer** — Map all usages, dependencies, and consumers of code being refactored
2. **Architect** — Design target state, migration path, and rollback strategy
3. **Coder** — Execute refactoring in atomic steps that keep tests passing
4. **Reviewer** — Verify no behavioral changes, all references updated, tests green

## Coordination
- Each refactoring step must leave the codebase in a valid state
- Run tests after each atomic change, not just at the end
- Architect defines the order of operations to minimize merge conflicts
