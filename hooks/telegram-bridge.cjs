#!/usr/bin/env node
/**
 * Telegram Boss-Mode Bridge
 *
 * Sends outbound notifications to Telegram on key events. Reads config from
 * ~/.claude/telegram.json. Silently no-ops if config missing — safe to install
 * before bot is set up.
 *
 * Config file shape (~/.claude/telegram.json):
 *   {
 *     "bot_token": "123456:ABC...",
 *     "chat_id": "1234567890",
 *     "events": {
 *       "session_end": true,
 *       "self_heal_escalate": true,
 *       "tier3_milestone": true,
 *       "permission_prompt": false
 *     },
 *     "channels_api": false
 *   }
 *
 * If `channels_api: true` the bridge expects Anthropic Channels to handle
 * delivery and this hook only posts supplementary context. Otherwise it
 * calls Telegram Bot API directly.
 *
 * Usage (from another hook):
 *   echo '{"event":"session_end","title":"Tier 3 done","body":"..."}' \
 *     | node ~/.claude/hooks/telegram-bridge.cjs
 *
 * Exit codes: always 0. Never blocks the calling hook.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const CONFIG_PATH = path.join(os.homedir(), '.claude', 'telegram.json');

function readStdin() {
  try { return fs.readFileSync(0, 'utf-8'); } catch { return ''; }
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch { return null; }
}

function sendTelegram(botToken, chatId, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
    const req = https.request({
      host: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 4000,
    }, (res) => {
      res.on('data', () => {}); res.on('end', resolve);
    });
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

function formatMessage(event, title, body) {
  const host = os.hostname();
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const emoji = {
    session_end: '\u{2705}',
    self_heal_escalate: '\u{26A0}\u{FE0F}',
    tier3_milestone: '\u{1F680}',
    permission_prompt: '\u{1F510}',
  }[event] || '\u{1F4E2}';
  const lines = [
    `${emoji} *${event}*`,
    `\`${host}\` \u00b7 ${stamp}`,
    '',
    title ? `*${title}*` : '',
    body ? String(body).slice(0, 3500) : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function isPlaceholder(v) {
  if (!v || typeof v !== 'string') return true;
  return /^PASTE-|^REPLACE-|^YOUR-|^<.*>$/i.test(v);
}

async function main() {
  const cfg = loadConfig();
  if (!cfg || !cfg.bot_token || !cfg.chat_id) return;
  if (isPlaceholder(cfg.bot_token) || isPlaceholder(cfg.chat_id)) return;

  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch { return; }

  const event = payload.event || 'notification';
  if (cfg.events && cfg.events[event] === false) return;

  const message = formatMessage(event, payload.title, payload.body);
  await sendTelegram(cfg.bot_token, cfg.chat_id, message);
}

main().catch(() => {});
