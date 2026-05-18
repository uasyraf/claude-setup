## Agent Dispatch

### Core Roles

| Role | subagent_type | When |
|------|--------------|------|
| Explorer | `Explore` | Context gathering, codebase discovery |
| Planner | `Plan` | Design decisions, implementation strategy (used by Nelson during Battle Plan) |
| Implementer | `coder` | Write/edit code, wire integrations |
| Reviewer | `reviewer` | Code review, verify correctness |

### Specialist Roles (team dispatch only)

| Role | subagent_type | When |
|------|--------------|------|
| Architect | `architect` | Structure, API/schema design, trade-off analysis |
| Analyst | `analyst` | Benchmarks, profiling, data-driven recommendations |
| QA | `qa` | Design patterns, best practices, anti-pattern detection |
| Security Reviewer | `security-reviewer` | OWASP, secrets, auth/authz, CVE scanning |
| Challenger | `challenger` | Adversarial analysis, failure modes, edge cases |

Core roles are dispatched by Nelson during Tier 3 missions (its captains and crew use these `subagent_type`s). Main-agent ad-hoc dispatch of core roles at Tier 3 is prohibited — see `### Dispatch Rules`. Specialist roles are used within team definitions at Tier 2. Teams substitute the Planner role with the team lead (usually Architect) who handles planning implicitly as part of their workflow.

### Agent Budget by Tier

| Tier | Orchestrator | Max Concurrent | Total Agents | Notes |
|------|--------------|---------------|--------------|-------|
| 1 | Main agent | 0 | 0 | No dispatch |
| 2 | Main agent or team | 3 | 3 | Team only when triggers match |
| 3 | Nelson | Nelson squadron cap | 10 squadron-level + crew | Nelson owns parallelism within its limits |

### Single-file team overrides
- `security-team` gets `min_complexity: 1` — auth/auth-z/crypto/secret changes always trigger security-reviewer, even on single-file edits
- `documentation-team` gets `min_complexity: 1` when the request mentions ADRs — single-ADR creation triggers the doc-writer workflow

### Dispatch Rules

- Tier 1: main agent only
- Tier 2 + team match: team lead owns parallelism within budget
- Tier 2 + no team match: main agent only
- Tier 3: invoke /nelson; Nelson handles all explore/plan/implement/review phases
  via its 8-step framework. Do NOT dispatch ad-hoc Explore/Plan/Implementer/Reviewer
  agents at Tier 3 — Nelson's captains and crew replace them.
- If a team matched at Tier 3, pass the team's role list to Nelson as the crew
  hint for the primary captain.

### Nelson invocation contract

Nelson auto-activates on its own pattern matches (per its SKILL.md description).
Our promotion rule is an EXPLICIT belt-and-braces trigger — it does not replace
Nelson's self-activation. If Nelson is already active, do not re-invoke.

When promoting to Tier 3, the main agent:
1. Emits the pre-action banner with promotion signal
2. Checks for an active mission marker: `ls .nelson/.active-* 2>/dev/null`.
   - If present: resume per Nelson's session-resumption flow
     (`references/damage-control/session-resumption.md`); do NOT start a fresh mission
   - If absent: proceed to invoke
3. Invokes /nelson with the user's original request as the mission brief
4. If a team matched, append a natural-language crew suggestion to the brief
   (e.g. "This mission matches our security-team — suggest forming a destroyer
   with red-cell navigator, security-reviewer, coder, reviewer"). Use Nelson's
   documented phrase "Use an agent team with Nelson to..." when explicitly
   forcing agent-team mode. Do NOT invent structured fields like `crew-hint:`
   — Nelson takes natural-language briefs
5. Hands control to Nelson — does not perform implementation work directly
   thereafter (matches Nelson's `admiral-at-the-helm` standing order)

Always use the interactive Step 5 permission gate. Do NOT invoke Nelson with
`nelson-data.py headless --auto-approve` — the user's review gate is the whole
point of the promotion.

The main agent does NOT pre-approve the plan on the user's behalf.

### Invocation Protocol
Every agent dispatch includes:
- **Scope**: files/directories the agent may touch
- **Objective**: one-sentence deliverable
- **Constraints**: what NOT to do
- **Definition of Done**: measurable completion criteria

### Self-Healing Cascade
When an agent fails:
1. **Retry** — same approach, fresh context (max 2 retries)
2. **Diagnose** — read error, check assumptions, identify root cause
3. **Adapt** — change approach based on diagnosis
4. **Inform** — if still blocked after adapt, report to user with context

### Planner Criteria
- Simplest solution that works (reject over-engineering)
- Reuse existing code/patterns found by explorers
- Consider edge cases and error paths
- If plan requires 5+ new files, question whether there's a simpler way
- Output: ordered steps with file paths, not abstract descriptions

### Reviewer Quality Checklist
1. Readability: Can a new developer understand this in one pass?
2. Simplicity: Is this the simplest way to achieve the goal?
3. Correctness: Edge cases handled? Off-by-one? Null paths? Resource cleanup?
4. Style: Matches existing codebase conventions?
5. Security: Input validated at boundaries? No injection vectors?
6. Testability: Can this be tested without mocking internals?
7. Performance: Obvious N+1 queries? Unbounded loops? Memory leaks?
