#!/usr/bin/env node
/**
 * Universal Code Quality Gate — PostToolUse hook
 * Outputs SOLID + language-specific checklist when code files are edited.
 * Non-blocking — always exits 0.
 */

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

function getExt(filePath) {
  var dot = filePath.lastIndexOf('.');
  return dot >= 0 ? filePath.substring(dot).toLowerCase() : '';
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

  // Skip non-code files
  for (var i = 0; i < SKIP_EXTS.length; i++) {
    if (ext === SKIP_EXTS[i]) return;
  }

  var lang = LANG_MAP[ext];
  if (!lang) return; // Unknown extension — skip silently

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
