#!/usr/bin/env node
/**
 * Team definition linter.
 *
 * Usage: node ~/.claude/teams/_lint.js
 * Exits 0 if all teams pass, 1 if any fail.
 */

const fs = require('fs');
const path = require('path');

const TEAMS_DIR = __dirname;
const REQUIRED_KEYS = ['name', 'description', 'lead', 'trigger', 'min_complexity', 'members'];
const KNOWN_AGENTS = [
  'explorer', 'architect', 'analyst', 'coder', 'reviewer', 'qa',
  'security-reviewer', 'challenger', 'tester', 'researcher', 'backend-dev',
  'frontend-dev', 'devops',
];

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) return null;
  const fm = m[1];
  const out = {};
  for (const line of fm.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    out[kv[1]] = kv[2].trim();
  }
  return out;
}

function parseList(v) {
  if (!v) return [];
  return v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
}

function lintFile(file) {
  const errors = [];
  const warnings = [];
  const content = fs.readFileSync(file, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('missing frontmatter block (--- ... ---)');
    return { errors, warnings };
  }

  for (const k of REQUIRED_KEYS) {
    if (!fm[k]) errors.push(`missing required key: ${k}`);
  }

  if (fm.name) {
    const expectedName = path.basename(file, '.md');
    if (fm.name !== expectedName) {
      errors.push(`name "${fm.name}" does not match filename "${expectedName}"`);
    }
    if (!/-team$/.test(fm.name)) {
      errors.push(`name must end with "-team" (got "${fm.name}")`);
    }
  }

  if (fm.min_complexity) {
    const n = parseInt(fm.min_complexity, 10);
    if (isNaN(n) || n < 1 || n > 5) {
      errors.push(`min_complexity must be integer 1..5 (got "${fm.min_complexity}")`);
    }
  }

  if (fm.members) {
    const members = parseList(fm.members);
    if (members.length < 2) errors.push(`members must have at least 2 entries (got ${members.length})`);
    if (members.length > 5) warnings.push(`members has ${members.length} entries — consider keeping ≤5 for focus`);
    const unique = new Set(members);
    if (unique.size !== members.length) errors.push('members contains duplicates');
    if (fm.lead && !members.includes(fm.lead)) {
      errors.push(`lead "${fm.lead}" not present in members list`);
    }
    for (const m of members) {
      if (!KNOWN_AGENTS.includes(m)) {
        warnings.push(`unknown agent "${m}" (add to _lint.js KNOWN_AGENTS if intentional)`);
      }
    }
  }

  if (!/## Workflow/.test(content)) warnings.push('body missing "## Workflow" section');
  if (!/## Coordination/.test(content)) warnings.push('body missing "## Coordination" section');

  return { errors, warnings };
}

function main() {
  const files = fs.readdirSync(TEAMS_DIR)
    .filter(f => f.endsWith('-team.md'))
    .map(f => path.join(TEAMS_DIR, f))
    .sort();

  if (files.length === 0) {
    console.error('No *-team.md files found in', TEAMS_DIR);
    process.exit(1);
  }

  let failed = 0;
  let totalWarnings = 0;
  for (const f of files) {
    const rel = path.basename(f);
    const { errors, warnings } = lintFile(f);
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`[OK]   ${rel}`);
      continue;
    }
    if (errors.length > 0) {
      failed++;
      console.log(`[FAIL] ${rel}`);
      for (const e of errors) console.log(`  - ERROR: ${e}`);
    } else {
      console.log(`[WARN] ${rel}`);
    }
    totalWarnings += warnings.length;
    for (const w of warnings) console.log(`  - WARN: ${w}`);
  }

  console.log('');
  console.log(`Checked ${files.length} teams · ${failed} failed · ${totalWarnings} warnings`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
