# Codex review

- Date: 2026-11-14 13:56
- Branch: 001-planificador-v1-d2 against main
- Commit: 932978f

**Changes requested: 2 BLOCKING, 1 IMPORTANT, 1 MINOR.**

Reviewed `git diff main...HEAD` at `932978f`, treating the documented D3 deferrals as approved scope exclusions.

1. **BLOCKING — Android native UI still follows the device language.**  
   **File:** `src/ui/date-time-field-android.tsx:36`  
   Translating the dialog buttons leaves calendar headings, month/day names and native controls in the device language. The installed implementation reads `LocalConfiguration.current.locales[0]`; the picker’s `locale` property is [iOS-only](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/datetimepicker/#locale). Fourth-run finding 3 therefore remains partially unresolved against RF-012 and constitution principle 7.  
   **Fix:** configure Spanish localization for the Android native controls and verify both pickers on an English-configured device. Tests must cover more than button labels.

2. **BLOCKING — Returning to team forms shows a false not-found state.**  
   **Files:** `src/app/teams/[teamId]/players/new.tsx:19`, `src/app/teams/[teamId]/edit.tsx:19`  
   Both routes load their team only once while sharing the squad store. Reproduced for each: open team 1’s form, push team 2’s equivalent form, then Back. Team 1’s route displays «No se ha encontrado» because the store still belongs to team 2. Two additional navigation tests failed on this assertion. This breaks RF-013/RF-016.  
   **Fix:** restore or isolate each form’s team state when focus returns, and validate route ownership when saving. Add both navigation regressions.

3. **IMPORTANT — The three-button toolbar exceeds the reference phone width.**  
   **File:** `src/ui/grid/grid-toolbar.tsx:64`  
   After adding an overtime, the unwrapped row contains all three Spanish labels, fixed padding and gaps. Its natural width is approximately 400 points, exceeding the supported 375-point portrait viewport. The final action extends beyond the screen; existing tests check button presence without checking bounds.  
   **Fix:** allow wrapping or distribute available width between responsive buttons. Verify all labels and touch areas at 375 points with an overtime present.

4. **MINOR — Current explanations still contradict the implementation.**  
   **Files:** `specs/001-planificador-v1/summary.md:158`, `plan.md:680`, `tasks.md:882`  
   The summary still says errors float on match/call-up screens, while they now use normal flow. The plan and T084 still prohibit focus events, while `useOwnSession` uses `useFocusEffect`.  
   **Fix:** update these passages to describe the final banner placement and ownership-guarded session restoration.

Category results:

- **RF/E coverage and scope:** findings 1–3. Full v1 remains incomplete through approved D3 deferrals; no unrelated product additions found.
- **Constitution, layers, conventions and glossary:** finding 1 violates the Spanish-only principle; no additional structural findings.
- **Test integrity/effectiveness:** coverage gaps above. No unapproved deletion, skipping or weakening found; the deleted placeholder test has recorded authorization.
- **Security:** no additional findings in network usage, player-data logging, query parameterization or dependency justification. Device backup and production-permission checks remain pending.
- **Explanation accuracy:** finding 4.
- **Simplicity and efficiency:** no findings.

Validation: types, lint, formatting, traceability, focused-test detection and Gitleaks passed. With cache writes disabled only in memory, **2,518 tests passed**; **23 tests** were blocked by temporary-file permissions. Full verification, coverage, mutation testing and device behavior were not independently confirmed. No repository files were changed.
