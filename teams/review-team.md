---
name: review-team
description: Multi-perspective code review for large changesets.
lead: reviewer
trigger: Multi-perspective review needed for 5+ file changes
min_complexity: 5
members: [reviewer, qa, security-reviewer]
---

## Workflow

1. **Reviewer** — Correctness, style, simplicity, and test coverage review
2. **QA** — Design patterns, best practices, and anti-pattern detection
3. **Security-Reviewer** — Security-focused review of the same changeset

## Coordination
- All three reviewers work in parallel on the same changeset
- Each produces independent findings — no cross-contamination
- Lead (reviewer) consolidates findings into a single prioritized report
