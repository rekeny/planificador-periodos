# Codex review

- Date: 2026-11-18 09:07
- Branch: fix/match-time-empty-state against main
- Commit: de83c6d

Reviewed `git diff main...HEAD` at `de83c6d`.

**Findings: 0 BLOCKING, 1 IMPORTANT, 2 MINOR.**

1. **IMPORTANT — Keyboard avoidance omits the form’s screen offset.**  
   [form-scroll.tsx:23](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/ui/form-scroll.tsx:23)  
   Forms sit below native headers, but `keyboardVerticalOffset` defaults to zero. React Native therefore underestimates keyboard overlap, leaving lower controls partly obscured at maximum scroll in short landscape views. Current tests check component structure, so they miss this geometry.  
   **Fix:** supply the actual top offset, accounting for headers and modal positioning; add a keyboard-geometry regression and verify «Guardar» on an iPhone in landscape. This follows the [documented offset semantics](https://reactnative.dev/docs/keyboardavoidingview#keyboardverticaloffset). Native verification remains pending.

2. **MINOR — Daylight-saving normalization can make the picker disagree with saved time.**  
   [date-time-field-shared.ts:26](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/ui/date-time-field-shared.ts:26)  
   Under `Europe/Madrid`, selecting 02:30 and then changing the date to 29 March 2026 feeds **03:30** to the picker, while the draft, displayed text and saved value retain **02:30**. Verified directly with the current conversion.  
   **Fix:** use an independent reference date for the time-only picker and add a DST regression covering date changes.

3. **MINOR — Shared-store updates still occur during render (existing M-01).**  
   [edit.tsx:19](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/app/teams/[teamId]/edit.tsx:19)  
   The `useState` initializer calls `openTeam()`, publishing Zustand updates during render and triggering React’s cross-component update warning. The new-player route and `useOpenTeam()` repeat this pattern.  
   **Fix:** initialize through the existing focus effects, guard rendering by team ownership, and assert that navigation emits no React warnings.

| Review category                             | Result                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RF/E implementation and scope               | Findings 1–2. D3 remains explicitly deferred; no unrelated additions found.                                                           |
| Constitution, layers, conventions, glossary | Finding 3; no additional findings.                                                                                                    |
| Test integrity and effectiveness            | Coverage gaps above. No unapproved deletion, skipping or weakening found.                                                             |
| Security                                    | No new findings: parameterized queries, no application network calls or player-data logging, documented dependencies and permissions. |
| Explanation accuracy                        | Form-reachability assurances overstate finding 1; no additional material mismatch.                                                    |
| Simplicity, clarity, efficiency             | Finding 3; no additional findings.                                                                                                    |

Validation: types, lint, source formatting, traceability, focused/skipped-test detection and Gitleaks passed. With Jest cache writes suppressed in memory, **2,930 tests passed**; **233 tests across 16 suites were blocked by temporary-file permissions**.

Full verification, coverage, mutation testing, fresh dependency scans and native behavior were not independently confirmed. D3, Maestro and documented device checks remain pending; this review does not establish full-spec completion.
