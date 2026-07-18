#!/usr/bin/env node
/**
 * Stop hook — blocks a turn that emitted user-facing prose without running
 * the humanizer:humanizer skill first.
 *
 * Enforces the standing "Output Humanization" directive deterministically:
 * on the happy path humanization runs pre-emission and this gate stays silent;
 * it only fires on a slip, feeding the reason back so the turn re-runs
 * humanizer and re-emits. Fails open — any exception ends the turn normally.
 */

const fs = require('fs');

const PROSE_WORD_THRESHOLD = 15;

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

function isRealUserTurn(e) {
  if (e?.type !== 'user') return false;
  const c = e?.message?.content;
  if (typeof c === 'string') return true;
  if (Array.isArray(c)) return !c.some(i => i?.type === 'tool_result');
  return false;
}

function scopeSinceLastUser(entries) {
  let start = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserTurn(entries[i])) { start = i; break; }
  }
  if (start === -1) return null;
  return entries.slice(start + 1);
}

function ranHumanizer(scope) {
  for (const e of scope) {
    const c = e?.message?.content;
    if (!Array.isArray(c)) continue;
    for (const it of c) {
      if (it?.type === 'tool_use' && it.name === 'Skill'
          && /humanizer/i.test(it.input?.skill || '')) {
        return true;
      }
    }
  }
  return false;
}

function assistantText(scope) {
  const parts = [];
  for (const e of scope) {
    if (e?.type !== 'assistant') continue;
    const c = e?.message?.content;
    if (!Array.isArray(c)) continue;
    for (const it of c) {
      if (it?.type === 'text' && typeof it.text === 'string') parts.push(it.text);
    }
  }
  return parts.join('\n');
}

function proseWordCount(text) {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, ' ');           // fenced code blocks
  t = t.replace(/`[^`]*`/g, ' ');                    // inline code
  t = t.split('\n').filter(line => (line.match(/\|/g) || []).length < 2).join('\n'); // table rows
  t = t.replace(/https?:\/\/\S+/g, ' ');             // URLs
  t = t.replace(/(?:~|\.{0,2})?\/?[\w.-]+(?:\/[\w.-]+)+/g, ' '); // bare paths
  const words = t.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.length;
}

function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }

  if (payload.stop_hook_active) return;              // loop breaker: block once/turn

  if (!payload.transcript_path) return;
  const entries = readTranscript(payload.transcript_path);
  const scope = scopeSinceLastUser(entries);
  if (!scope) return;                                // no boundary: fail open

  if (ranHumanizer(scope)) return;

  const words = proseWordCount(assistantText(scope));
  if (words <= PROSE_WORD_THRESHOLD) return;         // exempt: code, one-liners, tool output

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'Final reply is user-facing prose but humanizer:humanizer was not run this turn. Run it on your last message, then re-emit the humanized version.',
  }));
}

try { main(); } catch { /* never throw — a broken gate must not wedge the session */ }
