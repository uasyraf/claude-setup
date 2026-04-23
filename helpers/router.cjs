#!/usr/bin/env node
/**
 * Task Router
 * Classifies tier, routes to agents, and matches teams.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const TASK_PATTERNS = {
  'implement|create|build|add|write code': 'coder',
  'test|spec|coverage|unit test|integration': 'tester',
  'review|audit|check|validate|security': 'reviewer',
  'research|find|search|documentation|explore': 'researcher',
  'design|architect|structure|plan': 'architect',
  'api|endpoint|server|backend|database': 'backend-dev',
  'ui|frontend|component|react|css|style': 'frontend-dev',
  'deploy|docker|ci|cd|pipeline|infrastructure': 'devops',
};

const TEAMS_DIR = path.join(os.homedir(), '.claude', 'teams');

const TEAM_PRIORITY = [
  'security-team',
  'investigation-team',
  'performance-team',
  'architecture-team',
  'feature-team',
  'migration-team',
  'refactor-team',
  'review-team',
  'documentation-team',
  'onboarding-team',
];

const TEAM_KEYWORDS = {
  'security-team': /\b(?:security|owasp|cve|vulnerab|xss|csrf|sql[- ]inject|secret|credential|input[- ]valid|sanitiz|authentication|authorization|oauth2?|oidc|jwt)\b|\b(?:audit|review|harden|assess|check|fix) [^.]{0,30}\bauth\b/i,
  'investigation-team': /\broot[- ]cause\b|\bdebug\b|\bcrash\b|\bregression\b|\bproduction (?:issue|incident|outage)\b|\bflaky\b|\b(?:failing|broken) test\b|\binvestigat/i,
  'performance-team': /\bperformance\b|\bslow\b|\blatency\b|\bbottleneck\b|\bprofil|\boptimiz|\bbenchmark\b|\bspeed[- ]?up\b|\bn\+1\b/i,
  'architecture-team': /\barchitect(?:ure|ural)?\b|\bsystem[- ]design\b|\btech(?:nology)? (?:stack|selection|choice)\b|\btrade-?off|\bdesign decision/i,
  'feature-team': /\b(?:new|add|build|implement|ship) .{0,25}\bfeature\b|\bfeature\b .{0,30}\b(?:spans?|across|multiple)|\bgreenfield\b/i,
  'migration-team': /\bmigrat(?:e|ion|ing)\b|\bupgrade\b|\bversion[- ]bump\b|\bframework (?:upgrade|migration)\b|\bbreaking[- ]change/i,
  'refactor-team': /\brefactor\b|\brestructur|\breorganiz|\bextract (?:module|pattern|class|function) across/i,
  'review-team': /\bcode[- ]review\b|\breview (?:changes|pr|the pr|these changes)\b|\bmulti-?perspective\b|\breview changeset/i,
  'documentation-team': /\bdocumentation\b|\bwrite docs?\b|\bgenerate docs?\b|\bapi docs?\b|\bapi documentation\b|\barchitecture documentation\b/i,
  'onboarding-team': /\bonboard(?:ing)?\b|\bunfamiliar codebase\b|\borient(?:ation|ing)?\b|\bnew[- ]project orientation\b|\bexplore .{0,15}codebase/i,
};

function routeTask(task) {
  const taskLower = (task || '').toLowerCase();
  for (const [pattern, agent] of Object.entries(TASK_PATTERNS)) {
    if (new RegExp(pattern, 'i').test(taskLower)) {
      return { agent, confidence: 0.8, reason: `Matched pattern: ${pattern}` };
    }
  }
  return { agent: 'coder', confidence: 0.5, reason: 'Default routing - no specific pattern matched' };
}

function classifyTier(prompt) {
  if (!prompt) return 1;
  const words = prompt.split(/\s+/).length;
  const fileRefs = (prompt.match(/\b[\w/.-]+\.\w{1,5}\b/g) || []).length;
  const domains = ['frontend', 'backend', 'database', 'test', 'deploy', 'api', 'ui', 'infra', 'auth', 'config'];
  const matchedDomains = domains.filter(d => prompt.toLowerCase().includes(d)).length;

  if (matchedDomains >= 3 || fileRefs >= 5 || words > 200) return 3;
  if (fileRefs >= 2 || matchedDomains >= 2 || words > 50) return 2;
  return 1;
}

function parseTeamFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const m = content.match(/^---\n([\s\S]+?)\n---/);
    if (!m) return null;
    const fm = m[1];
    const getKey = (k) => {
      const match = fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'));
      return match ? match[1].trim() : null;
    };
    const getList = (k) => {
      const v = getKey(k);
      if (!v) return [];
      return v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
    };
    const name = getKey('name');
    if (!name) return null;
    return {
      name,
      description: getKey('description'),
      lead: getKey('lead'),
      trigger: getKey('trigger'),
      min_complexity: parseInt(getKey('min_complexity') || '1', 10),
      members: getList('members'),
    };
  } catch {
    return null;
  }
}

function loadTeams() {
  const out = {};
  try {
    if (!fs.existsSync(TEAMS_DIR)) return out;
    for (const f of fs.readdirSync(TEAMS_DIR)) {
      if (!f.endsWith('-team.md')) continue;
      const meta = parseTeamFile(path.join(TEAMS_DIR, f));
      if (meta && meta.name) out[meta.name] = meta;
    }
  } catch { /* */ }
  return out;
}

// Maps tier → estimated file count for min_complexity gating.
const TIER_FILE_ESTIMATE = { 1: 1, 2: 3, 3: 6 };

function matchTeam(prompt, tier) {
  if (!prompt) return null;
  const teams = loadTeams();
  const files = TIER_FILE_ESTIMATE[tier] || 1;

  for (const name of TEAM_PRIORITY) {
    const team = teams[name];
    const pattern = TEAM_KEYWORDS[name];
    if (!team || !pattern) continue;
    if (!pattern.test(prompt)) continue;

    // security-team override: always triggers on keyword match (auth/secret changes)
    if (name === 'security-team') {
      return team;
    }
    if (files >= team.min_complexity) {
      return team;
    }
  }
  return null;
}

function classifyWorkflow(prompt, cwd) {
  const tier = classifyTier(prompt);
  return {
    agent: routeTask(prompt),
    tier,
    team: matchTeam(prompt, tier),
  };
}

module.exports = {
  routeTask,
  classifyTier,
  classifyWorkflow,
  matchTeam,
  loadTeams,
  TASK_PATTERNS,
  TEAM_PRIORITY,
};

// CLI
if (require.main === module) {
  var task = process.argv.slice(2).join(' ');
  if (task) {
    var result = classifyWorkflow(task);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Usage: router.cjs <task description>');
  }
}
