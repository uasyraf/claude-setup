const fs = require('fs');
const path = require('path');
const os = require('os');
const { Test, makeTmpDir, runHook, cleanup } = require('../lib/harness.cjs');

const t = new Test('test-debt-scanner.cjs');
const hook = path.join(os.homedir(), '.claude', 'hooks', 'debt-scanner.cjs');

const tmp = makeTmpDir('debt');
// Make the tempdir look like a real project root so findProjectRoot stops here
fs.writeFileSync(path.join(tmp, 'package.json'), '{"name":"debt-fixture"}');

const srcFile = path.join(tmp, 'sample.py');
const content = [
  'def foo():',
  '    # TODO: low severity marker',
  '    # FIXME: medium severity marker',
  '    # HACK: high severity marker',
  '    return 1',
  '',
].join('\n');

const payload = {
  tool_name: 'Write',
  tool_input: { file_path: srcFile, content },
  cwd: tmp,
};

const r = runHook(hook, payload, { cwd: tmp });
t.assertEq(r.status, 0, 'debt-scanner exits 0');

const debtPath = path.join(tmp, 'DEBT.md');
t.assert(fs.existsSync(debtPath), 'DEBT.md created');

const debt = fs.readFileSync(debtPath, 'utf-8');
t.assertIncludes(debt, 'TODO', 'TODO marker recorded');
t.assertIncludes(debt, 'FIXME', 'FIXME marker recorded');
t.assertIncludes(debt, 'HACK', 'HACK marker recorded');
t.assertIncludes(debt, '| LOW |', 'TODO → LOW severity');
t.assertIncludes(debt, '| MEDIUM |', 'FIXME → MEDIUM severity');
t.assertIncludes(debt, '| HIGH |', 'HACK → HIGH severity');

cleanup(tmp);
t.report();
