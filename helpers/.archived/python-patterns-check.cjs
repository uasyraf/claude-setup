#!/usr/bin/env node
/**
 * Python Design Patterns Post-Edit Hook
 * Outputs a verification reminder when .py files are edited.
 * Non-blocking — always exits 0.
 */

var input = '';

function check(data) {
  var filePath = '';

  if (data.tool_input && data.tool_input.file_path) {
    filePath = data.tool_input.file_path;
  } else if (process.env.TOOL_INPUT_file_path) {
    filePath = process.env.TOOL_INPUT_file_path;
  }

  if (filePath && filePath.endsWith('.py')) {
    console.log('[PATTERN] Python file edited: ' + filePath);
    console.log('[PATTERN] Verify against python-design-patterns:');
    console.log('  - KISS: Is this the simplest solution?');
    console.log('  - SRP: Does each function/class have one reason to change?');
    console.log('  - Composition > Inheritance: Are you combining objects, not extending?');
    console.log('  - Rule of Three: No premature abstraction?');
    console.log('  - Layered: Repository → Service → Handler separation maintained?');
    console.log('  - No I/O mixed with business logic?');
    console.log('  - Functions under 50 lines, single purpose?');
  }
}

if (process.stdin.isTTY) {
  check({});
} else {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(chunk) { input += chunk; });
  process.stdin.on('end', function() {
    var data = {};
    try { if (input) data = JSON.parse(input); } catch (e) { /* ignore */ }
    check(data);
  });
}
