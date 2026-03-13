#!/usr/bin/env node
/**
 * Task Router
 * Routes tasks to optimal agents and classifies complexity tier
 */

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

function routeTask(task) {
  const taskLower = task.toLowerCase();
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

  // Tier 3: long prompt + multiple domains/files
  if (matchedDomains >= 3 || fileRefs >= 5 || words > 200) return 3;
  // Tier 2: medium complexity
  if (fileRefs >= 2 || matchedDomains >= 2 || words > 50) return 2;
  // Tier 1: simple
  return 1;
}

function classifyWorkflow(prompt, cwd) {
  return {
    agent: routeTask(prompt),
    tier: classifyTier(prompt),
  };
}

module.exports = { routeTask, classifyTier, classifyWorkflow, TASK_PATTERNS };

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
