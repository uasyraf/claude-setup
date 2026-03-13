---
name: planning
description: Use built-in plan mode for implementation planning, not custom directories.
type: global
---

## Planning Protocol

- Use Claude Code's built-in plan mode (EnterPlanMode) for implementation planning
- Do NOT create `.planning/` directories or custom plan files unless the project uses GSD
- Plans should be concrete: ordered steps with file paths, not abstract descriptions
- Plans are proposals — wait for user approval before executing
- Update plans when approach changes rather than creating new ones
- Keep plans focused: if a plan exceeds 20 steps, split into phases
