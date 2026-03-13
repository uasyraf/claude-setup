---
name: investigation-team
description: Root cause analysis for non-obvious bugs and system issues.
lead: analyst
trigger: Non-obvious bugs, root cause analysis, production issues
min_complexity: 2
members: [explorer, analyst, coder]
---

## Workflow

1. **Explorer** — Gather context: error logs, stack traces, recent changes, affected code paths
2. **Analyst** — Analyze data, form hypotheses, identify root cause with evidence
3. **Coder** — Implement the fix based on analyst's diagnosis

## Coordination
- Explorer reports raw data, not interpretations
- Analyst produces a diagnosis document before any code changes
- Coder fixes only what the diagnosis identifies — no drive-by refactoring
