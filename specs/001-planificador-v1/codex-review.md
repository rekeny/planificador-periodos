# Codex review

- Date: 2026-11-14 09:22
- Branch: 001-planificador-v1-d2 against main
- Commit: bf8bf3b

**Changes requested: 3 BLOCKING, 1 IMPORTANT, 1 MINOR.**

Reviewed `git diff main...HEAD` against spec 001 and its approved D1/D2 scope. D3 omissions are approved deferrals; the complete spec is not yet delivered.

1. **BLOCKING — SQLite exposes the database through development tooling.**  
   **File:** `src/data/database.ts:19`  
   `openDatabaseSync(DATABASE_NAME)` automatically registers this connection with Expo’s development inspector. The installed implementation opens a WebSocket and supports exporting the database and returning query results, including player names. This violates RF-011 and constitution principles 3 and 5 in the development builds used by this project. Expo documents that the inspector is [automatically enabled in development](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#browse-an-on-device-database).  
   **Fix:** prevent this database from registering with DevTools—for the installed version, `useNewConnection: true` bypasses registration—and test that opening it under `__DEV__` creates no inspector connection or export handlers. Update the security report accordingly.

2. **BLOCKING — Returning to a form can save a match for another team.**  
   **File:** `src/app/teams/[teamId]/matches/new.tsx:22`  
   Every mounted form shares one draft, but `ready` is initialized only once. Reproduced through the real routes: open team 1’s form, push team 2’s form, press Back, then «Guardar». The pathname belongs to team 1, while SQLite stores the match under team 2. The regression assertion fails with **expected team 1, received team 2**. This breaks RF-025 and RF-082.  
   **Fix:** give each form its own draft, or restore and validate draft ownership when focus returns. Add this two-team navigation regression, asserting both the saved team and call-up.

3. **BLOCKING — Native pickers are not constrained to Spanish.**  
   **Files:** `src/ui/date-time-field.tsx:34`, `src/ui/date-time-field-android.tsx:35`  
   i18next controls the surrounding labels, but the native controls inherit their platform locale. The iOS picker receives no `locale`; Android uses the device configuration and default system button labels. On an English-configured device, the form therefore includes English native UI, contrary to RF-012 and constitution principle 7. The picker doubles conceal this.  
   **Fix:** configure Spanish native localization, supply the supported picker locale and translated Android button labels, and verify on devices configured in English. The [SDK 58 picker API](https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/datetimepicker/) exposes these locale and button-label controls.

4. **IMPORTANT — The floating save error overlaps the phone toolbar.**  
   **Files:** `src/ui/save-error-banner.tsx:31`, `src/app/matches/[matchId]/index.tsx:147`  
   The phone toolbar occupies the screen’s bottom edge. The error banner is rendered afterward, absolutely positioned 16 points above that same edge, without reserved space. After a failed operation, it covers part of the toolbar labels and intercepts taps in that area. The form correction did not address this placement.  
   **Fix:** position the banner above the toolbar or reserve its space. Verify physical button reachability after failed Undo and overtime operations.

5. **MINOR — The learning explanation still shows the removed session implementation.**  
   **Files:** `specs/001-planificador-v1/summary.md:222`, `specs/001-planificador-v1/tasks.md:878`  
   The summary describes a `useState` initializer and unconditional cleanup; T084 says no focus event is used. The current implementation uses `useFocusEffect` and ownership-guarded cleanup.  
   **Fix:** replace the obsolete snippet and update T084 and the corresponding plan explanation to describe `useOwnSession`.

| Requested category                             | Result                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF/E implementation, tests and scope           | Findings 1–4; no unrelated product additions found. D3 and device verification remain pending.                                                                        |
| Constitution, layers, conventions and glossary | Findings 1 and 3 violate constitutional requirements; no additional structural findings.                                                                              |
| Test integrity and effectiveness               | Coverage gaps above. No skipped tests or unapproved weakening found; placeholder-test deletion has recorded authorization.                                            |
| Security                                       | Finding 1. No additional query-parameterization, application-log, or dependency-justification findings. Existing release-permission and backup checks remain pending. |
| Explanation accuracy                           | Finding 5; the security assurance also needs correction following finding 1.                                                                                          |
| Simplicity and efficiency                      | No additional findings.                                                                                                                                               |

Validation passed: TypeScript, ESLint, source/configuration formatting, traceability, focused/skipped-test detection and Gitleaks. With cache writes disabled in memory, **2,310 existing tests passed**; nine startup tests were blocked by temporary-file permissions. Full verification, coverage, Stryker and device behaviour were not independently confirmed. No repository files were changed.
