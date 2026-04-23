#!/usr/bin/env node
/**
 * Universal Code Quality Gate — PostToolUse hook
 *
 * Two modes:
 *   1. Critical-severity block: scans the edited file for hardcoded secrets,
 *      eval-on-user-input, and SQL concat patterns. If found (with low false
 *      positive rate via placeholder/comment/test skips), exits 2 so the model
 *      rewrites the file.
 *   2. Advisory: emits SOLID + language checklist. Never exits non-zero.
 */

var fs = require('fs');

var LANG_MAP = {
  '.py':   'python',
  '.ts':   'typescript', '.tsx': 'typescript',
  '.js':   'javascript', '.jsx': 'javascript',
  '.php':  'php',
  '.java': 'java',
  '.cs':   'csharp',
  '.go':   'go',
  '.rs':   'rust',
  '.rb':   'ruby',
  '.kt':   'kotlin', '.kts': 'kotlin',
  '.c':    'cpp', '.cpp': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
};

var SKIP_EXTS = [
  '.md', '.json', '.yaml', '.yml', '.toml', '.env', '.txt', '.csv',
  '.lock', '.xml', '.html', '.css', '.scss', '.svg', '.png', '.jpg',
  '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map',
  '.gitignore', '.dockerignore', '.editorconfig',
];

var LANG_CHECKS = {
  python:     '[PY] KISS | SRP | Composition>Inheritance | Layered arch | Functions 20-50 lines',
  typescript: '[TS] No `any` | Zod at boundaries | Named exports | async/await',
  javascript: '[JS] const default | Early returns | Validate at boundaries',
  php:        '[PHP] strict_types | PSR-12 | FormRequest validation | Parameterized queries',
  java:       '[JAVA] Records for DTOs | Constructor injection | Package-by-feature',
  csharp:     '[CS] Nullable enabled | sealed default | async all the way | Options pattern',
  go:         '[GO] Error handling (no silent swallow) | Small interfaces | Table-driven tests',
  rust:       '[RS] Ownership clear | No unwrap in prod | Error enums',
  ruby:       '[RB] Small methods | Composition | Duck typing with confidence',
  kotlin:     '[KT] Data classes for DTOs | Sealed classes | Null safety',
  cpp:        '[C/C++] RAII | const correctness | Smart pointers | Bounds checking',
};

