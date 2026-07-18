#!/usr/bin/env node
/**
 * Claude Code Statusline — generic git/branch/model/context renderer.
 *
 * Usage: node statusline.cjs [--json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const CWD = process.cwd();

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[0;33m',
  blue: '\x1b[0;34m',
  purple: '\x1b[0;35m',
  cyan: '\x1b[0;36m',
  brightRed: '\x1b[1;31m',
  brightGreen: '\x1b[1;32m',
  brightYellow: '\x1b[1;33m',
  brightBlue: '\x1b[1;34m',
  brightCyan: '\x1b[1;36m',
};

function safeExec(cmd, timeoutMs = 2000) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { /* ignore */ }
  return null;
}

let _settingsCache;
function getSettings() {
  if (_settingsCache !== undefined) return _settingsCache;
  _settingsCache = readJSON(path.join(CWD, '.claude', 'settings.json'))
                || readJSON(path.join(CWD, '.claude', 'settings.local.json'))
                || null;
  return _settingsCache;
}

function getGitInfo() {
  const result = { name: 'user', gitBranch: '', modified: 0, untracked: 0, staged: 0, ahead: 0, behind: 0 };
  const script = [
    'git config user.name 2>/dev/null || echo user',
    'echo "---SEP---"',
    'git branch --show-current 2>/dev/null',
    'echo "---SEP---"',
    'git status --porcelain 2>/dev/null',
    'echo "---SEP---"',
    'git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo "0 0"',
  ].join('; ');

  const raw = safeExec("sh -c '" + script + "'", 3000);
  if (!raw) return result;

  const parts = raw.split('---SEP---').map(s => s.trim());
  if (parts.length >= 4) {
    result.name = parts[0] || 'user';
    result.gitBranch = parts[1] || '';
    if (parts[2]) {
      for (const line of parts[2].split('\n')) {
        if (!line || line.length < 2) continue;
        const x = line[0], y = line[1];
        if (x === '?' && y === '?') { result.untracked++; continue; }
        if (x !== ' ' && x !== '?') result.staged++;
        if (y !== ' ' && y !== '?') result.modified++;
      }
    }
    const ab = (parts[3] || '0 0').split(/\s+/);
    result.ahead = parseInt(ab[0]) || 0;
    result.behind = parseInt(ab[1]) || 0;
  }
  return result;
}

function getModelName() {
  try {
    const claudeConfig = readJSON(path.join(os.homedir(), '.claude.json'));
    if (claudeConfig && claudeConfig.projects) {
      for (const [projectPath, projectConfig] of Object.entries(claudeConfig.projects)) {
        if (CWD === projectPath || CWD.startsWith(projectPath + '/')) {
          const usage = projectConfig.lastModelUsage;
          if (usage) {
            const ids = Object.keys(usage);
            if (ids.length > 0) {
              let modelId = ids[ids.length - 1];
              let latest = 0;
              for (const id of ids) {
                const ts = usage[id]?.lastUsedAt ? new Date(usage[id].lastUsedAt).getTime() : 0;
                if (ts > latest) { latest = ts; modelId = id; }
              }
              if (modelId.includes('opus')) return 'Opus 4.6';
              if (modelId.includes('sonnet')) return 'Sonnet 4.6';
              if (modelId.includes('haiku')) return 'Haiku 4.5';
              return modelId.split('-').slice(1, 3).join(' ');
            }
          }
          break;
        }
      }
    }
  } catch { /* ignore */ }

  const settings = getSettings();
  if (settings?.model) {
    const m = settings.model;
    if (m.includes('opus')) return 'Opus 4.6';
    if (m.includes('sonnet')) return 'Sonnet 4.6';
    if (m.includes('haiku')) return 'Haiku 4.5';
  }
  return 'Claude Code';
}

function getSessionDuration() {
  const data = readJSON(path.join(CWD, '.claude', 'session.json'));
  if (data?.startTime) {
    const mins = Math.floor((Date.now() - new Date(data.startTime).getTime()) / 60000);
    return mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h' + (mins % 60) + 'm';
  }
  return '';
}

