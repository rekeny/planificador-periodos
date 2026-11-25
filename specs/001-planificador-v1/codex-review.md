# Codex review

- Date: 2026-11-25 20:00
- Branch: 001-planificador-v1-d3 against 866d988
- Commit: 9c3675f

Reviewed `git diff 866d988...HEAD`: **0 BLOCKING, 1 IMPORTANT, 1 MINOR finding.**

1. **IMPORTANT — Present questions only from the focused grid.**  
   [match-questions.tsx:109](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/ui/grid/match-questions.tsx:109)  
   The stack `/ → /matches/1 → /matches → /matches/1` keeps two grids for the same match mounted. Both observe the shared `pending` question and make their Modal visible. Android presents these as separate native dialog windows. A component regression confirmed **two visible Modals instead of one**.

   **Fix:** gate question presentation by route focus while retaining the session and Undo history. Add a regression using the existing repeated-match stack fixture.

2. **MINOR — Update the deletion explanation to describe the final implementation.**  
   [summary.md:859](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/specs/001-planificador-v1/summary.md:859)  
   The main explanation still says match deletion uses `router.dismiss(2)`; the adjacent team-deletion explanation also describes superseded logic. Current code uses `leaveDeletedMatch` and `leaveDeletedTeam`.

   **Fix:** rewrite these paragraphs around the helpers’ current stack cleanup and fallback behavior.

| Review category                                | Result                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| RF/E implementation, testing and scope         | Finding 1; all RF/E IDs have test references. No unrelated additions found.                                 |
| Constitution, layers, conventions and glossary | No findings.                                                                                                |
| Test integrity                                 | No deleted, skipped or weakened assertions found. Finding 1 needs regression coverage.                      |
| Security                                       | No findings: parameterized queries; no new network calls, player-data logging, dependencies or permissions. |
| Explanations and reports                       | Finding 2.                                                                                                  |
| Simplicity and efficiency                      | No findings.                                                                                                |

TypeScript, ESLint, traceability and focused/skipped-test checks passed. **113 selected domain/data/state tests passed**, with Jest cache persistence disabled in memory. Full verification and device tests were not rerun; GitHub was unreachable. No repository files were changed.

Historical task/report content was inspected selectively; the requested complete prerequisite reading was not completed.
