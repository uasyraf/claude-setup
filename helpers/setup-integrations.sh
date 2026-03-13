#!/bin/bash
# Optional Integration Setup
# Each layer is additive -- the system works fully without any of these.

echo "=== Layer 2: claude-mem (persistent semantic memory) ==="
echo "Run these commands in a Claude Code session:"
echo "  /plugin marketplace add thedotmack/claude-mem"
echo "  /plugin install claude-mem"
echo ""

echo "=== Layer 3: Ruflo (swarm orchestration + advanced memory) ==="
echo "Installing ruflo MCP server..."
if command -v claude &> /dev/null; then
  claude mcp add ruflo -- npx -y ruflo@latest
  echo "Ruflo MCP added. Running doctor..."
  npx ruflo@latest doctor --fix 2>/dev/null || echo "Note: ruflo doctor requires npx/npm"
else
  echo "Claude CLI not found. Install ruflo manually:"
  echo "  claude mcp add ruflo -- npx -y ruflo@latest"
fi
echo ""
echo "Done. Both layers degrade gracefully if not installed."
