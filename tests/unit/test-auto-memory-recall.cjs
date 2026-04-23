const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, makeTmpDir, runHook, cleanup } = require('../lib/harness.cjs');

const t = new Test('test-auto-memory-recall.cjs');
const hook = path.join(os.homedir(), '.claude', 'hooks', 'auto-memory-recall.cjs');

const tmp = makeTmpDir('recall');
const memContent = [
  '# Fixture Context',
  '',
  'chiaki-ng is a streaming client using quic transport for remote play.',
  'vitastream backend handles the protocol handshake.',
  ''
].join('\n');
fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), memContent);

// --- Keyword-matching prompt yields recall block
const rHit = runHook(hook, {
  hook_event_name: 'UserPromptSubmit',
  prompt: 'how does chiaki handle streaming over quic transport',
  cwd: tmp,
  session_id: 'recall-' + Date.now(),
}, { cwd: tmp });

t.assertEq(rHit.status, 0, 'auto-memory-recall exits 0');
t.assert(rHit.stdout.length > 0, 'emits output on keyword match');

let parsed = null;
try { parsed = JSON.parse(rHit.stdout); } catch { /* */ }
t.assert(parsed, 'output is valid JSON');
const ctx = parsed?.hookSpecificOutput?.additionalContext || '';
t.assertIncludes(ctx, 'Recalled context', 'header present');
t.assertIncludes(ctx, 'chiaki', 'snippet contains matched keyword');

// --- Empty/short prompt: silent exit
const rEmpty = runHook(hook, { prompt: 'ok', cwd: tmp }, { cwd: tmp });
t.assertEq(rEmpty.status, 0, 'short prompt exits 0');
t.assertEq(rEmpty.stdout.trim(), '', 'short prompt emits nothing');

// --- No matching keywords: silent
const rNoMatch = runHook(hook, {
  hook_event_name: 'UserPromptSubmit',
  prompt: 'completely unrelated topic with no overlapping words whatsoever',
  cwd: tmp,
  session_id: 'recall-nomatch-' + Date.now(),
}, { cwd: tmp });
t.assertEq(rNoMatch.status, 0, 'no-match prompt exits 0');
t.assertEq(rNoMatch.stdout.trim(), '', 'no-match prompt emits nothing');

cleanup(tmp);
t.report();
