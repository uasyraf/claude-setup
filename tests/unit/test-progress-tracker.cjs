const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, makeTmpDir, runHookArgs, cleanup } = require('../lib/harness.cjs');

const t = new Test('test-progress-tracker.cjs');
const hook = path.join(os.homedir(), '.claude', 'hooks', 'progress-tracker.cjs');

const tmp = makeTmpDir('progress');
fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"progress-fixture"}');

const sessionId = 'progress-' + Date.now();
const stateFile = path.join(os.tmpdir(), `claude-edits-${sessionId}.json`);
const filePath = path.join(tmp, 'edited.py');
fs.writeFileSync(filePath, '# stub\n');

// CHECKPOINT_THRESHOLD is 10 — fire 10 edits to trigger a flush
for (let i = 0; i < 10; i++) {
  const r = runHookArgs(hook, {
    cwd: tmp,
    session_id: sessionId,
    tool_input: { file_path: filePath },
  }, ['--checkpoint']);
  t.assertEq(r.status, 0, `checkpoint ${i + 1} exits 0`);
}

const progressPath = path.join(tmp, 'PROGRESS.md');
t.assert(fs.existsSync(progressPath), 'PROGRESS.md created after threshold');

const content = fs.readFileSync(progressPath, 'utf-8');
t.assertIncludes(content, '— checkpoint', 'checkpoint entry written');
t.assertIncludes(content, 'Files touched', 'files-touched section present');
t.assertIncludes(content, 'edited.py', 'edited file referenced');

try { fs.unlinkSync(stateFile); } catch { /* */ }
cleanup(tmp);
t.report();
