#!/usr/bin/env node
/**
 * IRIS Context Monitor - PostToolUse hook
 * Reads context metrics from the statusline bridge file and injects
 * IRIS-specific warnings with checkpoint behavior at 25-30% remaining.
 *
 * Thresholds:
 *   > 35% remaining  → silent
 *   30-35% remaining → WARNING: wrap up current task
 *   25-30% remaining → CHECKPOINT: save state via memory-manager
 *   < 25% remaining  → CRITICAL: stop new work immediately
 *
 * Uses separate warn file from GSD monitor to avoid interference.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SILENT_THRESHOLD = 35;      // remaining > 35% → silent
const WARNING_THRESHOLD = 35;     // remaining <= 35% → warning
const CHECKPOINT_THRESHOLD = 30;  // remaining <= 30% → checkpoint
const CRITICAL_THRESHOLD = 25;    // remaining <= 25% → critical
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 5;

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;

    if (!sessionId) process.exit(0);

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    if (!fs.existsSync(metricsPath)) process.exit(0);

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) process.exit(0);

    const remaining = metrics.remaining_percentage;
    const usedPct = metrics.used_pct;

    if (remaining > WARNING_THRESHOLD) process.exit(0);

    // Separate warn file from GSD monitor
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-iris-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null, checkpointFired: false };
    let firstWarn = true;

    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        firstWarn = false;
      } catch (e) { /* corrupted, reset */ }
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    const isCritical = remaining <= CRITICAL_THRESHOLD;
    const isCheckpoint = !isCritical && remaining <= CHECKPOINT_THRESHOLD;
    const currentLevel = isCritical ? 'critical' : isCheckpoint ? 'checkpoint' : 'warning';

    // Severity escalation bypasses debounce
    const severityEscalated = (currentLevel === 'critical' && warnData.lastLevel !== 'critical')
      || (currentLevel === 'checkpoint' && warnData.lastLevel === 'warning');

    if (!firstWarn && warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;

    let message;
    if (isCritical) {
      message = `[IRIS CONTEXT CRITICAL] Usage: ${usedPct}% | Remaining: ${remaining}%. ` +
        'STOP all new work immediately. Save critical state to memory and inform the user ' +
        'that context is nearly exhausted. Summarize current progress and next steps.';
    } else if (isCheckpoint) {
      // Fire checkpoint instruction once per session
      if (!warnData.checkpointFired) {
        warnData.checkpointFired = true;
        message = `[IRIS CONTEXT CHECKPOINT] Usage: ${usedPct}% | Remaining: ${remaining}%. ` +
          'Context checkpoint triggered. Save current state NOW: ' +
          '1) Write a state summary to memory (current task, progress, pending items, key decisions). ' +
          '2) Note any files being actively modified and their state. ' +
          '3) Continue current task but do not start new complex work.';
      } else {
        message = `[IRIS CONTEXT CHECKPOINT] Usage: ${usedPct}% | Remaining: ${remaining}%. ` +
          'State already checkpointed. Wrap up current task. Do not start new complex work.';
      }
    } else {
      message = `[IRIS CONTEXT WARNING] Usage: ${usedPct}% | Remaining: ${remaining}%. ` +
        'Begin wrapping up current task. Do not start new complex work. ' +
        'Consider saving progress to memory if task is incomplete.';
    }

    fs.writeFileSync(warnPath, JSON.stringify(warnData));

    const output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    // Silent fail — never block tool execution
    process.exit(0);
  }
});
