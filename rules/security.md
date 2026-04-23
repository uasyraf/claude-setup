---
name: security
description: Pre-commit security checklist, secret management, and security-reviewer agent dispatch triggers.
type: global
---

## Security Rules

### Pre-Commit Checklist
Before any commit, verify:
- [ ] No hardcoded secrets, API keys, tokens, or passwords in staged files
- [ ] No .env files or credential files staged
- [ ] All user input validated at system boundaries
- [ ] No `eval()`, `exec()`, or dynamic code execution with user input
- [ ] SQL queries parameterized (no string interpolation)
- [ ] File paths sanitized against directory traversal

### Security-Reviewer Dispatch Triggers
Dispatch depends on scope — defer to the Complexity Router in CLAUDE.md:
- **1 file**: inline review — no agent dispatch (Tier 1)
- **2-4 files**: dispatch `security-team` (explorer, security-reviewer, coder) at Tier 2
- **5+ files or full-codebase audit**: dispatch `security-team` at Tier 3

Trigger conditions (any of these qualify the task as security-sensitive):
- New authentication or authorization code is added
- New API endpoints accept user input
- Dependency updates touch security-sensitive packages
- File upload, deserialization, or crypto code changes
- User explicitly requests security audit

Note: Trigger conditions alone do NOT override the file-count tier. A 1-file auth change stays Tier 1 (inline review). The security-team only dispatches when min_complexity (2 files) is met.

### Secret Management
- Secrets go in environment variables or secret managers, never in code
- Use `.env.example` with placeholder values for documentation
- Add sensitive file patterns to `.gitignore` before they can be committed
