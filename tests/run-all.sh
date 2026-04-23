#!/usr/bin/env bash
#
# Runs every unit test under ~/.claude/tests/unit/ and reports pass/fail.
# Exits 1 on any failure. No deps — plain node + bash.
#
# Not covered here (offline-only harness):
#   - hooks/stop-telegram.cjs      (requires live bot)
#   - hooks/telegram-bridge.cjs    (requires live bot)
#   - helpers/auto-memory-hook.mjs (remote memory sync)

set -u
cd "$(dirname "$0")"

pass=0
fail=0
failed=()

for t in unit/*.cjs; do
  if node "$t"; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    failed+=("$t")
  fi
done

echo
echo "$pass/$((pass + fail)) passed"

if [[ $fail -gt 0 ]]; then
  echo "Failed:"
  for f in "${failed[@]}"; do echo "  - $f"; done
  exit 1
fi
