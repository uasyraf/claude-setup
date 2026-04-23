#!/usr/bin/env node
/**
 * Hook Handler
 * Dispatches hook events to helper modules.
 * Reads JSON from stdin when invoked by Claude Code hooks.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const helpersDir = __dirname;

function safeRequire(modulePath) {
  try {
    if (fs.existsSync(modulePath)) {
      const origLog = console.log;
      const origError = console.error;
      console.log = () => {};
      console.error = () => {};
      try {
        return require(modulePath);
      } finally {
        console.log = origLog;
        console.error = origError;
      }
    }
  } catch (e) { /* silently fail */ }
  return null;
}

const router = safeRequire(path.join(helpersDir, 'router.cjs'));
const session = safeRequire(path.join(helpersDir, 'session.cjs'));
const intelligence = safeRequire(path.join(helpersDir, 'intelligence.cjs'));

const [,, command, ...args] = process.argv;

function run(stdinData) {
  var prompt = stdinData.prompt
    || (stdinData.tool_input && stdinData.tool_input.command)
    || process.env.PROMPT
    || args.join(' ')
    || '';

  var hookCwd = stdinData.cwd || process.cwd();

  var editFilePath = (stdinData.tool_input && stdinData.tool_input.file_path)
    || process.env.TOOL_INPUT_file_path
    || args[0]
    || '';

  function detectLanguages(text) {
    var patterns = {
      python:     /\.py\b|python|django|flask|fastapi|pydantic|pytest/i,
      typescript: /\.tsx?\b|typescript|angular|react|next\.?js|vitest/i,
      javascript: /\.jsx?\b|javascript|node\.?js|express|webpack|vite\b/i,
      php:        /\.php\b|php|laravel|symfony|composer/i,
      java:       /\.java\b|java\b|spring|maven|gradle|junit/i,
      csharp:     /\.cs\b|c#|csharp|\.net|asp\.net|entity\s?framework/i,
      go:         /\.go\b|golang|goroutine/i,
      rust:       /\.rs\b|rust\b|cargo|tokio/i,
    };
    var found = [];
    for (var lang in patterns) {
      if (patterns[lang].test(text)) found.push(lang);
    }
    return found;
  }

  function detectTestCommand(cwd) {
    try {
      var pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
      if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
        return 'npm test';
      }
    } catch (e) { /* no package.json */ }
    try {
      if (fs.existsSync(path.join(cwd, 'pyproject.toml')) || fs.existsSync(path.join(cwd, 'pytest.ini')))
        return 'python -m pytest --tb=short -q';
    } catch (e) { /* skip */ }
    try {
      if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) return 'cargo test';
    } catch (e) { /* skip */ }
    try {
      if (fs.existsSync(path.join(cwd, 'build.gradle')) || fs.existsSync(path.join(cwd, 'pom.xml')))
        return fs.existsSync(path.join(cwd, 'gradlew')) ? './gradlew test' : 'mvn test';
    } catch (e) { /* skip */ }
    return null;
  }

  var TIER_EFFORT = { 1: 'low', 2: 'medium', 3: 'high' };

  function writeLocalEffort(level) {
    var localPath = path.join(os.homedir(), '.claude', 'settings.local.json');
    try {
      var data = {};
      if (fs.existsSync(localPath)) {
        data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      }
      // Respect explicit global xhigh override — don't downgrade
      try {
        var globalPath = path.join(os.homedir(), '.claude', 'settings.json');
        var global = JSON.parse(fs.readFileSync(globalPath, 'utf-8'));
        if (global.effortLevel === 'xhigh') return null;
      } catch (e) { /* proceed with write */ }
      if (data.effortLevel === level) return level;
      data.effortLevel = level;
      var tmp = localPath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, localPath);
      return level;
    } catch (e) {
      return null;
    }
  }

  var handlers = {
    'route': function() {
      if (intelligence && intelligence.getContext) {
        try {
          var ctx = intelligence.getContext(prompt);
          if (ctx) console.log(ctx);
        } catch (e) { /* non-fatal */ }
      }
      if (router && router.classifyWorkflow) {
        var result = router.classifyWorkflow(prompt, hookCwd);
        // Persist tier for pre-commit test gate
        try {
          var tierFile = path.join(os.tmpdir(), 'claude-tier-current.json');
          fs.writeFileSync(tierFile, JSON.stringify({ tier: result.tier, ts: Date.now() }));
        } catch (e) { /* non-fatal */ }
        var output = [];
        output.push('[INFO] Routing task: ' + (prompt.substring(0, 80) || '(no prompt)'));
        output.push('[TIER:' + result.tier + ']');
        var a = result.agent;
        output.push('[AGENT] ' + a.agent + ' (' + a.confidence + ') -- ' + a.reason);
        // Team auto-dispatch line
        if (result.team) {
          output.push('[TEAM] ' + result.team.name +
            ' — lead: ' + result.team.lead +
            ' — members: ' + (result.team.members || []).join(', '));
        }
        // Effort auto-apply: map tier to effortLevel in settings.local.json
        var mapped = TIER_EFFORT[result.tier] || 'medium';
        var applied = writeLocalEffort(mapped);
        if (applied) {
          output.push('[EFFORT:' + applied + ']');
        } else {
          output.push('[EFFORT:xhigh] (global override active)');
        }
        console.log(output.join('\n'));
      } else {
        console.log('[INFO] Router not available, using default routing');
      }
      var detected = detectLanguages(prompt);
      if (detected.length > 0) {
        console.log('[PRINCIPLES] Code task detected (' + detected.join(', ') + ')');
        console.log('  SOLID: S-single responsibility | O-open/closed | L-liskov | I-interface segregation | D-dependency inversion');
        console.log('  SIMPLICITY: Simplest solution that works. No premature abstraction. YAGNI.');
        console.log('  QUALITY: Functions <30 lines, max 3 indent levels, validate at boundaries');
      } else if (prompt.match(/\b(code|implement|refactor|debug|fix|build|create|add|update|write)\b/i)) {
        console.log('[PRINCIPLES] Code task detected');
        console.log('  SOLID: S-single responsibility | O-open/closed | L-liskov | I-interface segregation | D-dependency inversion');
        console.log('  SIMPLICITY: Simplest solution that works. No premature abstraction. YAGNI.');
        console.log('  QUALITY: Functions <30 lines, max 3 indent levels, validate at boundaries');
      }
    },

    'pre-bash': function() {
      var cmd = prompt.toLowerCase();
      var dangerous = [
        'rm -rf /',
        'format c:',
        'del /s /q c:\\',
        ':(){:|:&};:',
        'rm -rf ~',
        'rm -rf ~/',
        'rm -rf $home',
        'rm -rf /etc',
        'rm -rf /usr',
        'rm -rf /var',
        'rm -rf /boot',
        'rm -rf /bin',
        'rm -rf /sbin',
        'rm -rf /lib',
      ];
      for (var i = 0; i < dangerous.length; i++) {
        if (cmd.includes(dangerous[i])) {
          console.error('[BLOCKED] Dangerous command detected: ' + dangerous[i]);
          console.error('[BLOCKED] Ask user to confirm or use a safer alternative.');
          process.exit(1);
        }
      }

      var dangerousPatterns = [
        { re: /\bgit\s+push\s+[^&|;]*?(?:--force|-f)\b/, msg: 'git push --force' },
        { re: /\bgit\s+reset\s+--hard\b/, msg: 'git reset --hard' },
        { re: /\bgit\s+branch\s+-D\b/i, msg: 'git branch -D (force delete)' },
        { re: /\bgit\s+clean\s+-[a-z]*f[a-z]*\b/, msg: 'git clean -f' },
        { re: /\bdrop\s+(?:table|database|schema)\b/i, msg: 'DROP TABLE/DATABASE/SCHEMA' },
        { re: /\btruncate\s+table\b/i, msg: 'TRUNCATE TABLE' },
        { re: /\bdelete\s+from\s+\w+\s*(?!.*\bwhere\b)(?:;|$)/i, msg: 'DELETE FROM without WHERE' },
        { re: /\brm\s+-[rR]f?\s+\*/, msg: 'rm -rf * (unbounded wildcard)' },
      ];
      for (var j = 0; j < dangerousPatterns.length; j++) {
        if (dangerousPatterns[j].re.test(prompt)) {
          console.error('[BLOCKED] Destructive command detected: ' + dangerousPatterns[j].msg);
          console.error('[BLOCKED] This operation is irreversible. Ask user to confirm or use a safer alternative.');
          process.exit(1);
        }
      }

      // Pre-commit test gate (Tier 2/3 only)
      if (/^git\s+commit\b/.test(prompt)) {
        var tierFile = path.join(os.tmpdir(), 'claude-tier-current.json');
        var tier = 1;
        try {
          var tierData = JSON.parse(fs.readFileSync(tierFile, 'utf8'));
          if (Date.now() - tierData.ts < 30 * 60 * 1000) tier = tierData.tier;
        } catch (e) { /* no tier file, default to 1 */ }

        if (tier >= 2) {
          var testCmd = detectTestCommand(hookCwd);
          if (testCmd) {
            try {
              execSync(testCmd, { cwd: hookCwd, timeout: 60000, stdio: 'pipe' });
              console.log('[OK] Tests passed (Tier ' + tier + ' gate)');
            } catch (e) {
              console.error('[BLOCKED] Tests failed — commit blocked (Tier ' + tier + ' gate)');
              if (e.stderr) console.error(e.stderr.toString().slice(0, 500));
              process.exit(2);
            }
          }
        }
      }

      console.log('[OK] Command validated');
    },

    'post-edit': function() {
      if (session && session.metric) {
        try { session.metric('edits'); } catch (e) { /* no active session */ }
      }
      if (intelligence && intelligence.recordEdit) {
        try { intelligence.recordEdit(editFilePath); } catch (e) { /* non-fatal */ }
      }
      console.log('[OK] Edit recorded');
    },

    'session-restore': function() {
      if (session) {
        var existing = session.restore && session.restore();
        if (!existing) {
          session.start && session.start();
        }
      } else {
        console.log('[OK] Session restored: session-' + Date.now());
      }
      if (intelligence && intelligence.init) {
        try {
          var result = intelligence.init();
          if (result && result.nodes > 0) {
            console.log('[INTELLIGENCE] Loaded ' + result.nodes + ' patterns');
          }
        } catch (e) { /* non-fatal */ }
      }
    },

    'session-end': function() {
      if (intelligence && intelligence.consolidate) {
        try {
          var result = intelligence.consolidate();
          if (result && result.entries > 0) {
            console.log('[INTELLIGENCE] Consolidated: ' + result.entries + ' entries');
          }
        } catch (e) { /* non-fatal */ }
      }
      if (session && session.end) {
        session.end();
      } else {
        console.log('[OK] Session ended');
      }
    },

    'compact-manual': function() {
      console.log('[COMPACT] Preserve: current task objective, files modified, decisions made, blockers hit');
      console.log('[COMPACT] Drop: exploration results already acted on, failed approaches, verbose tool output');
      console.log('[COMPACT] Rules live in ~/.claude/rules/ — they reload automatically, no need to preserve');
    },

    'compact-auto': function() {
      console.log('[AUTO-COMPACT] Context approaching limit. Preserve: task state, file changes, next steps');
      console.log('[AUTO-COMPACT] If context exceeds 85% after compact, recommend /clear with refined prompt');
    },

    'status': function() {
      console.log('[OK] Status check');
    },
  };

  if (command && handlers[command]) {
    try { handlers[command](); }
    catch (e) { console.log('[WARN] Hook ' + command + ' error: ' + e.message); }
  } else if (command) {
    console.log('[OK] Hook: ' + command);
  } else {
    console.log('Usage: hook-handler.cjs <route|pre-bash|post-edit|session-restore|session-end|compact-manual|compact-auto|status>');
  }
}

if (process.stdin.isTTY) {
  run({});
} else {
  var input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(chunk) { input += chunk; });
  process.stdin.on('end', function() {
    var data = {};
    try { if (input) data = JSON.parse(input); } catch (e) { /* non-fatal */ }
    run(data);
  });
}
