# claude-flow / ruv-swarm purge — 2026-04-27

Quarantine of all claude-flow / ruv-swarm ("ruflo") artifacts removed from
`~/.claude/`. Restore from this directory if anything regresses; otherwise
delete after one or two clean sessions.

## What moved here

### `claude-flow-runtime/`
- `~/.claude/.claude-flow/` — entire runtime data dir (metrics, agentdb, sessions, memory, security, adrs).

### `agents-archived/`
- `~/.claude/agents/.archived/` — full claude-flow agent taxonomy (analysis, architecture, consensus, core, custom, data, development, devops, documentation, dual-mode, flow-nexus, github, goal, hive-mind, optimization, payments, sona, sparc, specialized, sublinear, swarm, templates, testing, v3).
- User's curated active agents at `~/.claude/agents/*.md` left untouched (analyst, architect, challenger, explorer, implementer, qa, reviewer, security-reviewer, strategist).

### `skills/` (28 skills)
- `sparc-methodology` — SPARC orchestrator
- `swarm-orchestration`, `swarm-advanced` — claude-flow swarms
- `hooks-automation` — claude-flow hooks
- `pair-programming` — claude-flow truth-score driven
- `verification-quality` — claude-flow truth scoring
- `stream-chain` — claude-flow stream-JSON pipelines
- `agentdb-advanced`, `agentdb-learning`, `agentdb-memory-patterns`, `agentdb-optimization`, `agentdb-vector-search` — AgentDB (claude-flow vector backend)
- `reasoningbank-agentdb`, `reasoningbank-intelligence` — claude-flow learning
- `v3-cli-modernization`, `v3-core-implementation`, `v3-ddd-architecture`, `v3-integration-deep`, `v3-mcp-optimization`, `v3-memory-unification`, `v3-performance-optimization`, `v3-security-overhaul`, `v3-swarm-coordination` — claude-flow v3
- `github-code-review`, `github-multi-repo`, `github-project-management`, `github-release-management`, `github-workflow-automation` — author "Claude Code Flow"; `github-code-review/SKILL.md` declared `requires: ruv-swarm, claude-flow`

Kept in `~/.claude/skills/`: django-fullstack, generate-image, markitdown, omarchy, perplexity-search, pixijs, python-design-patterns.bak, refactoring-mastery, research-lookup, skill-builder.

### `commands/`
- `claude-flow-help.md`, `claude-flow-memory.md`, `claude-flow-swarm.md`
- `sparc/` — 40+ SPARC command files
- `automation/`, `analysis/`, `optimization/`, `monitoring/`, `hooks/`, `github/`

Kept in `~/.claude/commands/`: `session-summary.md`.

### `helpers/`
- `intelligence.cjs` — hard-codes `.claude-flow/data`, `.claude-flow/sessions`, `.claude-flow/memory`. Not wired in.
- `memory.cjs` — hard-codes `.claude-flow/data`. Not wired in.
- `session.cjs` — stores sessions under `~/.claude-flow/sessions`. Not wired in.
- `auto-memory-hook.mjs` — `import('@claude-flow/memory')`, reads `.claude-flow/config.yaml`. Was wired into `SessionStart` and `Stop` hooks but failing silently.

### Files modified in place (originals preserved here)
- `statusline.cjs.original` — pre-edit copy of `~/.claude/helpers/statusline.cjs` (641 lines, V3 progress / security audit / swarm activity / v3 progress / learning / ADR compliance / agentdb-HNSW renderers). Replaced with a generic 200-line version that keeps git/branch/model/context-window/session-duration only.
- `settings.json.pre-purge` — pre-edit copy of `~/.claude/settings.json`. Two `auto-memory-hook.mjs` hook entries removed:
  - `SessionStart` → `node ~/.claude/helpers/auto-memory-hook.mjs import` removed (the surviving `hook-handler.cjs session-restore` entry remains).
  - `Stop` → `node ~/.claude/helpers/auto-memory-hook.mjs sync` removed (the surviving `progress-tracker.cjs` and `stop-telegram.cjs` entries remain).
  - Plan suggested swapping to `auto-memory-bridge.mjs import|sync`, but that file is a class library with no CLI dispatch — entries dropped per plan fallback. Auto-memory recall still runs via `hooks/auto-memory-recall.cjs` on every prompt (independent and clean).

## Untouched (verified clean)
- `~/.claude/CLAUDE.md`, `~/.claude/README.md`, `~/.claude/rules/*.md`
- `~/.claude/teams/*.md`, `~/.claude/templates/*`
- `~/.claude/hooks/*.cjs` (auto-memory-recall, context-monitor, debt-scanner, iris-statusline, progress-tracker, self-heal, stop-telegram, telegram-bridge)
- `~/.claude/scripts/*.sh`
- `~/.claude/plugins/`, top-level `~/.claude/agents/*.md`, `~/.claude/projects/`, `~/.claude/sessions/`, `~/.claude/tasks/`, `~/.claude/backups/`, `~/.claude/trackers/`
- `~/.claude/helpers/hook-handler.cjs`, `~/.claude/helpers/quality-gate.cjs`, `~/.claude/helpers/auto-memory-bridge.mjs`, `~/.claude/helpers/router.cjs`, `~/.claude/helpers/setup-integrations.sh`
- `~/.claude/history.jsonl` — chat-log mentions only

## Restore

```bash
BIN=~/.claude/_bin/claude-flow-purge-2026-04-27
mv "$BIN/claude-flow-runtime/.claude-flow"  ~/.claude/
mv "$BIN/agents-archived/.archived"         ~/.claude/agents/
mv "$BIN/skills/"*                          ~/.claude/skills/
mv "$BIN/commands/"*                        ~/.claude/commands/
mv "$BIN/helpers/"*                         ~/.claude/helpers/
cp  "$BIN/statusline.cjs.original"          ~/.claude/helpers/statusline.cjs
cp  "$BIN/settings.json.pre-purge"          ~/.claude/settings.json
```

## Final delete (after verifying)

```bash
rm -rf ~/.claude/_bin/claude-flow-purge-2026-04-27/
```