// Critical-severity patterns — high confidence, low false-positive rate.
var CRITICAL_PATTERNS = [
  { id: 'aws-access-key', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, msg: 'AWS access key id' },
  { id: 'private-key',    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, msg: 'Private key material' },
  { id: 'openai-key',     re: /\bsk-(?:live|test|proj)[-_][a-zA-Z0-9]{20,}/, msg: 'OpenAI-style API key' },
  { id: 'anthropic-key',  re: /\bsk-ant-[a-zA-Z0-9\-_]{32,}/, msg: 'Anthropic API key' },
  { id: 'stripe-key',     re: /\b(?:sk|rk|pk)_live_[a-zA-Z0-9]{24,}/, msg: 'Stripe live key' },
  { id: 'github-token',   re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}/, msg: 'GitHub personal access token' },
  { id: 'generic-secret', re: /\b(?:api[_-]?key|secret|password|passwd|token|auth[_-]?token)\s*[:=]\s*['"]([A-Za-z0-9+/=_\-]{24,})['"]/i, msg: 'Hardcoded secret/credential', needsPlaceholderCheck: true },
  { id: 'eval-user-input', re: /\beval\s*\(\s*(?:req|request|input|user[_]?input|body|params|query|stdin)\b/i, msg: 'eval() on user input' },
  { id: 'sql-interpolated', re: /(?:execute|query|raw|prepare)\s*\(\s*[`"'][^`"']*\$\{[^}]*(?:req|request|input|user[_]?input|body|params|query)/i, msg: 'SQL query with interpolated user input' },
];

var PLACEHOLDER_HINT = /\b(?:paste|your|here|replace|example|dummy|fake|placeholder|xxx|todo|change|example\.com|changeme|test[_-]?key|mock[_-]?key)\b/i;

function getExt(filePath) {
  var dot = filePath.lastIndexOf('.');
  return dot >= 0 ? filePath.substring(dot).toLowerCase() : '';
}

function isTestOrExampleFile(filePath) {
  var lower = filePath.toLowerCase();
  if (/\.env\.(example|sample|template|local)/.test(lower)) return true;
  if (/\/(?:tests?|__tests__|fixtures?|mocks?|examples?|spec)\//.test(lower)) return true;
  if (/\.(test|spec|fixture|mock)\.[a-z]+$/.test(lower)) return true;
  return false;
}

function isCommentLine(line) {
  var t = line.trim();
  return /^(?:#|\/\/|\/\*|\*|;|--)/.test(t);
}

function scanCritical(filePath, content) {
  if (isTestOrExampleFile(filePath)) return null;
  var lines = content.split('\n');
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    if (!line || isCommentLine(line)) continue;
    for (var pi = 0; pi < CRITICAL_PATTERNS.length; pi++) {
      var p = CRITICAL_PATTERNS[pi];
      if (!p.re.test(line)) continue;
      if (p.needsPlaceholderCheck && PLACEHOLDER_HINT.test(line)) continue;
      return {
        id: p.id,
        msg: p.msg,
        line: li + 1,
        excerpt: line.trim().slice(0, 100),
      };
    }
  }
  return null;
}

function check(data) {
  var filePath = '';

  if (data.tool_input && data.tool_input.file_path) {
    filePath = data.tool_input.file_path;
  } else if (process.env.TOOL_INPUT_file_path) {
    filePath = process.env.TOOL_INPUT_file_path;
  }

  if (!filePath) return;

  var ext = getExt(filePath);

  for (var i = 0; i < SKIP_EXTS.length; i++) {
    if (ext === SKIP_EXTS[i]) return;
  }

  var lang = LANG_MAP[ext];
  if (!lang) return;

  // Critical-severity block: scan file content if readable
  try {
    if (fs.existsSync(filePath)) {
      var content = fs.readFileSync(filePath, 'utf-8');
      var hit = scanCritical(filePath, content);
      if (hit) {
        var errLines = [
          '[CRITICAL] ' + hit.msg + ' detected in ' + filePath + ':' + hit.line,
          '  Pattern id: ' + hit.id,
          '  Line: ' + hit.excerpt,
          '  Action: remove the literal value. Use an environment variable or secret manager.',
          '  If this is a false positive, mark the value with a placeholder hint (e.g. EXAMPLE, TEST_KEY) or move to a test fixture path.',
        ];
        process.stderr.write(errLines.join('\n') + '\n');
        process.exit(2);
      }
    }
  } catch (e) { /* read failure is non-fatal */ }

  var name = lang.charAt(0).toUpperCase() + lang.slice(1);
  var lines = [
    '[QUALITY] ' + name + ' file edited: ' + filePath,
    '[SOLID] Verify:',
    '  S: Single responsibility — one reason to change per class/function?',
    '  O: Open for extension, closed for modification?',
    '  L: Subtypes substitutable for base types?',
    '  I: No fat interfaces — clients depend only on what they use?',
    '  D: Depend on abstractions, not concretions?',
    '[SIMPLICITY] KISS | YAGNI | Rule of Three (no premature abstraction)',
    '[PATTERNS] Functions <30 lines | Max 3 indent levels | Max 4 params',
  ];

  if (LANG_CHECKS[lang]) {
    lines.push(LANG_CHECKS[lang]);
  }

  console.log(lines.join('\n'));
}

if (process.stdin.isTTY) {
  check({});
} else {
  var input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(chunk) { input += chunk; });
  process.stdin.on('end', function() {
    var data = {};
    try { if (input) data = JSON.parse(input); } catch (e) { /* ignore */ }
    check(data);
  });
}
