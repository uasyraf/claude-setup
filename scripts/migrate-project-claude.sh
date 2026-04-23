#!/usr/bin/env bash
# migrate-project-claude.sh
# Helper to migrate <project>/CLAUDE.md to the business-only template without
# losing content. Produces a reviewable diff; never mutates without -y.
#
# Usage:
#   bash ~/.claude/scripts/migrate-project-claude.sh /path/to/project        # dry-run
#   bash ~/.claude/scripts/migrate-project-claude.sh -y /path/to/project     # apply

set -euo pipefail

APPLY=0
if [[ "${1:-}" == "-y" ]]; then APPLY=1; shift; fi

PROJECT="${1:?usage: migrate-project-claude.sh [-y] <project-dir>}"
PROJECT="$(realpath "$PROJECT")"
CLAUDE_MD="$PROJECT/CLAUDE.md"
TEMPLATE="$HOME/.claude/templates/project-claude.md"
BACKUP_DIR="$HOME/.claude/backups/project-claude-$(date +%Y%m%d)"

if [[ ! -f "$CLAUDE_MD" ]]; then
  echo "No CLAUDE.md at $CLAUDE_MD — nothing to migrate"; exit 0
fi

mkdir -p "$BACKUP_DIR"
REL_NAME="$(basename "$PROJECT").CLAUDE.md"
cp "$CLAUDE_MD" "$BACKUP_DIR/$REL_NAME"
echo "Backup -> $BACKUP_DIR/$REL_NAME"

echo ""
echo "=== Current $CLAUDE_MD ($(wc -l < "$CLAUDE_MD") lines) ==="
head -40 "$CLAUDE_MD"
echo ""
echo "=== Template ($(wc -l < "$TEMPLATE") lines) ==="
head -20 "$TEMPLATE"
echo ""
echo "=== Heuristic: lines that look global (should be removed) ==="
grep -nE "tier|agent|explorer|planner|complexity router|team|hook|skill|python|typescript|javascript|java|c#|php" "$CLAUDE_MD" | head -20 || true

if [[ $APPLY -eq 0 ]]; then
  echo ""
  echo "Dry-run complete. Review the above, then apply with:"
  echo "  bash $0 -y $PROJECT"
  exit 0
fi

echo ""
echo "Applying template (original preserved in backup)..."
cp "$TEMPLATE" "$CLAUDE_MD"
echo "Done. Edit $CLAUDE_MD to paste back any genuine domain/business content."
echo "Backup: $BACKUP_DIR/$REL_NAME"
