---
name: session-bootstrap
description: On session start, silently read CLAUDE.md and README.md without producing output.
type: global
---

## Session Bootstrap

On conversation start:
1. Silently read `CLAUDE.md` (project root) if it exists — absorb instructions
2. Silently read `README.md` (project root) if it exists — understand project context
3. Do NOT output a summary, greeting, or acknowledgment of what was read
4. Do NOT list capabilities or offer help unprompted
5. Wait for the user's first message before taking any action
6. Do NOT spawn agents, run commands, or create files during bootstrap
