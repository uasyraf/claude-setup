# Claude Code Setup — Operating Manual

This directory is the **global** Claude Code configuration — reusable machinery that applies to every project. Business/domain context lives in each project's own `CLAUDE.md`.

## Quick map

| Path | What lives here |
|------|-----------------|
| `CLAUDE.md` | Operating system: identity, Tier 1/2/3 router, prohibitions, autonomy rules, on-every-task loop |
| `settings.json` | Hooks, permissions, `defaultMode=auto`, `effortLevel`, enabled plugins, marketplaces |
| `rules/` | Per-language standards + cross-cutting rules (13 files) |
| `agents/` | Role-based agents (analyst, architect, coder, explorer, implementer, qa, reviewer, security-reviewer, strategist, challenger) |
| `teams/` | Team templates — triggers, leads, members (10 teams) |
| `skills/` | Process + domain skills (37 files — sparc, superpowers, refactoring-mastery, etc) |
| `commands/` | Slash commands |
| `hooks/` | Event hooks (see table below) |
| `helpers/` | Shared helper libraries for hooks |
| `templates/` | ADR template, project `CLAUDE.md` skeleton, telegram config example |
| `trackers/` | Schema docs for `DEBT.md` and `PROGRESS.md` |
| `scripts/` | One-shot helper scripts (project migration, etc) |
| `projects/<slug>/memory/` | Per-project auto-memory (claude-mem) |
| `plugins/` | Installed plugin manifests |
| `backups/` | Timestamped backups (from migration scripts) |

## Hooks (active event loop)

| Event | Hook | Purpose |
|-------|------|---------|
| `PreToolUse` (Bash) | `helpers/hook-handler.cjs pre-bash` | Policy / safety checks |
| `PostToolUse` (Write/Edit/MultiEdit) | `helpers/hook-handler.cjs post-edit` | Existing post-edit logic |
| `PostToolUse` (Write/Edit/MultiEdit) | `helpers/quality-gate.cjs` | Code quality gate |
| `PostToolUse` (Write/Edit/MultiEdit) | `hooks/debt-scanner.cjs` | Append `TODO`/`FIXME`/`HACK`/`DEBT` markers to `<project>/DEBT.md` |
| `PostToolUse` (Bash) | `hooks/self-heal.cjs` | Classify failures, emit diagnostic + retry directive |
| `PostToolUse` (*) | `hooks/context-monitor.cjs` | Context window monitoring |
| `UserPromptSubmit` | `helpers/hook-handler.cjs route` | Tier routing + agent suggestion |
| `UserPromptSubmit` | `hooks/auto-memory-recall.cjs` | Grep memory stores for prompt keywords, inject top hits |
| `SessionStart` | `helpers/hook-handler.cjs session-restore` + `helpers/auto-memory-hook.mjs import` | Restore session + import claude-mem entries |
| `Stop` | `helpers/auto-memory-hook.mjs sync` + `hooks/progress-tracker.cjs` | Sync memory + append milestones to `<project>/PROGRESS.md` |
| `PreCompact` | `helpers/hook-handler.cjs compact-(manual\|auto)` | Pre-compaction prep |

## Plan-to-capability map

| Pain | Capability | Implementation |
|------|-----------|----------------|
| P1 — Telegram boss-mode | Outbound notifications | `hooks/telegram-bridge.cjs` — no-ops without `~/.claude/telegram.json`. See "Enabling Telegram" below. |
| P2 — Rich persistent memory | claude-mem v10.5.5 | Plugin installed, ChromaDB-backed, MCP tools exposed |
| P3 — Auto memory recall | Per-prompt keyword match | `hooks/auto-memory-recall.cjs` — greps `~/.claude/projects/<slug>/memory/*.md`, `CLAUDE.md`, `PROGRESS.md`, `DEBT.md` |
| P4 — Parallel execution | Tier 3 explorer/implementer parallelism | Already in `CLAUDE.md` + `rules/agent-dispatch.md` |
| P5 — Effort auto-mode | Tier→effort mapping | `rules/effort-mapping.md` |
| P6 — Agent specialists | 184 agents via wshobson | 4 focused plugins installed (`comprehensive-review`, `debugging-toolkit`, `agent-orchestration`, `backend-development`) — add more from `claude-code-workflows` marketplace as needed |
| P7 — ADR doc standard | Markdown ADR template | `templates/adr/template.md` |
| P8 — Progress tracker | Native todo API + Stop hook | `hooks/progress-tracker.cjs` + `trackers/progress-schema.md` |
| P9 — Tech debt tracker | Comment-scan pattern | `hooks/debt-scanner.cjs` + `trackers/debt-schema.md` |
| P10 — Self-healing | 7-category taxonomy + cascade | `hooks/self-heal.cjs` |
| P11 — Autonomy | Auto Mode | `defaultMode: auto` in `settings.json` |
| P12 — Intelligent activation | Tier router + team min_complexity | `CLAUDE.md` + `rules/agent-dispatch.md` |
| P13 — Code quality gate | Per-language rules + PostToolUse hook | `rules/*.md` + `helpers/quality-gate.cjs` |

