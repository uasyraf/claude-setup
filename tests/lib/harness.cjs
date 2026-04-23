/**
 * Tiny test harness for ~/.claude/ hook + router validation.
 * Zero deps. Each test is a standalone node script that instantiates Test,
 * records assertions, and calls report() which exits 0 (pass) or 1 (fail).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function makeTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `claude-tests-${label}-`));
}

function runHook(scriptPath, payload, opts = {}) {
  return spawnSync('node', [scriptPath], {
    input: JSON.stringify(payload || {}),
    encoding: 'utf-8',
    cwd: opts.cwd || process.cwd(),
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function runHookArgs(scriptPath, payload, args = [], opts = {}) {
  return spawnSync('node', [scriptPath, ...args], {
    input: JSON.stringify(payload || {}),
    encoding: 'utf-8',
    cwd: opts.cwd || process.cwd(),
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
}

class Test {
  constructor(name) {
    this.name = name;
    this.failures = [];
  }
  assert(cond, msg) {
    if (!cond) this.failures.push(msg);
  }
  assertEq(actual, expected, msg) {
    if (actual !== expected) {
      this.failures.push(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  assertIncludes(haystack, needle, msg) {
    if (!haystack || !haystack.includes(needle)) {
      const preview = (haystack || '').slice(0, 400);
      this.failures.push(`${msg}: expected to include "${needle}" in:\n${preview}`);
    }
  }
  report() {
    if (this.failures.length === 0) {
      console.log(`[PASS] ${this.name}`);
      process.exit(0);
    }
    console.log(`[FAIL] ${this.name}`);
    for (const f of this.failures) console.log('  - ' + f);
    process.exit(1);
  }
}

module.exports = { Test, makeTmpDir, runHook, runHookArgs, cleanup };
