const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, runHook } = require('../lib/harness.cjs');

const t = new Test('test-self-heal.cjs');
const hook = path.join(os.homedir(), '.claude', 'hooks', 'self-heal.cjs');

const sessionId = 'selfheal-' + Date.now();
const stateFile = path.join(os.tmpdir(), `claude-self-heal-${sessionId}.json`);

// --- Failure case: missing binary
const failPayload = {
  tool_name: 'Bash',
  tool_input: { command: 'foobar-missing --help' },
  tool_response: {
    exit_code: 127,
    stderr: 'foobar-missing: command not found',
    stdout: '',
  },
  session_id: sessionId,
};

const rFail = runHook(hook, failPayload);
t.assertEq(rFail.status, 0, 'self-heal exits 0 on failure (never blocks)');
t.assert(rFail.stdout.length > 0, 'emits output on failure');

let parsed = null;
try { parsed = JSON.parse(rFail.stdout); } catch { /* */ }
t.assert(parsed, 'output is valid JSON');
const ctx = parsed?.hookSpecificOutput?.additionalContext || '';
t.assertIncludes(ctx, 'missing_binary', 'classifies error as missing_binary');
t.assertIncludes(ctx, 'PATH', 'hint references PATH');
t.assertIncludes(ctx, 'retry', 'stage is a retry on first failure');

// --- Success case: should emit nothing and reset counter
const okPayload = {
  tool_name: 'Bash',
  tool_input: { command: 'ls' },
  tool_response: { exit_code: 0, stdout: 'x\n', stderr: '' },
  session_id: sessionId,
};
const rOk = runHook(hook, okPayload);
t.assertEq(rOk.status, 0, 'success case exits 0');
t.assertEq(rOk.stdout.trim(), '', 'success case emits no output');

// --- Non-Bash tool: ignored
const rIgnore = runHook(hook, { tool_name: 'Edit', tool_response: { exit_code: 1 } });
t.assertEq(rIgnore.status, 0, 'non-Bash tool ignored');
t.assertEq(rIgnore.stdout.trim(), '', 'non-Bash tool emits nothing');

try { fs.unlinkSync(stateFile); } catch { /* */ }
t.report();