## Tiered complexity routing (summary)

| Files changed | Tier | Effort | Agents |
|---------------|------|--------|--------|
| 1 | 1 | `low` | 0 |
| 2-4 | 2 | `medium` | 0 default, up to 3 if team triggers |
| 5+ or 2+ domains | 3 | `high` | Up to 5 total, 3 concurrent |

`xhigh` effort is opt-in via `/effort xhigh` for hardest reasoning tasks.

## Installed plugins (as of 2026-04-23)

| Plugin | Source | Role |
|--------|--------|------|
| claude-mem@thedotmack | marketplace | Persistent memory (ChromaDB + MCP) |
| superpowers@superpowers-dev | marketplace | Brainstorm/plan/execute meta-skills |
| document-skills / example-skills | anthropic-agent-skills | Anthropic official skills |
| claude-api | anthropic-agent-skills | Claude API helpers |
| obsidian | obsidian-skills | Obsidian vault integration |
| ui-ux-pro-max | ui-ux-pro-max-skill | UI/UX intelligence |
| clangd-lsp | claude-plugins-official | C/C++ LSP |
| comprehensive-review | claude-code-workflows | architect-review, code-reviewer, security-auditor |
| debugging-toolkit | claude-code-workflows | debugger, dx-optimizer |
| agent-orchestration | claude-code-workflows | context-manager |
| backend-development | claude-code-workflows | backend-architect, performance-engineer, tdd-orchestrator, test-automator, event-sourcing-architect, graphql-architect, temporal-python-pro |

Additional specialists available from `claude-code-workflows` marketplace (78 plugins total). Install with `claude plugin install <name>@claude-code-workflows`.

## Enabling Telegram

The bridge at `hooks/telegram-bridge.cjs` is installed but inactive. Two activation paths:

### Path A — Anthropic Channels (native, requires Max/Team/Enterprise)
1. Verify your plan supports Channels at [code.claude.com/docs/en/channels](https://code.claude.com/docs/en/channels)
2. Enable Telegram Channel in your account settings
3. Copy `templates/telegram-config-example.json` to `~/.claude/telegram.json`, set `channels_api: true`

### Path B — Community bot (works on any plan)
1. Create bot via [@BotFather](https://t.me/BotFather), grab token
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Copy `templates/telegram-config-example.json` to `~/.claude/telegram.json`, fill in `bot_token` + `chat_id`
4. (Optional) Wire the bridge into `Stop` / `PostToolUse` hooks via `settings.json` to enable auto-notifications

Test: `echo '{"event":"session_end","title":"Hello","body":"bridge working"}' | node ~/.claude/hooks/telegram-bridge.cjs`

## Project CLAUDE.md migration

Use `scripts/migrate-project-claude.sh` to review candidates without mutating:

```bash
bash ~/.claude/scripts/migrate-project-claude.sh /path/to/project        # dry-run
bash ~/.claude/scripts/migrate-project-claude.sh -y /path/to/project     # apply (keeps backup)
```

The script diff-flags lines that look like global concerns (tier/agent/language rules) so you can prune them safely. Backups land in `~/.claude/backups/project-claude-YYYYMMDD/`.

## Verification checklist

| Test | Command | Expect |
|------|---------|--------|
| Hooks parse | `node -e "JSON.parse(require('fs').readFileSync('$HOME/.claude/settings.json','utf-8'))"` | Prints nothing, exits 0 |
| Auto-memory recall | `echo '{"prompt":"chiaki wake","cwd":"$HOME"}' \| node ~/.claude/hooks/auto-memory-recall.cjs` | JSON with `additionalContext` including chiaki memory |
| Debt scanner | Edit a test file with `// TODO: foo` | `DEBT.md` in that project gets a new row |
| Self-heal | Run a failing Bash command | Diagnostic emitted to stderr context |
| Progress tracker | Complete a multi-step task | `PROGRESS.md` updated at session end |
| Effort routing | `/effort xhigh` | Deeper reasoning on next turn |
