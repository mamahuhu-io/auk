#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${1:-$(mktemp -t auk-cli-e2e-online)}"

cd "$ROOT_DIR"

echo "[verify-cli-e2e-online] Root: $ROOT_DIR"
echo "[verify-cli-e2e-online] Log:  $LOG_FILE"

echo "[verify-cli-e2e-online] Step 1/2: build @auk/cli"
pnpm --filter @auk/cli run build

echo "[verify-cli-e2e-online] Step 2/2: run CLI e2e suite"
set +e
pnpm --filter @auk/cli exec vitest run src/__tests__/e2e/commands/test.spec.ts --reporter=verbose 2>&1 | tee "$LOG_FILE"
vitest_status=${PIPESTATUS[0]}
set -e

if [ "$vitest_status" -ne 0 ]; then
  echo "[verify-cli-e2e-online] FAIL: vitest exited with status $vitest_status"
  exit "$vitest_status"
fi

SKIP_PATTERN='Skipping test after retry exhausted|Skipping snapshot test|Network error detected:'

if rg -n "$SKIP_PATTERN" "$LOG_FILE" >/dev/null 2>&1; then
  echo "[verify-cli-e2e-online] FAIL: detected degraded-network skips in e2e output"
  rg -n "$SKIP_PATTERN" "$LOG_FILE"
  exit 1
fi

echo "[verify-cli-e2e-online] PASS: no degraded-network skip markers detected"
