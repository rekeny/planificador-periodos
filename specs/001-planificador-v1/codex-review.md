# Codex review

- Date: 2026-11-13 19:31
- Branch: 001-planificador-v1-d2 against main
- Commit: 840d72e

**Changes requested: 2 BLOCKING, 1 IMPORTANT, 1 MINOR.** Reviewed `git diff main...HEAD` at `840d72e`, against the approved D2 scope.

1. **BLOCKING — Android assigns a time without user selection.**  
   [`src/ui/date-time-field.tsx:59`](src/ui/date-time-field.tsx#L59)  
   The inline time picker is always mounted, using 12:00 when `time` is null. The installed `@expo/ui` Android implementation emits its initial value from `LaunchedEffect`; this handler immediately stores it. Consequently, an untouched match can save 12:00, and clearing a previously selected time can restore 12:00. This violates RF-025 and RF-083/E-032. The test double emits only simulated user selections, hiding the defect.  
   **Fix:** open the Android picker explicitly, commit only a confirmed selection, and unmount it after confirmation or dismissal. Test initialization and clearing with native-equivalent callbacks.

2. **BLOCKING — The tablet’s 12-row guarantee remains broken.**  
   [`src/app/matches/[matchId]/index.tsx:111`](src/app/matches/%5BmatchId%5D/index.tsx#L111)  
   Measuring the viewport fixes unreachable rows, but the surrounding controls still consume too much height. On the reference 1024 × 768 tablet, the call-up button, warning banner, vertical legend and headers leave fewer than the 528 points required for twelve 44-point rows. A six-period match with twelve players and one player marked in P1–P4 demonstrates this state. RF-081 requires the twelve rows to fit without scrolling. The new tests explicitly accept scrolling at these smaller viewports instead of enforcing that requirement.  
   **Fix:** compact the tablet controls, banners and legend; test the assembled screen with warnings present and assert twelve visible rows without scrolling. Previous finding F2 is only partially resolved.

3. **IMPORTANT — Team and player forms cannot scroll around the keyboard or overflow.**  
   [`src/ui/team-form.tsx:51`](src/ui/team-form.tsx#L51), [`src/ui/player-form.tsx:41`](src/ui/player-form.tsx#L41)  
   Both forms use a fixed `View` without scrolling or keyboard avoidance. On short landscape viewports, particularly with validation messages or the keyboard visible, lower controls extend beyond the usable area without a way to scroll them into view. This undermines RF-076’s orientation support.  
   **Fix:** use keyboard-aware, scrollable form containers. Verify that fields, errors and Save remain reachable in landscape with the keyboard open.

4. **MINOR — Mutation cache excludes test setup files.**  
   [`.github/workflows/verify.yml:60`](.github/workflows/verify.yml#L60)  
   The cache hashes helpers and configurations but omits `tests/setup/**`, including `fast-check-mutation.ts`, which Stryker loads. Changes to property-test configuration can therefore reuse stale mutant results.  
   **Fix:** add `tests/setup/**` consistently to the restore key, restore prefix and save key.

Category results:

| Category                                       | Result                                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF/E coverage and scope                        | Findings 1–3. Full v1 remains incomplete through the approved D3 deferrals; no unrelated product additions found.                                                                               |
| Constitution, layers, conventions and glossary | No additional findings.                                                                                                                                                                         |
| Test integrity                                 | Findings 1–2 expose coverage gaps; finding 4 affects verification. No unapproved deletion, skipping or weakening found. The placeholder test deletion has recorded authorization.               |
| Security                                       | No new application-security findings: parameterised queries, no app network calls or player logging, and justified dependencies. Native backup and production-permission checks remain pending. |
| Explanation accuracy                           | The assertion that F2 is fixed overstates the result, as explained in finding 2. No additional findings.                                                                                        |
| Simplicity and efficiency                      | No findings.                                                                                                                                                                                    |

Validation: TypeScript, ESLint, source formatting, traceability and focused/skipped-test checks passed. All **1,166 domain cases** passed through an in-memory runner. Gitleaks passed. Standard Jest was blocked by cache writes in the read-only environment; coverage, Stryker, full verification and device behaviour were not independently confirmed.
