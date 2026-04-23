const path = require('path');
const os = require('os');
const { Test } = require('../lib/harness.cjs');

const router = require(path.join(os.homedir(), '.claude', 'helpers', 'router.cjs'));
const t = new Test('test-router.cjs');

// classifyTier: words/fileRefs/domains → tier
t.assertEq(router.classifyTier('fix typo'), 1, 'classifyTier trivial prompt = 1');
t.assertEq(router.classifyTier('update src/auth.ts and src/api.ts both files'), 2,
  'classifyTier with 2 file refs = 2');
t.assertEq(router.classifyTier('update backend api and database schema'), 3,
  'classifyTier with 3 domain keywords = 3');

// routeTask: keyword → agent
t.assertEq(router.routeTask('implement authentication').agent, 'coder',
  'routeTask("implement …") → coder');
t.assertEq(router.routeTask('review the changeset').agent, 'reviewer',
  'routeTask("review …") → reviewer');
t.assertEq(router.routeTask('design the api architecture').agent, 'architect',
  'routeTask("design …") → architect');

// matchTeam: security-team priority + min_complexity override
const secHigh = router.matchTeam('audit auth middleware for owasp issues', 2);
t.assert(secHigh && secHigh.name === 'security-team',
  'security keywords match security-team at tier 2');

const noteam = router.matchTeam('fix typo', 1);
t.assertEq(noteam, null, 'non-trigger prompt yields no team');

const secLow = router.matchTeam('check auth token storage', 1);
t.assert(secLow && secLow.name === 'security-team',
  'security-team bypasses min_complexity at tier 1');

// architecture-team at higher tier
const arch = router.matchTeam('system architecture design trade-off analysis', 3);
t.assert(arch && arch.name === 'architecture-team',
  'architecture keywords match architecture-team at tier 3');

// Exports shape
t.assert(Array.isArray(router.TEAM_PRIORITY) && router.TEAM_PRIORITY[0] === 'security-team',
  'TEAM_PRIORITY export begins with security-team');

t.report();
