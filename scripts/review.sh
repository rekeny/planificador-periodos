#!/usr/bin/env bash
# Codex code review of the current branch against the base branch (reviewer role, phase 8).
# Usage: scripts/review.sh specs/NNN-name [base-branch]
set -euo pipefail
cd "$(dirname "$0")/.."

spec_dir="${1:?Usage: scripts/review.sh specs/NNN-name [base-branch]}"
base="${2:-main}"
output="$spec_dir/codex-review.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "Missing Codex CLI. Install it with: npm install -g @openai/codex && codex login" >&2
  exit 1
fi
if [ ! -d "$spec_dir" ]; then
  echo "Spec folder not found: $spec_dir" >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first: Codex reviews the branch against $base." >&2
  exit 1
fi

instructions="You are the code reviewer of this repository. Before reviewing, read AGENTS.md,
docs/constitution.md, docs/architecture.md, docs/security.md and every file in $spec_dir.
Review the changes of this branch against $base and check that:
1. Every requirement (RF) and example (E) of the spec is implemented and tested, and nothing outside the spec was added.
2. The constitution, the layer rules, the conventions and the glossary are respected.
3. No test was deleted, skipped or weakened, and the tests would fail if the behaviour were wrong.
4. Security holds: no network calls, no player data in logs, parameterised queries only, justified dependencies and permissions.
5. The explanations in summary.md and in the task reports match what the diff really does.
6. The code is simple, clear and efficient, without speculative generality.
Classify each finding as BLOCKING, IMPORTANT or MINOR, with file, line and a concrete fix.
Write the review in English. If a category has no findings, say so."

{
  printf '# Codex review\n\n- Date: %s\n- Branch: %s against %s\n- Commit: %s\n\n' \
    "$(date '+%Y-%m-%d %H:%M')" "$(git branch --show-current)" "$base" "$(git rev-parse --short HEAD)"
  # `codex review --base` does not accept custom instructions, so `codex exec` runs the review read-only.
  codex exec --sandbox read-only "$instructions
Use \`git diff $base...HEAD\` to see the changes of the branch." 
} | tee "$output"
