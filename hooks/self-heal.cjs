#!/usr/bin/env node
/**
 * Self-Heal Hook (PostToolUse on Bash)
 *
 * Classifies tool failures against a 7-category error taxonomy and emits
 * structured diagnostic context so the LLM can retry intelligently.
 *
 * This does NOT auto-re-invoke the tool (hooks can't). It provides the model
 * with enough structured context that its next turn performs the retry or
 * adapt step. Effective cascade:
 *
 *   failure #1 → hook emits diagnosis → LLM retries with fix
 *   failure #2 → hook emits diagnosis + "try adapt" hint → LLM changes approach
 *   failure #3 → hook emits "escalate to user" → LLM stops and reports
 *
 * Retry state is persisted per-session at /tmp/claude-self-heal-<session>.json
 *
 * Output contract: if non-zero exit, emit additionalContext via stdout JSON.
 * Exit code always 0 — never block.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_RETRIES = 2;
const DIAGNOSE_CYCLES = 1;

const TAXONOMY = [
  {
    id: 'missing_binary',
    match: /command not found|not found in \$PATH|is not recognized/i,
    hint: 'Binary not on PATH. Options: (1) install via package manager, (2) use `which` or `npm/pip list` to locate, (3) invoke via full path or package manager runner (npx/bun x).',
  },
  {
    id: 'perms',
    match: /permission denied|EACCES|operation not permitted/i,
    hint: 'Permission denied. Options: (1) `chmod +x` if script, (2) check file ownership with `ls -l`, (3) run with sudo only if user authorized it, (4) write to writable path instead.',
  },
  {
    id: 'missing_path',
    match: /no such file or directory|ENOENT|cannot find path|does not exist/i,
    hint: 'Path does not exist. Options: (1) use `Glob` to find correct path, (2) `mkdir -p` if creating output dir, (3) check for typo or wrong working directory.',
  },
  {
    id: 'missing_dep',
    match: /module not found|cannot find module|ModuleNotFoundError|ImportError|package .* not found/i,
    hint: 'Module/package missing. Options: (1) check package.json/pyproject.toml for declaration, (2) run install (npm/pip/bun/cargo install), (3) verify virtualenv activated, (4) check import path/name.',
  },
  {
    id: 'syntax',
    match: /syntax error|unexpected token|parse error|invalid syntax/i,
    hint: 'Syntax error. Options: (1) re-read the file around the reported line, (2) check for missing brackets/quotes/commas, (3) run the language linter, (4) validate JSON/YAML with native parser.',
  },
  {
    id: 'network',
    match: /connection refused|ECONNREFUSED|timeout|ETIMEDOUT|could not resolve host|DNS/i,
    hint: 'Network failure. Options: (1) verify service is running (`systemctl status`, port check), (2) check URL/port/host, (3) retry once (transient), (4) confirm network reachable.',
  },
  {
    id: 'generic',
    match: /./,
    hint: 'Unclassified error. Re-read the full error output, check exit code, and identify the failing step. If unclear after one attempt, adapt approach.',
  },
];

function readStdin() {
  try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function getSessionStatePath(sessionId) {
  const safe = String(sessionId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return path.join(os.tmpdir(), `claude-self-heal-${safe}.json`);
}

function loadState(sessionId) {
  const p = getSessionStatePath(sessionId);
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { /* */ }
  return { failures: 0, lastCategory: null, history: [] };
}

function saveState(sessionId, state) {
  const p = getSessionStatePath(sessionId);
  try { fs.writeFileSync(p, JSON.stringify(state)); } catch { /* */ }
}

function classify(errorText) {
  for (const cat of TAXONOMY) {
    if (cat.match.test(errorText)) return cat;
  }
  return TAXONOMY[TAXONOMY.length - 1];
}

function extractError(payload) {
  const r = payload.tool_response || {};
  // tool_response shape varies — collect anything that could hold error output
  const parts = [];
  if (typeof r.stderr === 'string') parts.push(r.stderr);
  if (typeof r.output === 'string') parts.push(r.output);
  if (typeof r.error === 'string') parts.push(r.error);
  if (typeof r.interrupted === 'boolean' && r.interrupted) parts.push('interrupted');
  return parts.join('\n').slice(0, 3000);
}

function hasFailed(payload) {
  const r = payload.tool_response || {};
  if (typeof r.exit_code === 'number' && r.exit_code !== 0) return true;
  if (r.is_error === true) return true;
  if (typeof r.stderr === 'string' && /error|failed|fatal/i.test(r.stderr) && !r.stdout) return true;
  return false;
}

function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }

  if (payload.tool_name !== 'Bash') return;
  if (!hasFailed(payload)) {
    // Reset counter on success
    const state = loadState(payload.session_id);
    if (state.failures > 0) {
      state.failures = 0;
      state.lastCategory = null;
      saveState(payload.session_id, state);
    }
    return;
  }

  const errorText = extractError(payload);
  const category = classify(errorText);
  const state = loadState(payload.session_id);

  state.failures = (state.lastCategory === category.id) ? state.failures + 1 : 1;
  state.lastCategory = category.id;
  state.history = (state.history || []).slice(-4);
  state.history.push({ t: Date.now(), cat: category.id, cmd: (payload.tool_input && payload.tool_input.command || '').slice(0, 120) });
  saveState(payload.session_id, state);

  let stage, directive;
  if (state.failures <= MAX_RETRIES) {
    stage = `retry ${state.failures}/${MAX_RETRIES}`;
    directive = 'Apply the suggested fix and retry.';
  } else if (state.failures <= MAX_RETRIES + DIAGNOSE_CYCLES) {
    stage = `diagnose-adapt`;
    directive = 'Same category failed 3+ times. Stop retrying same approach. Investigate root cause, then try a different approach.';
  } else {
    stage = `escalate`;
    directive = 'Cascade exhausted. Report the failure to the user with what was tried and why it keeps failing. Do not retry.';
  }

  const out = [
    '## Self-heal diagnostic',
    `- **Stage:** ${stage}`,
    `- **Category:** ${category.id}`,
    `- **Hint:** ${category.hint}`,
    `- **Directive:** ${directive}`,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: out,
    }
  }));
}

try { main(); } catch { /* never throw */ }
