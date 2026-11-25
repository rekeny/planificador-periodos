# Codex review

- Date: 2026-11-25 15:20
- Branch: 001-planificador-v1-d3 against 866d988
- Commit: 82fef27

**Not approved: 2 BLOCKING, 0 IMPORTANT, 1 MINOR.** Reviewed `git diff 866d988...HEAD` at `82fef27`.

1. **BLOCKING · RF-052 — Long-pressing an empty cell marks it on release.**  
   [grid-cell.tsx:44](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/ui/grid/grid-cell.tsx:44) disables the long-press gesture for empty cells. Consequently, `longPressed` stays false and the Pressable’s release calls `onTapCell`. RF-052 requires no change.

   The existing empty-cell test drives only the gesture; it omits the Pressable’s release. An additional regression executed entirely in memory reproduces the unexpected tap.

   **Fix:** consume long presses on every cell, suppress the subsequent tap, and open the menu only for marked cells. Test the complete press–hold–release sequence.

2. **BLOCKING · RF-076 — Question dialogs do not support landscape on iPhone.**  
   [choice-dialog-question.tsx:56](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/ui/choice-dialog-question.tsx:56) omits `supportedOrientations`. The installed React Native implementation defaults to portrait on iPhone. Changing mocked window dimensions in Jest does not exercise this native restriction.

   **Fix:** explicitly support portrait and landscape in the dialog modes, add a configuration regression, and verify opening and rotating each dialog on iPhone.

3. **MINOR · Incorrect file attribution in the implementation explanation.**  
   [summary.md:840](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/specs/001-planificador-v1/summary.md:840) attributes details editing, deletion and format changes to `match-list-repository.ts`; that file implements only lists.

   **Fix:** attribute those operations to `match-repository.ts`.

| Review category                                | Result                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| RF/E implementation, coverage and scope        | Findings 1–2. No unrelated feature additions found.                                                                           |
| Constitution, layers, conventions and glossary | No additional findings.                                                                                                       |
| Test integrity                                 | Findings 1–2 expose coverage gaps. No deleted, skipped or weakened assertions found.                                          |
| Security                                       | No findings: changed queries are parameterised; no new network calls, player-data logging, dependencies or permissions found. |
| Explanations and reports                       | Finding 3.                                                                                                                    |
| Simplicity and efficiency                      | No findings.                                                                                                                  |

TypeScript, ESLint, traceability and focused/skipped-test checks passed. Selected runs passed 605 domain/data/state tests and 48 focused checks, with overlapping selections; four session properties also passed. The additional RF-052 regression failed as described. Jest cache writes were disabled for this read-only environment. Full verification, mutation testing and device checks were not rerun. No repository files were changed by this review.
