## Agent Dispatch

### Core Roles

| Role | subagent_type | When |
|------|--------------|------|
| Explorer | `Explore` | Context gathering, codebase discovery |
| Planner | `Plan` | Design decisions, implementation strategy (non-team Tier 3 only) |
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

Core roles are used for ad-hoc Tier 3 dispatch. Specialist roles are used within team definitions. Teams substitute the Planner role with the team lead (usually Architect) who handles planning implicitly as part of their workflow.

### Agent Budget by Tier

| Tier | Max Concurrent | Total Agents | Notes |
|------|---------------|--------------|-------|
| 1 | 0 | 0 | Main agent only |
| 2 | 3 | 3 | Only when team triggers; otherwise 0 |
| 3 | 3 | 5 | 3 concurrent max, 5 total across phases |

### Dispatch Rules
- Explorers first, in parallel, each with distinct directory scope
- Plan after context is gathered, not before
- Implementers parallel only on independent file sets; sequential on shared files
- One reviewer after all implementation complete
- Team dispatch: team lead owns parallelism decisions within budget

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
