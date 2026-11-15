# Codex review

- Date: 2026-11-15 15:10
- Branch: 001-planificador-v1-d2 against main
- Commit: b3e484d

Changes requested: **1 IMPORTANT, 1 MINOR. No BLOCKING findings identified.**

Reviewed `git diff main...HEAD` against the repository rules and spec 001.

1. **IMPORTANT — E-021 conflicts with the approved native input behavior.**  
   File: [player-form.tsx:56](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/src/ui/player-form.tsx:56).

   The two-character limit turns typed or pasted `100` into `10`, which Save accepts. E-021 requires an invalid-number message and no saved player. The Jest rejection test bypasses native `maxLength`; the Maestro flow explicitly expects truncation and erases the field before saving.

   The plan approves the cap, so the contract itself is inconsistent. **Concrete fix:** reconcile E-021 with the approved input policy: preserve invalid input for validation, or explicitly amend the example. Add a native regression that enters `100` and presses Save.

2. **MINOR — Current explanations retain superseded behavior.**  
   Files: [summary.md:114](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/summary.md:114), [summary.md:235](/Users/fernandorequeninacher/code/planificador-periodos/.claude/worktrees/planificador-d2-review-3361ae/specs/001-planificador-v1/summary.md:235).

   The overview puts phone buttons below the grid without the landscape exception. The teaching paragraph describes draft ownership by team, although `formId` now distinguishes mounted forms of the same team.

   **Concrete fix:** update both passages to describe landscape header buttons and ownership by mounted form.

| Review category                                | Result                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF/E implementation and scope                  | Finding 1. Full v1 remains incomplete through approved D3 deferrals and pending device checks. No unrelated additions found.                               |
| Constitution, layers, conventions and glossary | No additional findings.                                                                                                                                    |
| Test integrity and effectiveness               | Finding 1 exposes a coverage mismatch. No unapproved deletion, skipping or weakening found; removal of the placeholder home test is explicitly authorized. |
| Security                                       | No new findings from static inspection. Documented release-permission and backup checks remain pending.                                                    |
| Explanation accuracy                           | Finding 2.                                                                                                                                                 |
| Simplicity, clarity and efficiency             | No findings.                                                                                                                                               |

Validation: types, lint, source/configuration formatting, traceability, focused-test detection and Gitleaks passed. With Jest cache writes disabled in memory, **2,820 tests passed; 218 were blocked by temporary-file permissions** across 15 suites. Dependency scans were blocked by DNS restrictions. Full verification, coverage, mutation testing and native behavior were not independently confirmed.

No repository files were changed.
