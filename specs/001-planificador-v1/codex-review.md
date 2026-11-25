# Codex review

- Date: 2026-11-25 09:36
- Branch: 001-planificador-v1-d3 against origin/main
- Commit: 5793d2b

Reviewed `git diff origin/main...HEAD` through `3048082`. **Two BLOCKING findings prevent approval.**

1. **BLOCKING — Deleting a match can leave its deleted grid open.**  
   [match-details-actions.tsx:48](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/ui/match-details-actions.tsx:48)  
   Open `/matches/1` directly, open Edit, then confirm deletion. `dismiss(2)` retains the root grid, so it never unmounts and its session remains open. A stack containing two details screens also leaves the deleted grid behind. This breaks RF-029.  
   **Fix:** explicitly close the session and remove every route belonging to the deleted match, with a list fallback. Add regressions for both stack shapes.

2. **BLOCKING — A retained session can add a deactivated player.**  
   [squad-player-actions.ts:107](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/state/squad-player-actions.ts:107)  
   Open a match while a player is active and outside its call-up. Push the player’s edit route, deactivate them, then return. The cached `playersToAdd` still offers them; `addToCallUp` checks their current existence but ignores `isActive`, so adding succeeds. A retained new-match draft also saves its stale selection. This violates RF-023 and RF-032. The sequence was reproduced against the migrated SQLite test database.  
   **Fix:** refresh candidates without clearing Undo or form edits, and revalidate current activity before adding players or creating a match. Test deactivation **after** opening the session or draft.

3. **IMPORTANT — Team deletion can strand the app on a deleted root route.**  
   [edit.tsx:39](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/src/app/teams/[teamId]/edit.tsx:39)  
   Open `/teams/1` directly, press Edit, then delete. `canDismiss()` is true, but `dismissAll()` retains `/teams/1`, which becomes a root NotFound screen without a previous screen. The planned return to the teams list does not happen.  
   **Fix:** ensure deletion explicitly ends at `/`, removing the deleted team’s routes. Add a regression starting at the team route rather than its edit form.

4. **MINOR — The security report incorrectly claims double confirmation is unguarded.**  
   [review.md:1681](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-periodos-cont-57813b/specs/001-planificador-v1/review.md:1681)  
   SEC-D3-1 overlooks `ConfirmDialog`’s synchronous `confirmed` ref. An existing test already checks that two immediate confirmation presses delete once.  
   **Fix:** correct the finding and associated security prose; describe any additional handler guard as optional defense.

For the remaining requested categories:

- **Scope:** no additions outside the approved spec found. Device acceptance checks remain explicitly pending.
- **Architecture, constitution, conventions and glossary:** no additional findings.
- **Tests:** no deleted, skipped or weakened assertions found. The missing regression sequences are identified above.
- **Security:** no additional findings involving network calls, player-data logs, parameterized queries, dependencies or permissions.
- **Explanations:** the correction above is required.
- **Simplicity, clarity and efficiency:** no additional findings.

TypeScript, ESLint, traceability, focused/skipped-test checks and final formatting checks passed. Installed Expo Router reducer checks confirmed the navigation outcomes. Jest was blocked by cache-write permissions; full verification and device checks were not rerun. No files were changed.
