#!/usr/bin/env bash
# Single verification command. Agents run it after every task and CI runs it on every pull request.
# Every step must pass. Set FORCE_MUTATION=1 to run mutation testing without domain changes.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing tool: $1. Install it with: $2" >&2
    exit 1
  fi
}

domain_has_code() {
  [ -d src/domain ] && [ -n "$(find src/domain -type f \( -name '*.ts' -o -name '*.tsx' \) \
    ! -name '*.test.ts' ! -name '*.test.tsx' -print -quit)" ]
}

domain_changed() {
  local base changes=""
  base="$(git merge-base HEAD origin/main 2>/dev/null || true)"
  # Without a base, or when HEAD is the base (push to main), we cannot tell what changed:
  # run mutation testing to be safe.
  if [ -z "$base" ] || [ "$base" = "$(git rev-parse HEAD)" ]; then return 0; fi
  changes="$(git diff --name-only "$base" -- src/domain)"
  changes="${changes}$(git status --porcelain -- src/domain)"
  [ -n "$changes" ]
}

require_tool gitleaks "brew install gitleaks"
require_tool osv-scanner "brew install osv-scanner"
require_tool semgrep "brew install semgrep"

step "Types"
npx tsc --noEmit

step "Lint"
npx eslint . --max-warnings 0

step "Format"
npx prettier --check .

step "Focused or skipped tests"
if grep -rEn --include='*.test.ts' --include='*.test.tsx' \
  '\b(it|test|describe)(\.[A-Za-z]+)*\.(only|skip)\b|\b(xit|xtest|xdescribe|fit|ftest|fdescribe)\b' src tests 2>/dev/null; then
  echo "Remove .only, .skip, x-prefixed and f-prefixed tests before finishing." >&2
  exit 1
fi

step "Tests and coverage"
npx jest --ci --coverage

step "Traceability"
node scripts/check-traceability.mjs

if [ -f drizzle.config.ts ]; then
  step "Database schema and migrations"
  npx drizzle-kit check
fi

step "Expo Doctor"
npx expo-doctor

if domain_has_code && { [ "${FORCE_MUTATION:-0}" = "1" ] || domain_changed; }; then
  step "Mutation testing"
  npx stryker run
else
  step "Mutation testing (skipped: no domain changes)"
fi

step "Dependencies"
npm audit --omit=dev --audit-level=high
osv-scanner scan source --lockfile=package-lock.json

step "Secrets"
gitleaks git --redact --no-banner

step "Static analysis"
semgrep scan --config p/typescript --config p/react --config p/secrets --error --metrics=off --quiet src scripts

printf '\n\033[1;32m✔ All checks passed\033[0m\n'
