const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { Test } = require('../lib/harness.cjs');

const t = new Test('test-teams-lint.cjs');

const lintScript = path.join(os.homedir(), '.claude', 'teams', '_lint.js');
const r = spawnSync('node', [lintScript], { encoding: 'utf-8' });

t.assertEq(r.status, 0, 'teams lint passes (all 10 team files valid)');
if (r.status !== 0) {
  console.log('  --- lint stdout ---');
  console.log(r.stdout);
  console.log('  --- lint stderr ---');
  console.log(r.stderr);
}

t.report();
