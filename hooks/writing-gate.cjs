#!/usr/bin/env node
/**
 * Stop hook: blocks a turn whose final reply contains an em dash, an en dash,
 * or a word from the banned list in ~/.claude/rules/writing-register.md.
 *
 * Only prose is scanned. Fenced code, inline code, table rows, URLs and paths
 * are removed first. Fails open: any exception ends the turn normally.
 */

const fs = require('fs');

const PROSE_WORD_THRESHOLD = 15;

const BANNED = [
  'raise', 'raised', 'raises', 'raising',
  'draw', 'draws', 'drawn', 'drew',
  'carries', 'carrying',
  'stands', 'names', 'naming',
  'the walk', 'the sweep', 'hunting', 'obligation',
  'rolls onto', 'lands on', 'landed on', 'born pending', 'posts away', 'post away',
  'spill', 'spills', 'spilled', 'spilling',
  'table reads', 'figure reads', 'branch reads', 'spec reads', 'document reads',
  'writes nothing', 'holds nothing', 'waits for nothing', 'carries nothing',
  'has no', 'have no', 'holds no', 'carries no', 'contains no', 'offers no',
  'provides no', 'requires no', 'needs no', 'makes no', 'references no',
  'silent', 'silently', 'silence', 'leave it silent', 'stay silent',
  'quietly', 'quiet', 'rhythm', 'cadence',
];

const DASHES = /[–—]|&mdash;|&ndash;/;

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
  if (e?.isMeta === true) return false;
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

function lastAssistantText(scope) {
  let text = '';
  for (const e of scope) {
    if (e?.type !== 'assistant') continue;
    const c = e?.message?.content;
    if (!Array.isArray(c)) continue;
    const parts = c.filter(it => it?.type === 'text' && typeof it.text === 'string').map(it => it.text);
    if (parts.length) text = parts.join('\n');
  }
  return text;
}

function prose(text) {
  let t = text;
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/`[^`]*`/g, ' ');
  t = t.split('\n').filter(line => (line.match(/\|/g) || []).length < 2).join('\n');
  t = t.replace(/https?:\/\/\S+/g, ' ');
  t = t.replace(/(?:~|\.{0,2})?\/?[\w.-]+(?:\/[\w.-]+)+/g, ' ');
  return t;
}

function findHits(text) {
  const hits = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (DASHES.test(line)) hits.push(`line ${i + 1}: em or en dash`);
    for (const word of BANNED) {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(line)) hits.push(`line ${i + 1}: banned word "${word}"`);
    }
  });
  return hits;
}

function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }
  if (payload.stop_hook_active) return;
  if (!payload.transcript_path) return;

  const scope = scopeSinceLastUser(readTranscript(payload.transcript_path));
  if (!scope) return;

  const text = prose(lastAssistantText(scope));
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  if (words.length <= PROSE_WORD_THRESHOLD) return;

  const hits = findHits(text);
  if (hits.length === 0) return;

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'The final reply breaks the writing register (~/.claude/rules/writing-register.md): '
      + hits.slice(0, 8).join('; ') + '. Rewrite the reply and send it again.',
  }));
}

if (require.main === module) {
  try { main(); } catch { /* fail open */ }
}

module.exports = { findHits, prose };
