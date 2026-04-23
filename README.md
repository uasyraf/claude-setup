# Claude Code Setup — Operating Manual

This directory is the **global** Claude Code configuration — reusable machinery applied to every project. Business/domain context lives in each project's own `CLAUDE.md`. Anything that would repeat in every project belongs here, not per-project.

## Design principles

1. **Global-first** — universal logic lives at `~/.claude/`; projects only hold domain context + optional overrides.
2. **Proportional intelligence** — features activate by tier. Tier 1 runs with zero overhead; Tier 3 dispatches specialist teams.
3. **Background-first** — memory updates, trackers, notifications, self-healing all run silently via hooks.
4. **No invented tooling** — the router, teams, memory, and escalation patterns are grounded in documented Claude Code hook APIs and established practice.
5. **Cite before you code** — rules files encode SOLID, Clean Code, Refactoring Guru, and language-native style guides (PEP 8, Airbnb JS, Google Java).

## Directory map

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Operating system: identity, complexity router, team priority, prohibitions, autonomy, on-every-task loop |
| `settings.json` | Hooks, permissions, `defaultMode: auto`, `effortLevel: xhigh`, enabled plugins, marketplaces |
| `settings.local.json` | Per-session state the harness writes (e.g. tier-mapped `effortLevel`) — gitignored |
| `rules/` | 13 cross-cutting rule files: router overview, tone, effort map, security, context hygiene, planning, session bootstrap, plus per-language standards (Python, TypeScript, PHP, Java, C#) |
| `agents/` | Nine role agents: analyst, architect, challenger, explorer, implementer, qa, reviewer, security-reviewer, strategist. Plus `agents/.archived/` historical library. |
| `teams/` | 10 team definitions + `_STYLE.md` + `_lint.js`. Teams are auto-dispatched by the router based on keyword match, priority, and `min_complexity`. |
| `skills/` | Installed skill packs (superpowers, document-skills, obsidian, refactoring-mastery, ui-ux-pro-max, …) |
| `commands/` | Slash-command definitions |
| `hooks/` | Event hooks (see table below) |
| `helpers/` | Shared helper modules for hooks: `hook-handler.cjs`, `router.cjs`, `quality-gate.cjs`, `auto-memory-hook.mjs`, `statusline.cjs` |
| `templates/` | `adr/template.md` (Nygard), `changelog/CHANGELOG.md` (Keep a Changelog 1.1.0), `docs/README.md` (Diátaxis), `progress/PROGRESS.md`, `project-claude.md`, `telegram-config-example.json` |
| `trackers/` | Schema docs for auto-written `PROGRESS.md` and `DEBT.md` |
| `scripts/` | One-shot utilities (e.g. `migrate-project-claude.sh`) |
| `projects/<slug>/memory/` | Per-project auto-memory snapshots — gitignored |
| `plans/` | Plan-mode artifacts — gitignored |
| `plugins/` | Plugin manifests |

## Hook lifecycle

| Event | Hook | Purpose |
|-------|------|---------|
| `SessionStart` | `hook-handler.cjs session-restore` + `auto-memory-hook.mjs import` | Restore prior session; import memory entries (no-op while claude-mem disabled) |
| `UserPromptSubmit` | `hook-handler.cjs route` + `auto-memory-recall.cjs` | Classify tier, pick agent, match team, emit `[TIER] [AGENT] [TEAM] [EFFORT]`; inject recalled memory |
| `PreToolUse Bash` | `hook-handler.cjs pre-bash` | Block destructive commands; run pre-commit test gate on Tier 2/3 |
| `PreToolUse Task` | `auto-memory-recall.cjs` | Mid-task recall before subagent dispatch (60s debounced) |
| `PostToolUse Write\|Edit\|MultiEdit` | `hook-handler.cjs post-edit` | Record edit metrics |
| `PostToolUse Write\|Edit\|MultiEdit` | `quality-gate.cjs` | Critical-severity secret/eval/SQL block; advisory SOLID checklist |
| `PostToolUse Write\|Edit\|MultiEdit` | `debt-scanner.cjs` | Append `TODO`/`FIXME`/`HACK`/`DEBT` markers to `<project>/DEBT.md` |
| `PostToolUse Write\|Edit\|MultiEdit` | `progress-tracker.cjs --checkpoint` | Flush a `PROGRESS.md` row every 10 edits per session |
| `PostToolUse Bash` | `self-heal.cjs` | Classify Bash failures; emit diagnostic; escalate to Telegram after 3rd same-category failure |
| `PostToolUse *` | `context-monitor.cjs` | Track context window usage |
| `Stop` | `auto-memory-hook.mjs sync` + `progress-tracker.cjs` + `stop-telegram.cjs` | Sync memory; write session-end `PROGRESS.md` entry; notify Telegram with files/commits summary |
| `PreCompact manual\|auto` | `hook-handler.cjs compact-manual\|compact-auto` | Guide what to preserve/drop before compaction |

## Complexity router

The router (`helpers/router.cjs`, invoked from `hook-handler.cjs route`) classifies every prompt into a tier and — when keywords match — a team.

| Tier | Signals | Effort | Agents |
|------|---------|--------|--------|
| 1 DIRECT | 1 file, single-edit, question, typo, config tweak | `low` | 0 |
| 2 GUIDED | 2–4 files in one domain, feature addition, debugging | `medium` | 0 default, up to 3 if a team triggers |
| 3 ORCHESTRATED | 5+ files, 2+ domains, greenfield, architectural decision | `high` | Up to 5 total, 3 concurrent |

`effortLevel: xhigh` in `settings.json` overrides everything — the router detects that and skips the automatic write. Remove the global `xhigh` setting to let tier-proportional effort take over. Manual override: `/effort <level>`.

### Team selection

The router runs keyword regexes in this priority order and stops at the first match whose `min_complexity` is met:

1. security-team (router override: always triggers on keyword match, regardless of `min_complexity`)
2. investigation-team
3. performance-team
4. architecture-team
5. feature-team
6. migration-team
7. refactor-team
8. review-team
9. documentation-team
10. onboarding-team

Teams live in `teams/*.md` with frontmatter `name/description/lead/trigger/min_complexity/members`. Validate with `node teams/_lint.js`. The style contract is in `teams/_STYLE.md`.

When a team triggers, the router prints `[TEAM] <name> — lead: X — members: a, b, c` into the prompt context and Claude delegates via the `Agent` tool with those subagent types.

## Memory

Two layers, kept simple:

### Native MEMORY.md
`~/.claude/projects/<project-slug>/memory/MEMORY.md` acts as an index. Individual memory files (`user_role.md`, `feedback_*.md`, `project_*.md`, `reference_*.md`) hold the actual entries with YAML frontmatter. The harness writes these automatically based on persistent directives and recurring patterns. Keep under 200 lines.

### Auto-recall (background)
`hooks/auto-memory-recall.cjs` runs on both `UserPromptSubmit` and `PreToolUse Task`:

- Extracts up to 8 keywords from the prompt (stopword-filtered, length > 2)
- Scores `~/.claude/projects/<slug>/memory/*.md`, `<cwd>/CLAUDE.md`, `<cwd>/PROGRESS.md`, `<cwd>/DEBT.md`
- Injects top 5 snippets (≤ 2 KB total) via `additionalContext`
- Debounced 60 s per session on the `Task` matcher so subagent fan-out doesn't re-inject

### claude-mem (disabled)
`claude-mem@thedotmack` is installed but disabled in `settings.json` (documented orphan-process / memory-leak / unauthenticated HTTP API issues). Native MEMORY.md + grep recall is the current primary. Re-enabling is a one-flag change once upstream stabilises — or swap for a successor (Mem0, Letta).

## Trackers

### `PROGRESS.md` (per project)
Written by `hooks/progress-tracker.cjs`. Two modes:

- **Session-end** (Stop hook): extracts `TaskUpdate(completed)`, recent git commits, and modified files; writes a timestamped section above the `<!-- AUTO-PROGRESS-END -->` sentinel.
- **Checkpoint** (`--checkpoint` on every Write/Edit/MultiEdit): per-session edit counter in `/tmp`. Every 10 edits, flushes a compact `### <ts> — checkpoint` row with files touched.

Rotates into `PROGRESS-archive.md` after 100 live entries. Never creates `PROGRESS.md` in `$HOME` or under `~/.claude/`.

### `DEBT.md` (per project)
Written by `hooks/debt-scanner.cjs` on every Write/Edit/MultiEdit. Detects `TODO|FIXME|HACK|XXX|DEBT|TECHDEBT|KLUDGE` markers with HIGH/MEDIUM/LOW severity. Deduped by `file:line`. Schema lives in `trackers/debt-schema.md`.

## Self-healing

`hooks/self-heal.cjs` classifies every failed Bash invocation against a 7-category taxonomy (`missing_binary`, `perms`, `missing_path`, `missing_dep`, `syntax`, `network`, `generic`) and emits a structured diagnostic the model consumes on the next turn.

Cascade (per session, category-specific):

1. Failure 1–2: retry with suggested fix
2. Failure 3: switch approach (diagnose-adapt directive)
3. Failure 4+: escalate — emit "stop and report" directive AND pipe a `self_heal_escalate` event to `telegram-bridge.cjs`

State is persisted at `/tmp/claude-self-heal-<session>.json`.

## Quality gate

`helpers/quality-gate.cjs` on every Write/Edit/MultiEdit:

- **Blocking** (exit 2): AWS access keys, RSA/EC private keys, OpenAI/Anthropic/Stripe/GitHub tokens, generic `api_key|secret|password|token = "…"` literals (unless flagged as placeholder), `eval(req|input|body|…)`, SQL queries interpolating `${req|input|…}`. Skips test/fixture/example paths. False-positive escape: include an `EXAMPLE`/`TEST_KEY`/`CHANGEME` placeholder hint or move to `tests/` | `__tests__/` | `fixtures/` | `.env.example`.
- **Advisory** (exit 0): SOLID, KISS, YAGNI, Rule of Three, function/indent limits, plus a one-line language-specific checklist (12 languages).

## Destructive-action gate

`hook-handler.cjs pre-bash` blocks (exit 1) these patterns before the tool runs:

- Literal destructive strings: `rm -rf /`, `rm -rf ~`, `rm -rf /etc|/usr|/var|/boot|/bin|/sbin|/lib`, fork bomb, Windows disk format
- Pattern-matched:
  - `git push … --force|-f`
  - `git reset --hard`
  - `git branch -D`
  - `git clean -f…`
  - `DROP TABLE/DATABASE/SCHEMA`
  - `TRUNCATE TABLE`
  - `DELETE FROM <tbl>` without `WHERE`
  - `rm -rf *` (unbounded wildcard)

Blocked commands require explicit user confirmation before retry. The pre-commit test gate runs additionally when tier ≥ 2: detects the project test command (`npm test`, `pytest`, `cargo test`, Maven/Gradle) and blocks the commit if tests fail.

## Telegram boss-mode

Two-piece setup. The outbound bridge at `hooks/telegram-bridge.cjs` is wired into both `Stop` (via `stop-telegram.cjs` with session summary) and `self-heal escalate`. Config lives at `~/.claude/telegram.json` (gitignored).

### Enable via community bot (any plan)
1. Create a bot via [@BotFather](https://t.me/BotFather), note the token
2. DM [@userinfobot](https://t.me/userinfobot) for your chat ID
3. Copy the template and fill in real values:
   ```bash
   cp ~/.claude/templates/telegram-config-example.json ~/.claude/telegram.json
   # edit bot_token + chat_id; leave channels_api: false
   ```
4. Smoke test:
   ```bash
   echo '{"event":"session_end","title":"Hello","body":"bridge working"}' \
     | node ~/.claude/hooks/telegram-bridge.cjs
   ```

### Enable via Anthropic Channels (Max/Team/Enterprise plans)
The `telegram@claude-plugins-official` plugin is enabled. Use the `telegram:configure` and `telegram:access` skills to pair a bot and set channel policy. Then set `channels_api: true` in `telegram.json`.

### Bidirectional control (optional)
The bridge is outbound only. For inbound (send commands from Telegram and receive replies), install [`RichardAtCT/claude-code-telegram`](https://github.com/RichardAtCT/claude-code-telegram) (2.5 k ★, v1.6 Mar 2026) as a systemd user service. It runs alongside this setup, not as a hook.

## Autonomy

- `defaultMode: auto` — no permission prompts for allow-listed commands
- `skipDangerousModePermissionPrompt: true` — destructive gate above is the safety net
- Allow-list in `settings.json` covers common dev commands (npm/bun/pnpm/pytest/cargo/git/gh/read-only utilities)
- Escalation: blocked commands, self-heal exhaustion, and Stop hooks all reach Telegram when configured

## Code quality standards

Rules files at `~/.claude/rules/`:

| File | Scope |
|------|-------|
| `python.md` | PEP 8 via ruff, type annotations, Pydantic at boundaries, pathlib, pytest fixtures |
| `typescript.md` | No `any`, Zod at boundaries, named exports, Vitest, async/await |
| `php.md` | `declare(strict_types=1)`, PSR-12, Laravel conventions, Pest/PHPUnit |
| `java.md` | Records for DTOs, constructor injection, JUnit 5, package-by-feature |
| `csharp.md` | Nullable enabled, primary constructors, xUnit, async all the way |
| `security.md` | Pre-commit checklist, security-reviewer triggers, secret management |
| `context-hygiene.md` | Window management, session discipline, verification loop |
| `effort-mapping.md` | Tier → effort mapping |
| `agent-dispatch.md` | Agent roles, budgets, dispatch rules, planner/reviewer checklists |
| `planning.md` | Use built-in plan mode; concrete ordered steps |
| `session-bootstrap.md` | Silent bootstrap — no greeting, read CLAUDE.md + README silently |
| `dual-mode.md` | Strategic vs human tone |
| `output-defaults.md` | Formatting defaults |

## Plugins & marketplaces

| Plugin | Source | Status | Role |
|--------|--------|--------|------|
| superpowers | superpowers-dev | on | Brainstorm / plan / execute / TDD / debugging meta-skills |
| document-skills | anthropic-agent-skills | on | Official skills (pdf, pptx, xlsx, docx, frontend-design, …) |
| example-skills | anthropic-agent-skills | on | Official example skills |
| claude-api | anthropic-agent-skills | on | Claude API / SDK helpers |
| obsidian | obsidian-skills | on | Obsidian vault integration |
| ui-ux-pro-max | ui-ux-pro-max-skill | on | UI/UX design intelligence |
| clangd-lsp | claude-plugins-official | on | C/C++ LSP |
| telegram | claude-plugins-official | on | Telegram Channel configuration / access skills |
| comprehensive-review | claude-code-workflows (wshobson/agents) | on | architect-review, code-reviewer, security-auditor |
| debugging-toolkit | claude-code-workflows | on | debugger, dx-optimizer |
| agent-orchestration | claude-code-workflows | on | context-manager |
| backend-development | claude-code-workflows | on | backend-architect, performance-engineer, tdd-orchestrator, test-automator, event-sourcing-architect, graphql-architect, temporal-python-pro |
| claude-mem | thedotmack | **off** | Disabled — known orphan/leak issues. Re-enable after upstream fixes. |

Additional specialists available from `claude-code-workflows` marketplace (wshobson/agents, 34 k ★). Install with `claude plugin install <name>@claude-code-workflows`.

## Project-level `CLAUDE.md` template

Minimal by design. Everything technical is inherited from this global setup. Template lives at `templates/project-claude.md`:

```markdown
# <Project Name>

## Domain
<One paragraph: what this system does, who uses it, core nouns.>

## Constraints
- <Regulatory/compliance: "PCI-DSS — never log PANs">
- <Performance: "p95 < 200ms">
- <Compatibility: "IE11 not supported">

## Conventions (only where diverging from global)
- <"Tests colocated as *.spec.ts, not in tests/">

## Do not touch
- <paths that are generated or legacy>

## Overrides (optional)
effort_override: high
```

Migrate existing project files:
```bash
bash ~/.claude/scripts/migrate-project-claude.sh /path/to/project     # dry-run
bash ~/.claude/scripts/migrate-project-claude.sh -y /path/to/project  # apply
```

## Verification checklist

| Check | Command | Expect |
|-------|---------|--------|
| Settings parses | `node -e "JSON.parse(require('fs').readFileSync('$HOME/.claude/settings.json','utf-8'))"` | exit 0, no output |
| Team lint | `node ~/.claude/teams/_lint.js` | `10/10 teams pass` |
| Router CLI | `node ~/.claude/helpers/router.cjs "audit auth across all of src/"` | JSON with `tier: 3`, `team.name: security-team` |
| Tier routing + team | New prompt `audit auth across all of src/` | stdout shows `[TIER:1]` + `[TEAM] security-team` (security-team override triggers regardless of tier) |
| Tier 3 detection | New prompt referencing ≥5 file paths or 3+ domains (frontend, backend, database, …) | `[TIER:3]` |
| Effort auto-apply | Send a Tier 1 prompt | `[EFFORT:xhigh] (global override active)` — remove `effortLevel` from `settings.json` to let router set `low`/`medium`/`high` into `settings.local.json` |
| Auto-recall (prompt) | `echo '{"prompt":"chiaki wake","cwd":"'"$HOME"'"}' \| node ~/.claude/hooks/auto-memory-recall.cjs` | JSON with `additionalContext` referencing chiaki memory |
| Auto-recall (task) | `echo '{"tool_name":"Task","tool_input":{"prompt":"chiaki wake"},"cwd":"'"$HOME"'","session_id":"test"}' \| node ~/.claude/hooks/auto-memory-recall.cjs` | Same, with `hookEventName: "PreToolUse"` |
| Debt scanner | Add `// TODO: foo` to a test file in a git project | New row in project `DEBT.md` |
| Progress checkpoint | Make 10 edits in a project | New `### <ts> — checkpoint` row in `PROGRESS.md` |
| Self-heal | Run a failing Bash command | `additionalContext` with `Stage: retry 1/2` + category hint |
| Destructive gate | `git reset --hard origin/main` via Bash tool | `[BLOCKED] Destructive command detected: git reset --hard`, exit 1 |
| Quality gate (critical) | Write a `.py` file containing `api_key = "sk-live-abcdefghijklmnop1234567890"` | `[CRITICAL] OpenAI-style API key detected`, exit 2 |
| Quality gate (placeholder) | Same file with `api_key = "PASTE_YOUR_KEY_HERE"` | advisory only, exit 0 |
| Telegram bridge | `echo '{"event":"session_end","title":"Test","body":"ok"}' \| node ~/.claude/hooks/telegram-bridge.cjs` | Message arrives in chat (or silent no-op if `telegram.json` still placeholder) |

## Recent history

| Commit | Date | Summary |
|--------|------|---------|
| `5b8ac17` | 2026-04-23 | Strip persona labels (JARVIS/IRIS), remove GSD workflow + 11 archived gsd-* agents + `hivemind.md`; rename `iris-context-monitor.cjs` → `context-monitor.cjs` |
| `432d030` | 2026-04-23 | Close 10 global Claude Code setup gaps: team auto-dispatch (router + hook output), Telegram outbound + self-heal escalate pipe, effort auto-apply, destructive gate, claude-mem disable, mid-task recall, mid-session progress checkpoint, quality-gate critical block, team `_STYLE.md` + `_lint.js`, changelog/progress/docs templates |
| `bbfc010` | 2026-04-23 | Merge lightning-upgrade PR |
| `8af5cd6` | 2026-04-23 | Replace `python-design-patterns` with `refactoring-mastery` skill |
| `8ca0c0d` | 2026-04-23 | Lightning upgrade: auto-recall, debt/progress trackers, self-heal, effort mapping |