let _stdinData;
function getStdinData() {
  if (_stdinData !== undefined) return _stdinData;
  try {
    if (process.stdin.isTTY) { _stdinData = null; return null; }
    const chunks = [];
    const buf = Buffer.alloc(4096);
    let bytesRead;
    try {
      while ((bytesRead = fs.readSync(0, buf, 0, buf.length, null)) > 0) {
        chunks.push(buf.slice(0, bytesRead));
      }
    } catch { /* EOF */ }
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    _stdinData = raw && raw.startsWith('{') ? JSON.parse(raw) : null;
  } catch {
    _stdinData = null;
  }
  return _stdinData;
}

function getModelFromStdin() {
  const data = getStdinData();
  return data?.model?.display_name || null;
}

function getContextFromStdin() {
  const data = getStdinData();
  if (data?.context_window) {
    return {
      usedPct: Math.floor(data.context_window.used_percentage || 0),
      remainingPct: Math.floor(data.context_window.remaining_percentage || 100),
    };
  }
  return null;
}

function generateStatusline() {
  const git = getGitInfo();
  const modelName = getModelFromStdin() || getModelName();
  const ctxInfo = getContextFromStdin();
  const duration = getSessionDuration();
  const segments = [];

  if (git.gitBranch) {
    let gitSeg = c.brightBlue + '\u23C7 ' + git.gitBranch + c.reset;
    let indicators = '';
    if (git.staged > 0) indicators += c.brightGreen + '+' + git.staged + c.reset;
    if (git.modified > 0) indicators += c.brightYellow + '~' + git.modified + c.reset;
    if (git.untracked > 0) indicators += c.dim + '?' + git.untracked + c.reset;
    if (indicators) gitSeg += ' ' + indicators;
    if (git.ahead > 0) gitSeg += ' ' + c.brightGreen + '\u2191' + git.ahead + c.reset;
    if (git.behind > 0) gitSeg += ' ' + c.brightRed + '\u2193' + git.behind + c.reset;
    segments.push(gitSeg);
  }

  segments.push(c.purple + modelName + c.reset);

  if (ctxInfo && ctxInfo.usedPct != null) {
    const pct = ctxInfo.usedPct;
    const barWidth = 15;
    const filled = Math.round((pct / 100) * barWidth);
    const empty = barWidth - filled;
    const barColor = pct >= 90 ? c.brightRed : pct >= 70 ? c.brightYellow : pct >= 40 ? c.green : c.brightGreen;
    const tick = Math.floor(Date.now() / 250) % 4;
    const spinChars = ['\u2588', '\u2593', '\u2592', '\u2591'];
    const cursor = filled < barWidth ? spinChars[tick] : '';
    const filledBar = '\u2588'.repeat(filled);
    const emptyBar = '\u2591'.repeat(Math.max(0, empty - (cursor ? 1 : 0)));
    const bar = barColor + filledBar + c.reset
      + (cursor ? barColor + cursor + c.reset : '')
      + c.dim + emptyBar + c.reset;
    segments.push(bar + ' ' + barColor + pct + '%' + c.reset);
  }

  if (duration) segments.push(c.cyan + duration + c.reset);

  const sep = '  ' + c.dim + '\u2502' + c.reset + '  ';
  return segments.join(sep);
}

function generateJSON() {
  const git = getGitInfo();
  return {
    user: { name: git.name, gitBranch: git.gitBranch, modelName: getModelFromStdin() || getModelName() },
    git: { modified: git.modified, untracked: git.untracked, staged: git.staged, ahead: git.ahead, behind: git.behind },
    session: { duration: getSessionDuration() },
    context: getContextFromStdin(),
    lastUpdated: new Date().toISOString(),
  };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(generateJSON(), null, 2));
} else {
  console.log(generateStatusline());
}
