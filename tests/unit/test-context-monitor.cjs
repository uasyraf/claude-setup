const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, runHook } = require('../lib/harness.cjs');

const t = new Test('test-context-monitor.cjs');
const hook = path.join(os.homedir(), '.claude', 'hooks', 'context-monitor.cjs');

// --- No session_id: silent exit
const rNoSession = runHook(hook, { tool_name: 'Bash' });
t.assertEq(rNoSession.status, 0, 'exits 0 with no session_id');
t.assertEq(rNoSession.stdout.trim(), '', 'silent with no session_id');

// --- No metrics file: silent
const missingSession = 'ctx-miss-' + Date.now();
const rMissing = runHook(hook, { tool_name: 'Bash', session_id: missingSession });
t.assertEq(rMissing.status, 0, 'exits 0 when metrics file absent');
t.assertEq(rMissing.stdout.trim(), '', 'silent without metrics file');

// --- High remaining: silent
const highSession = 'ctx-high-' + Date.now();
const highMetrics = path.join(os.tmpdir(), `claude-ctx-${highSession}.json`);
fs.writeFileSync(highMetrics, JSON.stringify({
  remaining_percentage: 80,
  used_pct: 20,
  timestamp: Math.floor(Date.now() / 1000),
}));
const rHigh = runHook(hook, { tool_name: 'Bash', session_id: highSession });
t.assertEq(rHigh.status, 0, 'exits 0 with >35% remaining');
t.assertEq(rHigh.stdout.trim(), '', 'silent when plenty of context left');

// --- Critical remaining: emits CRITICAL warning
const critSession = 'ctx-crit-' + Date.now();
const critMetrics = path.join(os.tmpdir(), `claude-ctx-${critSession}.json`);
fs.writeFileSync(critMetrics, JSON.stringify({
  remaining_percentage: 15,
  used_pct: 85,
  timestamp: Math.floor(Date.now() / 1000),
}));
const rCrit = runHook(hook, { tool_name: 'Bash', session_id: critSession });
t.assertEq(rCrit.status, 0, 'exits 0 on critical remaining');
t.assert(rCrit.stdout.length > 0, 'emits context on critical remaining');

let parsed = null;
try { parsed = JSON.parse(rCrit.stdout); } catch { /* */ }
t.assert(parsed, 'critical output is valid JSON');
const ctx = parsed?.hookSpecificOutput?.additionalContext || '';
t.assertIncludes(ctx, 'CRITICAL', 'context message is CRITICAL-severity');

[highMetrics, critMetrics,
 path.join(os.tmpdir(), `claude-ctx-${highSession}-warned.json`),
 path.join(os.tmpdir(), `claude-ctx-${critSession}-warned.json`)
].forEach(f => { try { fs.unlinkSync(f); } catch { /* */ } });

t.report();
