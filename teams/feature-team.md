---
name: feature-team
description: Full-stack feature development across multiple modules.
lead: architect
trigger: New feature spanning multiple files or modules
min_complexity: 3
members: [explorer, architect, coder, reviewer]
---

## Workflow

1. **Explorer** — Map affected modules, find existing patterns and interfaces
2. **Architect** — Design the feature: component boundaries, data flow, API contracts
3. **Coder** — Implement the feature following the architect's design
4. **Reviewer** — Verify implementation correctness, style, and test coverage

## Coordination
- Architect defines file ownership before coder starts
- Coder implements in dependency order (data layer → logic → presentation)
- Reviewer checks integration points between modules
