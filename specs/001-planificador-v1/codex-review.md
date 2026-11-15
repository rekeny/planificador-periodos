# Codex review

- Date: 2026-11-15 09:14
- Branch: 001-planificador-v1-d2 against main
- Commit: 582fedf

**Changes requested: 1 BLOCKING, 0 IMPORTANT, 1 MINOR.**

Reviewed `git diff main...HEAD` at `582fedf`, treating D3 functionality as an approved deferral.

1. **BLOCKING — Phone landscape warnings can make the grid inaccessible.**  
   **Files:** `src/ui/warnings/warning-strip.tsx:66`, `src/app/matches/[matchId]/index.tsx:136`.  
   On phones, warnings have neither a height bound nor a surrounding scroll container. In a 667 × 375 window, a six-period match with 13 players and one player marked in P1–P4 displays both banners and three legend entries. Together with the call-up button, toolbar and navigation header, these consume the grid’s available height. Enabling scrolling inside the collapsed grid cannot make its cells reachable. This violates RF-010, RF-076 and RF-080. Existing tests inject viewport heights and miss this surrounding layout problem.  
   **Fix:** bound and scroll the phone warnings while reserving usable grid space. Verify this assembled scenario in landscape, including after a save failure.

2. **MINOR — Current documentation retains superseded instructions.**  
   **Files:** `specs/001-planificador-v1/plan.md:754`, `plan.md:769`, `tasks.md:829`, `summary.md:333`.  
   These passages still describe an overlay error banner, a 600-point tablet threshold and approvals as pending. The implementation uses normal flow and 768 points; later documentation records the approvals.  
   **Fix:** update current design, completion criteria and pending lists. Keep superseded decisions explicitly marked as historical.

Category results:

- **RF/E coverage and scope:** finding 1. Full v1 remains incomplete through approved D3 deferrals; device-dependent checks remain pending. No unrelated product additions found.
- **Constitution, layers, conventions and glossary:** finding 1 affects required behavior; no additional structural findings.
- **Test integrity and effectiveness:** finding 1 exposes a coverage gap. No unapproved deletion, skipping or weakening found; the deleted placeholder test has recorded authorization.
- **Security:** no additional findings from static inspection. Backup behavior and release permissions still require the documented device and artifact checks.
- **Explanation accuracy:** finding 2.
- **Simplicity and efficiency:** no findings.

Validation: types, lint, source formatting, traceability, focused-test detection and Gitleaks passed. With Jest cache writes disabled only in memory, **2,570 tests passed**; **25 were blocked by temporary-file permissions**. Full verification, coverage, Stryker and native layout behavior were not independently confirmed. No repository files were changed.
