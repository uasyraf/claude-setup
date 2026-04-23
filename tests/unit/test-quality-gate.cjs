const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, makeTmpDir, runHook, cleanup } = require('../lib/harness.cjs');

const t = new Test('test-quality-gate.cjs');
const hook = path.join(os.homedir(), '.claude', 'helpers', 'quality-gate.cjs');

// --- Critical block: Anthropic-shaped key literal
const tmpBad = makeTmpDir('qg-bad');
const badFile = path.join(tmpBad, 'bad.py');
const badContent = 'API_KEY = "sk-ant-api03-' + 'a'.repeat(40) + '"\n';
fs.writeFileSync(badFile, badContent);

const rBad = runHook(hook, { tool_input: { file_path: badFile } });
t.assertEq(rBad.status, 2, 'quality-gate exits 2 on Anthropic key');
t.assertIncludes(rBad.stderr, 'Anthropic API key', 'stderr names detected key type');

// --- Clean file: advisory only
const tmpOk = makeTmpDir('qg-ok');
const okFile = path.join(tmpOk, 'ok.py');
fs.writeFileSync(okFile, 'def add(a, b):\n    return a + b\n');

const rOk = runHook(hook, { tool_input: { file_path: okFile } });
t.assertEq(rOk.status, 0, 'quality-gate exits 0 on clean file');
t.assertIncludes(rOk.stdout, '[QUALITY]', 'emits advisory on clean file');

// --- Unsupported ext: silent no-op
const tmpMd = makeTmpDir('qg-md');
const mdFile = path.join(tmpMd, 'notes.md');
fs.writeFileSync(mdFile, '# notes\n');
const rMd = runHook(hook, { tool_input: { file_path: mdFile } });
t.assertEq(rMd.status, 0, 'quality-gate skips unsupported extensions');

cleanup(tmpBad);
cleanup(tmpOk);
cleanup(tmpMd);
t.report();
