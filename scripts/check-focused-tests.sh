#!/usr/bin/env bash
# Fails when a test file leaves a focused or skipped test behind.
# Usage: scripts/check-focused-tests.sh [dir...]   (default: src tests)
# Exit codes: 0 nothing found, 1 something found (lines are printed), 2 the check itself could not run.
#
# Why two anchored patterns and not a bare search for the words `fit` or `xit`: those words appear
# in test titles ("4 periods fit at 375 pt"), strings and comments, and a check that cries wolf gets
# switched off. Prettier puts every test call on its own line, so pattern 1 only looks at the start
# of a line; pattern 2 catches a skipped or focused function used as a value.
#
# Accepted gap: a call after other code on the same line, such as `if (x) it.only(...)`, is not
# found. Matching it would also match titles and comments again, and Prettier never produces it.
#
# Only POSIX extended syntax is used so the same script runs with the macOS (BSD) grep and bash 3.2
# and with the GNU grep of Linux CI.
set -uo pipefail

# Go to the repository root first, as verify.sh does, so the result never depends on the caller's folder.
cd "$(dirname "$0")/.." || exit 2

# Pattern 1: a call at the start of a line, with an optional generic and a backtick for tagged-template tables.
PATTERN_CALL='^[[:space:]]*((it|test|describe)(\.[A-Za-z]+)*\.(only|skip)|x(it|test|describe)|f(it|test|describe))(\.[A-Za-z]+)*(<[^>]*>)?[[:space:]]*[(`]'
# Pattern 2: a skipped or focused function used as a value, as in `const d = CI ? describe : describe.skip;`.
PATTERN_VALUE='[?:=(,][[:space:]]*(it|test|describe)(\.[A-Za-z]+)*\.(only|skip)([^A-Za-z0-9_]|$)'

if [ "$#" -eq 0 ]; then
  set -- src tests
fi

# Validate every argument before searching, so a typo is never hidden by a clean folder.
# Folders are kept in a positional list (no arrays) so names with spaces survive in bash 3.2.
dirs=()
for dir in "$@"; do
  if [ -z "$dir" ]; then
    echo "check-focused-tests.sh: empty folder argument." >&2
    exit 2
  fi
  # Strip trailing slashes so "src/" and "src" count as the same folder.
  while [ "${#dir}" -gt 1 ] && [ "${dir%/}" != "$dir" ]; do
    dir="${dir%/}"
  done
  if [ ! -d "$dir" ]; then
    echo "check-focused-tests.sh: '$dir' is not a folder." >&2
    exit 2
  fi
  seen=0
  if [ "${#dirs[@]}" -gt 0 ]; then
    for known in "${dirs[@]}"; do
      if [ "$known" = "$dir" ]; then seen=1; fi
    done
  fi
  if [ "$seen" -eq 0 ]; then dirs+=("$dir"); fi
done

# grep exits 1 for "no match" and above 1 for a real failure; only the second must stop the check.
status=0
found=$(grep -rEn --include='*.test.ts' --include='*.test.tsx' \
  -e "$PATTERN_CALL" -e "$PATTERN_VALUE" -- "${dirs[@]}") || status=$?

if [ "$status" -gt 1 ]; then
  echo "check-focused-tests.sh: grep failed (exit $status); the check did not run." >&2
  exit 2
fi
if [ "$status" -eq 0 ]; then
  printf '%s\n' "$found"
  exit 1
fi
exit 0
