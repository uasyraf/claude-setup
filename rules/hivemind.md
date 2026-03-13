## Hivemind Coordination (Tier 2+ with agents)

### Single-Mind Protocol
When dispatching multiple parallel agents, they must converge as one:

1. **Intent Anchor** (before dispatch): objective, constraints, file ownership map (no overlap), shared interfaces
2. **File Isolation** (during): exclusive file ownership per agent. Shared interfaces defined upfront
3. **Convergence Review** (after): orchestrator reads ALL changes, spawns reviewer for integration check

### Anti-Drift Rules
- Never dispatch agents without an intent anchor
- Never let 2 agents modify the same file
- Always run convergence review before presenting results
- Stay within tier budget — don't spawn "just one more"

### Team Auto-Dispatch
- Task matches team trigger + meets `min_complexity` → dispatch team
- Team lead coordinates members — IRIS sets budget, lead manages execution
- Teams defined in `~/.claude/teams/` with triggers, leads, and member roles
- If no team matches but tier = 3, use individual agent dispatch
