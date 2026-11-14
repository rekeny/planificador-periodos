# Codex review

- Date: 2026-11-14 08:46
- Branch: 001-planificador-v1-d2 against main
- Commit: 3e03a1e

Changes requested: **4 BLOCKING findings and 1 MINOR finding.** Reviewed with `git diff main...HEAD`, accounting for the approved D3 deferrals.

1. **BLOCKING — Returning from another match link leaves the original grid unavailable.**  
   [src/app/matches/[matchId]/index.tsx:80](src/app/matches/%5BmatchId%5D/index.tsx#L80)  
   Reproduced: open match 1, navigate to `/matches/999`, then Back. The pathname returns to match 1, but the shared session is `closed`; its mounted screen never reloads.  
   **Fix:** guard cleanup by the owning match ID and restore the requested session when focus returns with a missing or different session. Preserve Undo when returning from child routes. Add this navigation regression test.

2. **BLOCKING — The save-error banner overlaps «Guardar».**  
   [src/ui/save-error-banner.tsx:17](src/ui/save-error-banner.tsx#L17), [src/ui/team-form.tsx:77](src/ui/team-form.tsx#L77), [src/ui/player-form.tsx:65](src/ui/player-form.tsx#L65)  
   The banner now sits inside the scroll content but remains absolutely positioned at its bottom. Since Save is the last element in normal flow, the banner covers it after a failure. Existing tests invoke its handler directly and cannot detect the overlap.  
   **Fix:** render form errors in normal flow, or reserve space for the overlay. Verify that Save remains visible and physically tappable after failure.

3. **BLOCKING — The 12-row guarantee excludes supported smaller tablets.**  
   [src/ui/grid/tablet-budget.ts:9](src/ui/grid/tablet-budget.ts#L9)  
   The budget assumes 768 points is the shortest tablet height, while the approved tablet threshold is 600. Direct evaluation at **900 × 600**, with twelve players, produces `verticalScroll: true`, violating RF-081.  
   **Fix:** cover the 600-point boundary in both orientations and reconcile the layout with the twelve-row requirement. If the planned 44-point minimum row height makes that impossible, resolve that constraint through the specification workflow.

4. **BLOCKING — Compact warnings can become permanently unreadable.**  
   [src/ui/warnings/warning-strip.tsx:57](src/ui/warnings/warning-strip.tsx#L57)  
   The strip caps content at 80 points and hides overflow, while the legend wraps without a height limit. Additional wrapping—particularly in portrait or with larger system text—clips required explanations without any way to reveal them, contrary to RF-087.  
   **Fix:** make all warning content reachable within the bounded strip, or use a responsive layout that preserves it. Test rendered bounds and accessibility, beyond checking that Text nodes exist.

5. **MINOR — The picker explanation describes the previous implementation.**  
   [specs/001-planificador-v1/summary.md:153](specs/001-planificador-v1/summary.md#L153)  
   It says there is one picker file and Android is always open. Android now uses a separate component and explicitly opened dialogs.  
   **Fix:** update this paragraph to match the current implementation.

| Requested category                             | Result                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RF/E coverage and scope                        | Findings 1–4. D3 omissions are approved deferrals; no unrelated product additions found.                                            |
| Constitution, layers, conventions and glossary | Behavioral violations above; no additional structural findings.                                                                     |
| Test integrity and effectiveness               | Coverage gaps above. No unapproved deletion, skipping or weakening found; the placeholder-test deletion has recorded authorization. |
| Security                                       | No new findings from static inspection. Production permissions and device backup verification remain pending as documented.         |
| Explanation accuracy                           | Finding 5; reachability claims also need adjustment following findings 2–4.                                                         |
| Simplicity and efficiency                      | No additional findings.                                                                                                             |

TypeScript, ESLint, source formatting, traceability and focused/skipped-test checks passed. With cache writes disabled in memory, **1,772 existing tests passed**; nine startup tests remained blocked by temporary-file permissions. The navigation reproduction failed as described. Full verification, coverage, mutation testing and device behavior were not independently confirmed.
