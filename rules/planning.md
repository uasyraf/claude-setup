---
name: planning
description: Use built-in plan mode for implementation planning, not custom directories.
type: global
---

## Planning Protocol

- Use Claude Code's built-in plan mode (EnterPlanMode) for implementation planning
- Do NOT create `.planning/` directories or custom plan files
- Plans should be concrete: ordered steps with file paths, not abstract descriptions
- Plans are proposals — wait for user approval before executing
- Update plans when approach changes rather than creating new ones
- Keep plans focused: if a plan exceeds 20 steps, split into phases

## Nelson missions

When Tier 3 work invokes Nelson, planning is owned by Nelson's Step 3 (Battle Plan)
and approved at Step 5 (Get Permission to Sail). Do NOT use EnterPlanMode for the
same work — Nelson's battle-plan.md and the permission gate replace it.

EnterPlanMode remains the right tool for Tier 1 and Tier 2 work that doesn't
escalate to Nelson.
