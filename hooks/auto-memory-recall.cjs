#!/usr/bin/env node
/**
 * Auto Memory Recall Hook (UserPromptSubmit)
 *
 * Reads the user prompt, extracts salient keywords, greps all relevant memory
 * stores, and injects top matches as additionalContext so the model sees them
 * on every turn.
 *
 * Sources scanned (in order):
 *   1. ~/.claude/projects/<slug>/memory/MEMORY.md and individual memory files
 *   2. <project_cwd>/CLAUDE.md (domain memory)
 *   3. <project_cwd>/PROGRESS.md (recent milestones)
 *   4. <project_cwd>/DEBT.md (tracked debt — so model avoids compounding)
 *
 * Output contract: writes a short markdown block to stdout that Claude Code
 * appends to the prompt as system context.
 *
 * Safety:
 *   - Bails fast on prompts < 6 chars or pure questions with no signal
 *   - Caps total injected context at 2KB to stay cheap
 *   - Never throws — always exits 0 on error
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_MATCHES = 5;
const MAX_CONTEXT_BYTES = 2048;
const MAX_SNIPPET_LINES = 4;

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','so','to','of','in','on','at','for',
  'with','by','from','up','down','is','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may','might','can',
  'this','that','these','those','i','you','we','they','it','me','my','your','our',
  'please','help','how','what','why','when','where','which','who','whose','about',
  'into','over','under','out','as','not','no','yes','any','some','all','more','most'
]);

function safeRead(p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return null; }
}

function extractKeywords(prompt) {
  const words = (prompt || '').toLowerCase()
    .replace(/[`"'\[\](){}.,:;!?]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); out.push(w); }
    if (out.length >= 8) break;
  }
  return out;
}

function slugify(cwd) {
  return cwd.replace(/^\//, '-').replace(/\//g, '-');
}

function candidateMemoryFiles(cwd) {
  const home = os.homedir();
  const projSlug = slugify(cwd);
  const projMem = path.join(home, '.claude', 'projects', projSlug, 'memory');
  const candidates = [];

  // Project-scoped auto-memory
  if (fs.existsSync(projMem)) {
    for (const f of fs.readdirSync(projMem)) {
      if (f.endsWith('.md')) candidates.push(path.join(projMem, f));
    }
  }

  // Per-project trackers + domain file
  for (const f of ['CLAUDE.md', 'PROGRESS.md', 'DEBT.md']) {
    const p = path.join(cwd, f);
    if (fs.existsSync(p)) candidates.push(p);
  }

  return candidates;
}

function scoreFile(content, keywords) {
  if (!content) return 0;
  const lc = content.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = lc.match(re);
    if (matches) score += matches.length;
  }
  return score;
}

function extractSnippet(content, keywords) {
  const lines = content.split('\n');
  const scored = lines.map((line, i) => {
    const lc = line.toLowerCase();
    let s = 0;
    for (const kw of keywords) if (lc.includes(kw)) s++;
    return { i, line, s };
  }).filter(x => x.s > 0);

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, MAX_SNIPPET_LINES).sort((a, b) => a.i - b.i);
  return top.map(x => x.line.trim()).filter(Boolean).join('\n');
}

function main() {
  let input = '';
  try { input = fs.readFileSync(0, 'utf-8'); } catch { /* no stdin */ }

  let payload = {};
  try { payload = JSON.parse(input || '{}'); } catch { /* */ }

  const prompt = payload.prompt || '';
  const cwd = payload.cwd || process.cwd();

  if (!prompt || prompt.length < 6) return;

  const keywords = extractKeywords(prompt);
  if (keywords.length === 0) return;

  const files = candidateMemoryFiles(cwd);
  const hits = [];

  for (const f of files) {
    const content = safeRead(f);
    if (!content) continue;
    const score = scoreFile(content, keywords);
    if (score === 0) continue;
    const snippet = extractSnippet(content, keywords);
    if (!snippet) continue;
    hits.push({ file: f, score, snippet });
  }

  if (hits.length === 0) return;

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, MAX_MATCHES);

  let out = '## Recalled context (auto-memory)\n\n';
  let bytes = out.length;
  for (const h of top) {
    const rel = h.file.replace(os.homedir(), '~');
    const block = `**${rel}** (relevance: ${h.score})\n${h.snippet}\n\n`;
    if (bytes + block.length > MAX_CONTEXT_BYTES) break;
    out += block;
    bytes += block.length;
  }

  // additionalContext via JSON payload — Claude Code merges into prompt
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: out.trim()
    }
  }));
}

try { main(); } catch { /* never throw from hook */ }
