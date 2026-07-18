## Agent Dispatch

### Core Roles

| Role | subagent_type | When |
|------|--------------|------|
| Explorer | `Explore` | Context gathering, codebase discovery |
| Planner | `Plan` | Design decisions, implementation strategy (used by the team lead during planning) |
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

Core roles are dispatched by the Agent Team lead during Tier 3 work (the lead uses these `subagent_type`s for its crew). Specialist roles are used within team definitions at Tier 2 and Tier 3. Teams substitute the Planner role with the team lead (usually Architect) who handles planning implicitly as part of their workflow.

### Agent Budget by Tier

| Tier | Orchestrator | Max Concurrent | Total Agents | Notes |
|------|--------------|---------------|--------------|-------|
| 1 | Main agent | 0 | 0 | No dispatch |
| 2 | Main agent or team | 3 | 3 | Team only when triggers match |
| 3 | Agent Team — built-in (lead + named teammates) | 10 | 10 | Named teammates coordinate via SendMessage + shared TaskList; batch spawns in one message |

### Single-file team overrides
- `security-team` gets `min_complexity: 1` — auth/auth-z/crypto/secret changes always trigger security-reviewer, even on single-file edits
- `documentation-team` gets `min_complexity: 1` when the request mentions ADRs — single-ADR creation triggers the doc-writer workflow

### Dispatch Rules

- Tier 1: main agent only
- Tier 2 + team match: team lead owns parallelism within budget
- Tier 2 + no team match: main agent only
- Tier 3: form an Agent Team using the harness's built-in team feature, with the
  main agent as lead. The lead runs explore → plan → permission gate → implement →
  review, spawning named teammates that coordinate peer-to-peer.
- If a team profile matched at Tier 3, use its role list as the crew.

### Agent Team contract (Tier 3, built-in team feature)

When promoting to Tier 3, the main agent (team lead):
1. Emits the pre-action banner with the promotion signal
2. Gathers context — spawn `Explore` teammates for discovery, or explore directly
3. Plans the work — via EnterPlanMode or a `Plan` agent — into ordered, file-scoped steps
4. Presents the plan and gets the user's approval (permission gate) BEFORE
   spawning any implementation teammates
5. Spawns crew as **named** teammates via the `Agent` tool (`coder`, `reviewer`,
   specialists as needed), each with a `name`, batched in one message for
   parallelism, within the 10-agent budget
6. Teammates coordinate directly: `SendMessage` by name for hand-offs, shared
   `TaskList` (`TaskCreate` + `TaskUpdate` `owner`) for work assignment. The lead
   does not relay every message. Do not poll — teammates report via
   `SendMessage`/task-notification.
7. Verifies the result (tests/lint/build) and reports

The team lead does NOT pre-approve the plan on the user's behalf.

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
