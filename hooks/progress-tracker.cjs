#!/usr/bin/env node
/**
 * Progress Tracker Hook (Stop)
 *
 * On session end, extracts completed work signals from the transcript and
 * appends a dated entry to <project>/PROGRESS.md.
 *
 * Signals (best-effort, in order):
 *   1. TaskUpdate(status=completed) — explicit task completion
 *   2. Git commits since last PROGRESS.md entry
 *   3. Files modified in session (from Write/Edit/MultiEdit tool uses)
 *
 * Output contract: exit 0 always. Writes to PROGRESS.md silently.
 * Keeps last 100 entries; rotates older into PROGRESS-archive.md.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MAX_LIVE_ENTRIES = 100;
const SENTINEL = '<!-- AUTO-PROGRESS-END -->';

function readStdin() {
  try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function safeJSONLinesRead(file, maxLines = 5000) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const lines = raw.split('\n').filter(Boolean);
    const slice = lines.slice(-maxLines);
    return slice.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function extractCompletedTasks(transcript) {
  const completed = [];
  for (const entry of transcript) {
    const tools = [];
    if (entry?.message?.content) {
      const c = entry.message.content;
      if (Array.isArray(c)) {
        for (const item of c) {
          if (item?.type === 'tool_use' && item.name === 'TaskUpdate' && item.input?.status === 'completed') {
            tools.push({ id: item.input.taskId, subject: item.input.subject });
          }
          if (item?.type === 'tool_use' && item.name === 'TaskCreate') {
            tools.push({ create: true, subject: item.input?.subject });
          }
        }
      }
    }
    for (const t of tools) completed.push(t);
  }
  // Map created→completed: completed entries need the subject if not inline
  const createdById = {};
  for (const t of completed) {
    if (t.create && t.subject) createdById[t.subject] = true;
  }
  const finished = completed.filter(t => !t.create && t.subject);
  // Dedup by subject
  const seen = new Set();
  return finished.filter(t => {
    if (seen.has(t.subject)) return false;
    seen.add(t.subject);
    return true;
  });
}

function extractModifiedFiles(transcript) {
  const files = new Set();
  for (const entry of transcript) {
    const c = entry?.message?.content;
    if (!Array.isArray(c)) continue;
    for (const item of c) {
      if (item?.type === 'tool_use' && /^(Write|Edit|MultiEdit)$/.test(item.name || '')) {
        const fp = item.input?.file_path;
        if (fp) files.add(fp);
      }
    }
  }
  return [...files];
}

function getRecentCommits(cwd, since) {
  try {
    if (!fs.existsSync(path.join(cwd, '.git'))) return [];
    const arg = since ? `--since="${since}"` : '-n 10';
    const out = execSync(`git -C "${cwd}" log ${arg} --oneline --no-color`, {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().split('\n').filter(Boolean).slice(0, 20);
  } catch { return []; }
}

function ensureProgressFile(projectRoot) {
  const p = path.join(projectRoot, 'PROGRESS.md');
  if (!fs.existsSync(p)) {
    const header = [
      '# Progress',
      '',
      '_Auto-maintained by `~/.claude/hooks/progress-tracker.cjs`. Rows above the sentinel are machine-written._',
      '',
      SENTINEL,
      '',
      '## Manual notes',
      '',
      '_Add long-form updates below._',
      '',
    ].join('\n');
    fs.writeFileSync(p, header);
  }
  return p;
}

function getLastEntryTime(progressPath) {
  try {
    const content = fs.readFileSync(progressPath, 'utf-8');
    const m = content.match(/### (\d{4}-\d{2}-\d{2}T[\d:]+(?:\.\d+)?Z?)/);
    return m ? m[1] : null;
  } catch { return null; }
}

function rotateIfNeeded(progressPath) {
  try {
    const content = fs.readFileSync(progressPath, 'utf-8');
    const entries = content.match(/^### \d{4}-\d{2}/gm) || [];
    if (entries.length <= MAX_LIVE_ENTRIES) return;
    // Move the oldest half into archive
    const archive = path.join(path.dirname(progressPath), 'PROGRESS-archive.md');
    const halfIdx = Math.floor(entries.length / 2);
    const idx = content.indexOf(entries[halfIdx]);
    if (idx === -1) return;
    const keep = content.slice(0, idx);
    const move = content.slice(idx);
    const archiveHeader = fs.existsSync(archive) ? '' : '# Progress Archive\n\n';
    fs.appendFileSync(archive, archiveHeader + move + '\n');
    fs.writeFileSync(progressPath, keep + SENTINEL + '\n\n## Manual notes\n\n_Add long-form updates below._\n');
  } catch { /* */ }
}

function writeEntry(progressPath, block) {
  const content = fs.readFileSync(progressPath, 'utf-8');
  const idx = content.indexOf(SENTINEL);
  if (idx === -1) {
    fs.appendFileSync(progressPath, '\n' + block);
    return;
  }
  const before = content.slice(0, idx);
  const after = content.slice(idx);
  fs.writeFileSync(progressPath, before + block + '\n' + after);
}

function findProjectRoot(cwd) {
  let dir = cwd || process.cwd();
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

  const cwd = payload.cwd || process.cwd();
  const projectRoot = findProjectRoot(cwd);

  // Don't create PROGRESS.md in $HOME or under ~/.claude — only in real projects
  if (projectRoot === require('os').homedir()) return;
  if (projectRoot.startsWith(path.join(require('os').homedir(), '.claude'))) return;

  const transcript = payload.transcript_path ? safeJSONLinesRead(payload.transcript_path) : [];

  const completed = extractCompletedTasks(transcript);
  const files = extractModifiedFiles(transcript);
  const commits = getRecentCommits(cwd, '1 hour ago');

  // If nothing happened this session, skip
  if (completed.length === 0 && files.length === 0 && commits.length === 0) return;

  const progressPath = ensureProgressFile(projectRoot);
  const ts = new Date().toISOString();
  const session = (payload.session_id || 'unknown').slice(0, 12);

  const lines = [`### ${ts}`, `_session: \`${session}\`_`, ''];

  if (completed.length > 0) {
    lines.push('**Completed tasks:**');
    for (const t of completed.slice(0, 10)) lines.push(`- ${t.subject}`);
    lines.push('');
  }

  if (commits.length > 0) {
    lines.push('**Commits:**');
    for (const c of commits.slice(0, 10)) lines.push(`- \`${c}\``);
    lines.push('');
  }

  if (files.length > 0) {
    const rel = files.slice(0, 8).map(f => path.relative(projectRoot, f)).filter(Boolean);
    if (rel.length > 0) {
      lines.push('**Files touched:**');
      for (const f of rel) lines.push(`- \`${f}\``);
      if (files.length > rel.length) lines.push(`- _…and ${files.length - rel.length} more_`);
      lines.push('');
    }
  }

  writeEntry(progressPath, lines.join('\n'));
  rotateIfNeeded(progressPath);
}

try { main(); } catch { /* never throw */ }
