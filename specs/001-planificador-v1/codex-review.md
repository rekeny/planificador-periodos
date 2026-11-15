# Codex review

- Date: 2026-11-15 09:53
- Branch: 001-planificador-v1-d2 against main
- Commit: 7bbbf37

**Changes requested: 1 BLOCKING finding, no IMPORTANT findings, 1 MINOR finding.** Reviewed `git diff main...HEAD` at `7bbbf37`, accounting for the approved D2/D3 split.

1. **BLOCKING — Returning to another form for the same team can silently reuse an already-created match.**  
   Files: [new.tsx:31](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/app/teams/[teamId]/matches/new.tsx:31), [new-match-draft.ts:165](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/state/new-match-draft.ts:165).

   Reproduced through the real routes and in-memory SQLite: open team 1’s new-match form, push another new-match form for team 1, save it, return from its grid to the first form, then press Save. Only one match exists: the first form reopens the previously created match.

   Draft ownership checks only `teamId`, so returning to the first form skips initialization and retains the second form’s cached `created` result. Subsequent saves bypass validation and persistence. This breaks RF-025/RF-082. Existing navigation tests cover different teams and miss this case.

   **Fix:** give each mounted form its own draft, or track ownership with a unique form instance identifier. On returning to a displaced form, initialize its draft and clear the unrelated saved result. Add a regression that edits fields after returning and verifies a distinct match with those values.

2. **MINOR — Current explanations still contain superseded statements.**  
   Files: [summary.md:343](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/summary.md:343), [tasks.md:834](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/tasks.md:834).

   The summary says a sixth review never happened. T053 still describes 600 points as the tablet boundary and puts landscape-phone buttons in the toolbar. Current code uses 768 points and places landscape-phone buttons in the header.

   **Fix:** update the current summary and task scenarios; explicitly label any retained earlier decisions as historical.

| Review category                                | Result                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| RF/E implementation and scope                  | Finding 1. D3 requirements remain approved deferrals; no unrelated additions found.                      |
| Constitution, layers, conventions and glossary | Finding 1 affects saving guarantees. No additional structural findings.                                  |
| Test integrity and effectiveness               | Finding 1 exposes missing coverage. No unapproved deletion, skipping or weakening found.                 |
| Security                                       | No additional findings from static inspection. Device backup and production-build checks remain pending. |
| Explanation accuracy                           | Finding 2.                                                                                               |
| Simplicity and efficiency                      | No findings.                                                                                             |

Validation: types, lint, source/configuration formatting, traceability, focused-test detection and Gitleaks passed. With Jest cache writes disabled in memory, **2,596 existing tests passed**; 25 startup tests were blocked by temporary-file permissions. The supplemental navigation regression failed as described. Full verification, coverage, mutation testing and device behaviour were not independently confirmed. No repository files were changed.
