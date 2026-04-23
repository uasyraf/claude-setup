#!/usr/bin/env node
/**
 * Tech Debt Scanner Hook (PostToolUse on Write|Edit|MultiEdit)
 *
 * Scans file writes/edits for debt markers and appends entries to
 * <project>/DEBT.md. Runs silently — never blocks the edit.
 *
 * Markers detected (case-insensitive):
 *   TODO: / FIXME: / HACK: / XXX: / DEBT: / TECHDEBT: / KLUDGE:
 *
 * Entry format (one row per marker):
 *   | YYYY-MM-DD | SEVERITY | file:line | MARKER | message |
 *
 * Severity heuristic:
 *   HIGH   — HACK, KLUDGE, XXX, TECHDEBT
 *   MEDIUM — FIXME, DEBT
 *   LOW    — TODO
 *
 * Dedup: skips markers already recorded with same file+line+marker+message.
 */

const fs = require('fs');
const path = require('path');

const MARKER_RE = /\b(TODO|FIXME|HACK|XXX|DEBT|TECHDEBT|KLUDGE)\s*[:\-]?\s*(.*)$/i;
const SEVERITY = {
  HACK: 'HIGH', KLUDGE: 'HIGH', XXX: 'HIGH', TECHDEBT: 'HIGH',
  FIXME: 'MEDIUM', DEBT: 'MEDIUM',
  TODO: 'LOW',
};

function readStdin() {
  try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function extractContent(payload) {
  const t = payload.tool_input || {};
  if (typeof t.content === 'string') return { text: t.content, file: t.file_path };
  if (typeof t.new_string === 'string') return { text: t.new_string, file: t.file_path };
  if (Array.isArray(t.edits)) {
    return {
      text: t.edits.map(e => e.new_string || '').join('\n'),
      file: t.file_path,
    };
  }
  return { text: '', file: t.file_path };
}

function scanMarkers(text, filePath) {
  const hits = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER_RE);
    if (!m) continue;
    const marker = m[1].toUpperCase();
    const message = (m[2] || '').trim().replace(/\*\/\s*$/, '').trim() || '(no message)';
    hits.push({
      marker,
      severity: SEVERITY[marker] || 'LOW',
      file: filePath,
      line: i + 1,
      message: message.slice(0, 180),
    });
  }
  return hits;
}

const SENTINEL = '<!-- AUTO-DEBT-END -->';

function ensureDebtFile(projectRoot) {
  const p = path.join(projectRoot, 'DEBT.md');
  if (!fs.existsSync(p)) {
    const header = [
      '# Technical Debt',
      '',
      '_Auto-maintained by `~/.claude/hooks/debt-scanner.cjs`. Rows above the sentinel are machine-written; do not hand-edit._',
      '',
      '| Date | Severity | Location | Marker | Message |',
      '|------|----------|----------|--------|---------|',
      SENTINEL,
      '',
      '## Notes',
      '',
      '_Add analysis, context, or resolution plans below this line._',
      '',
    ].join('\n');
    fs.writeFileSync(p, header);
  }
  return p;
}

function isRecorded(debtPath, file, line, marker, message) {
  try {
    const content = fs.readFileSync(debtPath, 'utf-8');
    const needle = `${file}:${line}`;
    return content.includes(needle) && content.includes(marker) && content.includes(message);
  } catch { return false; }
}

function appendEntry(debtPath, entry) {
  const content = fs.readFileSync(debtPath, 'utf-8');
  const idx = content.indexOf(SENTINEL);
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${entry.severity} | ${entry.file}:${entry.line} | ${entry.marker} | ${entry.message.replace(/\|/g, '\\|')} |\n`;
  if (idx === -1) {
    fs.appendFileSync(debtPath, row);
  } else {
    const before = content.slice(0, idx);
    const after = content.slice(idx);
    fs.writeFileSync(debtPath, before + row + after);
  }
}

function findProjectRoot(filePath, cwd) {
  if (!filePath) return cwd || process.cwd();
  let dir = path.dirname(filePath);
  const root = path.parse(dir).root;
  while (dir && dir !== root) {
    if (fs.existsSync(path.join(dir, '.git')) ||
        fs.existsSync(path.join(dir, 'package.json')) ||
        fs.existsSync(path.join(dir, 'pyproject.toml')) ||
        fs.existsSync(path.join(dir, 'Cargo.toml')) ||
        fs.existsSync(path.join(dir, 'go.mod'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return cwd || process.cwd();
}

function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }

  const toolName = payload.tool_name;
  if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) return;

  const { text, file } = extractContent(payload);
  if (!text || !file) return;

  // Skip scanning DEBT.md itself to avoid recursion
  if (path.basename(file) === 'DEBT.md') return;

  // Skip ~/.claude/ tree — that's global config, not a user project
  const claudeHome = path.join(require('os').homedir(), '.claude');
  if (file.startsWith(claudeHome + path.sep) || file === claudeHome) return;

  const hits = scanMarkers(text, file);
  if (hits.length === 0) return;

  const projectRoot = findProjectRoot(file, payload.cwd);
  const debtPath = ensureDebtFile(projectRoot);

  let added = 0;
  for (const h of hits) {
    if (isRecorded(debtPath, h.file, h.line, h.marker, h.message)) continue;
    appendEntry(debtPath, h);
    added++;
  }

  if (added > 0) {
    // Silent: write to stderr so user sees it but doesn't block the model
    process.stderr.write(`[debt-scanner] recorded ${added} marker(s) in ${path.relative(projectRoot, debtPath)}\n`);
  }
}

try { main(); } catch { /* never throw */ }
