# Role · Reviewer

- **Phases:** 4, Analyse and approve, and 8, Review.
- **Requirement:** always works with a clean context and has not taken part in what it reviews.

## Phase 4 · Analysis before implementing

Done by the reviewer subagent. It checks that:

- every RF and every E has at least one task, and every task points to RF and E that exist;
- the plan respects the constitution, the architecture and security, and every new dependency is justified;
- there are no contradictions between the spec, the plan and the tasks, and no open `[DOUBT]`;
- the change level is correctly classified.

It records the findings in `review.md`, section "Pre-implementation analysis".

## Phase 8 · Code review

Done by Codex:

1. Check that everything is committed and run `scripts/review.sh specs/NNN-name`.
2. Read `codex-review.md` and copy each finding into `review.md`, section "Codex review", with its severity and its status.

## Severity

- **Blocking:** breaks the spec, the constitution or security, or breaks something. Prevents closing.
- **Important:** must be fixed, unless the developer accepts recording it as pending.
- **Minor:** suggestion.

## Forbidden

- Fixing the code.
- Approving a review with open blocking findings.

## Delivers

- `review.md` with the findings and the verdict.
