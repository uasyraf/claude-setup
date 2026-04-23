# Team Definition Style Guide

Each `*-team.md` file under `~/.claude/teams/` defines one agent team that can
be auto-dispatched by the complexity router. All team files must pass
`_lint.js`.

## Required frontmatter

```yaml
---
name: <slug>-team                # kebab-case, must end with `-team`
description: <one-line summary>  # used when routing decision is reported
lead: <agent-id>                 # one of the members; owns coordination
trigger: <comma-separated phrases that characterize the task>
min_complexity: <integer 1..5>   # file-count threshold; team triggers when tier-estimated files ≥ this
members: [<agent-id>, <agent-id>, ...]   # 2–5 entries; lead must appear
---
```

### Key contract

| Key              | Type          | Required | Notes |
|------------------|---------------|----------|-------|
| `name`           | string        | yes      | Must match filename: `<name>.md` |
| `description`    | string        | yes      | One line; shown in routing output |
| `lead`           | string        | yes      | Must be a member of the team |
| `trigger`        | string        | yes      | Natural language for human readers; keyword matching lives in `router.cjs` |
| `min_complexity` | int (1–5)     | yes      | 1 = triggers at tier 1+, 5 = tier 3 only |
| `members`        | array         | yes      | 2–5 agents; no duplicates; lead included |

## Body structure

After the frontmatter, every team file has:

```markdown
## Workflow

1. **<Role>** — what this role does first
2. **<Role>** — ...
3. ...

## Coordination

- How members coordinate
- Who reviews whom
- Ordering or parallelism rules
```

Keep the body under 40 lines. Teams are archetypes, not playbooks.

## Priority order

When multiple teams match, selection follows the priority in
`CLAUDE.md § Team Selection Priority` (security > investigation > performance
> architecture > feature > migration > refactor > review > documentation >
onboarding). Only one team dispatches per task.

## Single-file overrides

A team may declare `min_complexity: 1` to trigger on single-file edits. Use
sparingly — currently only `security-team` qualifies (auth/secret changes must
always invite security review).

## Changes

When you edit a team definition:

1. Update the frontmatter keys above if structure changes
2. Run `node ~/.claude/teams/_lint.js` to verify
3. If you add a new team, also add matching keyword regex to
   `~/.claude/helpers/router.cjs` (`TEAM_KEYWORDS`, `TEAM_PRIORITY`)
