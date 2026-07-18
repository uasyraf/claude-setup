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

## Tier 3 Agent Team planning

When Tier 3 work forms an Agent Team, the team lead owns planning: use
EnterPlanMode (or a `Plan` agent) to produce the ordered, file-scoped plan, then
present it at the permission gate for user approval before dispatching crew.

EnterPlanMode is the planning tool across all tiers — there is no separate
orchestrator that replaces it.
