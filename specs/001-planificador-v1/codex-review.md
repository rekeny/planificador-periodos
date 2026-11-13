# Codex review

- Date: 2026-11-13 18:46
- Branch: 001-planificador-v1-d2 against main
- Commit: 883d584

Reviewed `git diff main...HEAD` at `883d584`. **Changes requested: four BLOCKING findings.** The approved D3 deferrals are excluded from these findings.

1. **BLOCKING — An unknown team can reuse and save another team’s abandoned draft.**  
   [new-match-draft.ts:101](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/state/new-match-draft.ts:101)

   `reset()` returns without clearing the previous team identity or fields when the requested team does not exist. The route checks only whether the ID is syntactically valid. Reproduced: reset for team A, enter unsaved text, reset for nonexistent team 9999, then `create()` successfully saves the abandoned draft under team A. This breaks RF-082 and the planned not-found handling.

   **Fix:** invalidate the draft before loading, handle missing teams and read failures explicitly, and render `NotFound` unless initialization succeeds. Add a regression test covering an abandoned draft followed by an unknown-team route.

2. **BLOCKING — Grid sizing can disable scrolling while rows are clipped.**  
   [match-grid.tsx:35](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/ui/grid/match-grid.tsx:35), [match screen:114](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/app/matches/[matchId]/index.tsx:114)

   Layout uses the entire window height, but the screen never supplies `chromeHeight`; it also omits the call-up button and phone toolbar. For a 1024 × 768 tablet with 12 players, a 44-point header and a 24-point legend, it produces **716 points of grid content with vertical scrolling disabled**, although the navigation header and call-up button substantially reduce the viewport. Lower rows become unreachable. The isolated layout tests supply heights that the real screen does not supply. RF-076–RF-081 therefore are not satisfied.

   **Fix:** measure the actual grid viewport and derive sizes and scrolling from it. Adjust the surrounding controls and warning layout to preserve the tablet’s 12-row guarantee. Test the assembled screen with realistic measured heights.

3. **BLOCKING — A failure after a committed write leaves saved data and published state inconsistent.**  
   [squad-store.ts:118](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/state/squad-store.ts:118), [match-session-marks.ts:40](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/state/match-session-marks.ts:40)

   Actions perform fallible reads after their repository transaction has committed. Reproduced: `createTeam()` returns `saveFailed` after `listTeams()` throws, but one team is already stored; retrying creates a duplicate. A tap followed by a failing `listPlayers()` saves the mark, throws, leaves the displayed grid empty, records no Undo entry and leaves `saveFailed` false. Call-up publication has the same pattern. This contradicts RF-085 and the documented save/publish guarantees.

   **Fix:** prepare publication before committing, or include all fallible preparation in the transaction and publish only after success. Do not merely catch the post-commit exception. Add tests that fail the reads following successful writes, including retry and Undo assertions.

4. **BLOCKING — Players created from a match do not appear when returning to the team screen.**  
   [team screen:21](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/app/teams/[teamId]/index.tsx:21)

   The team loads only on mount. Creating a player from the match updates SQLite and the match session, while the mounted team screen retains its old squad store. Reproduced: SQLite contains two players sharing number 7, but the squad store still publishes one player and no duplicate warning. Returning through Back preserves that stale screen. This breaks RF-035 and RF-069.

   **Fix:** refresh the team on focus or update its store after successful player creation. Add a complete team → match → new player → Back-to-team test checking both the player and duplicate warning.

5. **IMPORTANT — Device-dependent tasks are marked complete without their required results.**  
   [tasks.md:881](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/tasks.md:881)

   T036, T048, T056 and T060 are ticked although their completion criteria require successful platform runs, and their reports explicitly say those runs never happened. Static YAML checks do not establish native picker, interruption, scrolling or performance behavior.

   **Fix:** keep those tasks pending until the required outputs are recorded, or explicitly revise their completion criteria through the approved workflow.

6. **MINOR — The summary reports a nonexistent missing text.**  
   [summary.md:311](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/summary.md:311)

   It says the spec lacks `grid.addOvertime`, but that row exists at `spec.md:500`.

   **Fix:** remove the stale claim from the summary and corresponding task report.

| Requested category                             | Result                                                                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF/E implementation, tests and scope           | Findings 1–5. The full spec remains incomplete through approved D3 deferrals. No unrelated product additions found.                                                           |
| Constitution, layers, conventions and glossary | Findings 1–4 affect specified behavior and persistence guarantees. No additional findings.                                                                                    |
| Test integrity and effectiveness               | Findings 1–5 expose coverage gaps. No skipped tests found. The deleted placeholder home-screen test has recorded authorization in T033.                                       |
| Security                                       | No additional findings in application network use, logging, parameterized queries or dependency justification. Device backup and release-permission checks remain unverified. |
| Explanation accuracy                           | Finding 6; the persistence guarantees are also overstated given finding 3.                                                                                                    |
| Simplicity and efficiency                      | No additional findings.                                                                                                                                                       |

Validation passed: TypeScript, ESLint, traceability, focused-test checks, and **1,166 domain cases through an in-memory runner**. The state reproductions used real in-memory SQLite. Standard Jest was blocked by cache writes in the read-only environment; coverage, Stryker, full verification and device behavior were not independently confirmed.
