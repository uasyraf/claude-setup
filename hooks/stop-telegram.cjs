#!/usr/bin/env node
/**
 * Stop hook — pipes a session_end summary to telegram-bridge.cjs.
 *
 * Reads the transcript (best-effort), extracts files touched + commits + tier,
 * and sends a compact notification. Silently no-ops if Telegram not configured.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const BRIDGE = path.join(os.homedir(), '.claude', 'hooks', 'telegram-bridge.cjs');

function readStdin() {
  try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function readTranscript(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return raw.split('\n').filter(Boolean).slice(-2000).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

function extractFiles(entries) {
  const files = new Set();
  for (const e of entries) {
    const c = e?.message?.content;
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

function readCurrentTier() {
  try {
    const p = path.join(os.tmpdir(), 'claude-tier-current.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (Date.now() - data.ts < 30 * 60 * 1000) return data.tier;
  } catch { /* */ }
  return null;
}

function recentCommits(cwd) {
  try {
    if (!fs.existsSync(path.join(cwd, '.git'))) return [];
    const out = execSync(`git -C "${cwd}" log --since="1 hour ago" --oneline --no-color`, {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().split('\n').filter(Boolean).slice(0, 5);
  } catch { return []; }
}

function main() {
  if (!fs.existsSync(BRIDGE)) return;

  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }

  const cwd = payload.cwd || process.cwd();
  const entries = payload.transcript_path ? readTranscript(payload.transcript_path) : [];
  const files = extractFiles(entries);
  const commits = recentCommits(cwd);
  const tier = readCurrentTier();

  if (files.length === 0 && commits.length === 0 && !tier) return;

  const host = os.hostname();
  const titleParts = [];
  if (tier) titleParts.push(`Tier ${tier}`);
  titleParts.push(`${files.length} files, ${commits.length} commits`);
  const title = `Session on ${host} — ${titleParts.join(' · ')}`;

  const bodyLines = [];
  if (files.length > 0) {
    bodyLines.push('*Files:*');
    for (const f of files.slice(0, 6)) bodyLines.push(`- \`${f.replace(os.homedir(), '~')}\``);
    if (files.length > 6) bodyLines.push(`_…and ${files.length - 6} more_`);
  }
  if (commits.length > 0) {
    if (bodyLines.length) bodyLines.push('');
    bodyLines.push('*Commits:*');
    for (const c of commits) bodyLines.push(`- \`${c}\``);
  }

  try {
    const tg = spawn('node', [BRIDGE], { stdio: ['pipe', 'ignore', 'ignore'], detached: true });
    tg.stdin.write(JSON.stringify({
      event: 'session_end',
      title,
      body: bodyLines.join('\n'),
    }));
    tg.stdin.end();
    tg.unref();
  } catch { /* non-fatal */ }
}

try { main(); } catch { /* never throw */ }
