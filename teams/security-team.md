---
name: security-team
description: Security audits, vulnerability assessment, and auth/input code review.
lead: security-reviewer
trigger: Security audits, new authentication/authorization code, input handling changes
min_complexity: 2
members: [explorer, security-reviewer, coder]
---

## Workflow

1. **Explorer** — Map attack surface: endpoints, input sources, auth flows, data stores
2. **Security-Reviewer** — Perform OWASP Top 10 audit, secrets scan, dependency check
3. **Coder** — Implement remediations for findings rated HIGH or CRITICAL

## Coordination
- Security-reviewer produces findings before any code changes
- Coder addresses findings in severity order (CRITICAL first)
- Security-reviewer re-validates fixes after implementation
