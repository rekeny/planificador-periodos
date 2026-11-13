# Tasks · 001 Period planner v1

Legend: `[ ]` pending · `[x]` done. Each task is one commit, `T0NN RF-0NN: description`.

<!-- The RF and E IDs go on the same line as the checkbox: scripts/check-traceability.mjs reads them. -->

Three deliveries (ADR-004, `plan.md` "Deliveries"): **D1** T001–T023 on `001-planificador-v1-d1`, **D2** T024–T061 and T080–T086 on `001-planificador-v1-d2`, **D3** T062–T079 on `001-planificador-v1-d3`. Before D2 and D3 start, the Planner reviews their tasks and Fernando approves again. Every task is at most three hours of work. Tasks are done in the order they appear in this file, not in the order of their IDs.

**New tasks on 2026-11-12 (D2 review), without renumbering.** Seven D2 tasks were added with new IDs, placed where they belong: T080 (250-line limit in `tests/`), T085 (focused-test check, taken out of T024), T081 (team edit route and not-found, out of T034), T086 (draft `create`, out of T040), T082 (date and time pickers, out of T043), T083 (grid assembly, out of T054) and T084 (Undo across the match's routes, out of T055). No existing ID changed, so `review.md` and `plan.md` references to T024–T079 stay valid; where part of a task moved, the new owner is named.

**Renumbered on 2026-11-11 (review P-27).** Five tasks were split in two: the old T001 (now T001 and T002), T019 (now T020 and T021), T023 (now T025 and T026), T030 (now T033 and T034) and T037 (now T041 and T042). The findings in `review.md` quote the old numbers. Old to new: T002–T018 → T003–T019; T020–T022 → T022–T024; T024–T029 → T027–T032; T031–T036 → T035–T040; T038–T074 → T043–T079.

# D1 · Rules engine (`src/domain/`)

## Setup

- [x] **T001** · Traceability script: three-digit global IDs, duplicate IDs across specs detected, spec "In progress"
  - Layer and files: tooling · `scripts/check-traceability.mjs`, `tests/scripts/check-traceability.test.ts`, `specs/001-planificador-v1/spec.md` (status "In progress").
  - Done when: the script reads `RF-\d{3}` and `E-\d{3}`, fails with a clear message when one ID is defined in two `spec.md` files, still ignores "retired" lines for coverage but counts them for duplicates; the spec status is "In progress"; the test runs the script against fixtures created at run time and `verify.sh` is green.
  - Scenarios:
    - Happy path: one spec with a ticked task whose IDs all have tests passes.
    - Boundaries: `E-001` and `E-032` are recognised; `E-01` and `E-0001` are not; `RF-088` at the end of a line.
    - Outside the rules: the same `RF-001` defined in two specs fails and names both folders.
    - Odd data: a spec folder without `spec.md` (like 000) is skipped; a retired ID reused in another spec fails.
    - Sequences: a closed spec requires all its IDs; an "In progress" one only those of ticked tasks.
    - Interruptions: not applicable.
    - Mistakes: an ID only in a comment or a `describe` does not count; fixture file contents never count, because the fixtures live in a temporary folder and the test names carry no IDs.
  - Pending: nothing.

- [x] **T002** · Documents, templates and roles quote three-digit IDs; numbering rule for the Specifier
  - Layer and files: docs · `docs/architecture.md` (Tests "Name", Traceability table), `.agents/templates/spec.md`, `.agents/templates/tasks.md`, `.agents/roles/specifier.md` (three-digit examples, and the rule "look up the highest `RF` and `E` used in `specs/` before numbering; IDs are global and never reused"), `.agents/roles/test-designer.md`.
  - Done when: every `E-01`-style example in those files reads `E-001`; the specifier role has the numbering rule; a search for a two-digit example ID (`E-\d{2}\b`) in `docs/architecture.md`, `.agents/` and `AGENTS.md` finds nothing (the ADRs keep the old IDs where they describe the old format); `verify.sh` is green.
  - Scenarios:
    - Happy path: the traceability table of `docs/architecture.md` shows `E-001` in the spec, test and task rows.
    - Boundaries: `RF-018` and `E-001` read the same in the "Name" convention and in the table.
    - Outside the rules: not applicable.
    - Odd data: not applicable.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: the templates never show an ID that the script of T001 would not recognise.
  - Pending: nothing.

## Formats (US4 base)

- [x] **T003** · Glossary terms, formats as data, columns and rule window (RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-042, RF-055)
  - Layer and files: domain and docs · `docs/architecture.md` (glossary, the table "Glossary additions" of `plan.md`), `src/domain/format.ts`, `src/domain/column.ts`, tests next to them.
  - Done when: the glossary has every new term; `FORMAT_RULES` holds the table of RF-002–RF-005 as data, `FORMATS` is exactly `[4, 6, 8]`, `gridColumns` gives periods then overtimes, `isRuleWindowColumn` is true only for P1–P3, P1–P5 and P1–P6 respectively; tests green.
  - Scenarios:
    - Happy path: 6 periods → window P1–P5, minimums 2 and 2, call-up 9–12.
    - Boundaries: last window period (P3, P5, P6) is in the window; the next one is not.
    - Outside the rules: `isFormat(5)` and `isFormat(0)` are false.
    - Odd data: 0 overtimes; 3 overtimes give `OT1`–`OT3` after the last period.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: an overtime is never a window column, in any format (RF-006).
  - Pending: nothing.

## US3 · Plan the periods (domain)

- [x] **T004** · Squad types, call-up entries, grid model, cell states and player order (RF-016, RF-019, RF-042, RF-043, E-020)
  - Layer and files: domain · `src/domain/squad.ts`, `src/domain/player-order.ts`, `src/domain/grid.ts`, tests.
  - Done when: `Team`, `Player`, `Match`, `CallUpEntry` and `MatchGrid` follow `plan.md`; `comparePlayers` sorts by numeric value, then "0" before "00", then by name in Spanish order; rows and cells are keyed by call-up entry; `cellState` always returns exactly one of three states; `cellExists`, `starterCount` and `hasSub` work per column.
  - Scenarios:
    - Happy path: 9, 4, 7 → 4, 7, 9; Luis 7 and Ana 7 → Ana, Luis.
    - Boundaries: E-020 → Ana 0, Carla 0, Luis 00, Bea 7, Eva 10; "9", "10", "99".
    - Outside the rules: two players with the same name and number keep a stable order.
    - Odd data: names with accents and capitals («Álvaro», «alba»); a grid with no players.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: "07" is not a valid number, but sorting never throws; two entries of the same player in different stays have different keys.
  - Pending: nothing.

- [x] **T005** · Tap on a cell (RF-044, RF-045, RF-048, RF-049, RF-050, RF-051, RF-055, E-011, E-012, E-013)
  - Layer and files: domain · `src/domain/marking.ts` (`tapCell`), test.
  - Done when: every row of the RF-044–RF-051 table returns the expected `MarkingResult`, and no tap returns a grid with 6 X in a column.
  - Scenarios:
    - Happy path: empty cell in a column with 3 X → X.
    - Boundaries: 4 X → X (5 X); 5 X in P5 of 6 periods → question; 5 X in P6 → circled X (E-012); 5 X in overtime → circled X.
    - Outside the rules: a tap that breaks a rest minimum is still marked.
    - Odd data: tap on an entry not in the call-up or a column that does not exist → `unchanged`.
    - Sequences: X, then tap again → empty; circled X, tap → empty.
    - Interruptions: not applicable.
    - Mistakes: tap Eva's X in P3 with a sub (E-013) → `confirmRemoveStarter`, grid untouched.
  - Pending: nothing.

- [x] **T006** · Player counter (RF-007, RF-008, RF-009, RF-070, RF-071, RF-072, E-014)
  - Layer and files: domain · `src/domain/counter.ts`, test.
  - Done when: `playerCounter` counts X as played and empty as rested over every column, overtimes included, and circled X as neither.
  - Scenarios:
    - Happy path: E-014 → played 3, rested 3.
    - Boundaries: all empty → rested = number of columns; all X → played = number of columns.
    - Outside the rules: a player with X in every period still gets a counter.
    - Odd data: entry not in the call-up → 0 and 0.
    - Sequences: adding an overtime adds one rested.
    - Interruptions: not applicable.
    - Mistakes: one circled X in 6 periods → played + rested = 5 (RF-071).
  - Pending: nothing.

- [x] **T007** · Overtimes: add, remove the last one, detect its marks (RF-058, RF-059)
  - Layer and files: domain · `src/domain/overtime.ts`, test.
  - Done when: `addOvertime` adds one empty column after the last one; `lastOvertimeHasMarks` and `removeLastOvertime` work only on the last overtime and remove its marks.
  - Scenarios:
    - Happy path: two additions in 6 periods → 8 columns.
    - Boundaries: removing the only overtime → 6 columns.
    - Outside the rules: not applicable.
    - Odd data: `removeLastOvertime` with no overtimes → same grid.
    - Sequences: add 2, mark OT2, remove → OT1 with its marks intact.
    - Interruptions: not applicable.
    - Mistakes: marks of OT1 never deleted when removing OT2.
  - Pending: nothing.

## US5 · Record subs (domain)

- [x] **T008** · Answers: sub, starter replacement, remove anyway (RF-046, RF-047, RF-054, RF-055, E-013)
  - Layer and files: domain · `src/domain/marking.ts` (`markSub`, `replaceableStarters`, `replaceStarter`, `removeMark`), test.
  - Done when: "sub" marks a circled X and keeps 5 X; "starter" puts an X in the tapped cell and empties the chosen X in one step; "remove anyway" empties the X and leaves every circled X as it is.
  - Scenarios:
    - Happy path: choose Eva → tapped cell X, Eva empty, 5 X.
    - Boundaries: `replaceableStarters` lists exactly the 5 entries with X in that column.
    - Outside the rules: replacing creates a rest breach; it is done anyway.
    - Odd data: replaced entry without an X in that column → unchanged grid.
    - Sequences: E-013, remove anyway → 4 X, the sub still circled (RF-054).
    - Interruptions: not applicable.
    - Mistakes: the replaced cell becomes empty, never a circled X.
  - Pending: nothing.

- [x] **T009** · Long-press menu (RF-052, RF-053, RF-054)
  - Layer and files: domain · `src/domain/cell-menu.ts`, test.
  - Done when: `canOpenCellMenu` is false on empty cells; each choice gives the result of RF-052 and RF-053; choosing the current state returns `unchanged`.
  - Scenarios:
    - Happy path: circled X → «Titular» with 4 X → X.
    - Boundaries: circled X → «Titular» with 5 X → `chooseReplacedStarter`.
    - Outside the rules: X → «Entró de cambio» lowers the column to 4 X and is allowed.
    - Odd data: menu on an empty cell → no menu.
    - Sequences: X → «Entró de cambio» → «Titular» → back to X.
    - Interruptions: not applicable.
    - Mistakes: «Quitar» on an X in a column with a sub → `confirmRemoveStarter`.
  - Pending: nothing.

## US4 · See the rule warnings (domain)

- [x] **T010** · Rule window: possible rests, light red cells, player in red (RF-002, RF-003, RF-004, RF-007, RF-008, RF-009, RF-062, RF-063, RF-064, RF-072, E-001, E-002, E-003, E-004, E-005, E-008, E-009, E-010)
  - Layer and files: domain · `src/domain/rule-window.ts`, test.
  - Done when: E-001–E-005 and E-008–E-010 give exactly the light red cells and players in red of the spec, in the three formats.
  - Scenarios:
    - Happy path: E-001 → P4 and P5 light red.
    - Boundaries: possible rests equal to the minimum → light red, not red; one below → red (E-003).
    - Outside the rules: 4 X in the first 5 periods → red and P5 light red.
    - Odd data: marks only in P7 and P8 of 8 periods → nothing coloured (E-008, RF-072).
    - Sequences: E-005 then fill P5 to 5 X → Pedro turns red (E-004).
    - Interruptions: not applicable.
    - Mistakes: a circled X in the window counts as neither played nor rest (E-002, E-010).
  - Pending: nothing.

- [x] **T011** · Rule impossible to meet, by bounded flow (RF-003, RF-004, RF-010, RF-067, E-003, E-004, E-006, E-007, E-015, E-030)
  - Layer and files: domain · `src/domain/bounded-flow.ts`, `src/domain/rule-feasibility.ts`, tests.
  - Done when: `isRuleImpossible` is true for E-003, E-004, E-006, E-015 and E-030 and false for E-007; `bounded-flow.ts` passes its own tests on small networks with lower bounds; the algorithm follows `plan.md`.
  - Scenarios:
    - Happy path: E-007 (no subs, P5 and P6 empty) → possible.
    - Boundaries: exactly as many free slots as players who need them → possible; one fewer → impossible (E-006).
    - Outside the rules: 8 players in 6 periods (E-015) and 13 players (E-030) → impossible, still evaluated (RF-010).
    - Odd data: empty call-up or fewer than 5 players → impossible; every window cell already circled.
    - Sequences: complete window with one player short → impossible (E-004).
    - Interruptions: not applicable.
    - Mistakes: circled X cells are never used as free cells.
  - Pending: nothing.

- [x] **T012** · Incomplete and inconsistent periods (RF-065, RF-066, E-002, E-007, E-010, E-013)
  - Layer and files: domain · `src/domain/period-warnings.ts`, test.
  - Done when: `periodWarning` returns "inconsistent" for any column with a circled X and fewer than 5 X, otherwise "incomplete" for window columns with fewer than 5 X, otherwise `null`.
  - Scenarios:
    - Happy path: P5 empty in E-007 → incomplete; P6 empty → none.
    - Boundaries: 4 X → incomplete; 5 X → none.
    - Outside the rules: P6 with 4 X and a sub → inconsistent.
    - Odd data: empty free period or overtime → none.
    - Sequences: E-013 remove anyway → P3 inconsistent, not incomplete.
    - Interruptions: not applicable.
    - Mistakes: 5 X and a sub → none; E-002 and E-010 → the period with the sub is inconsistent, not incomplete.
  - Pending: nothing.

- [x] **T013** · All warnings in one result, call-up range and legend items (RF-005, RF-010, RF-060, RF-061, RF-068, RF-072, RF-087, E-015, E-027, E-030)
  - Layer and files: domain · `src/domain/call-up-range.ts`, `src/domain/warnings.ts`, `src/domain/legend.ts`, tests.
  - Done when: `evaluateWarnings` combines T010–T012 and the call-up range; `legendItems` returns only the kinds present, in a fixed order, and nothing when no mark is present; a complete 8-period window with 12 players, each with 2 or 3 X and no sub, reports nothing.
  - Scenarios:
    - Happy path: E-015 → call-up warning with minimum 9 and count 8; E-027 → light red, «!» and «≠» in the legend, not the player in red.
    - Boundaries: 6 periods with 9 and 12 → no call-up warning; 8 and 13 → warning (E-030); 4 periods with 8 → none.
    - Outside the rules: 13 players still give every other warning (RF-010).
    - Odd data: 0 players → call-up warning and rule impossible.
    - Sequences: two evaluations of the same grid are equal; removing the last light red cell removes its legend item.
    - Interruptions: not applicable.
    - Mistakes: marks in free periods never add light red cells or players in red (RF-072).
  - Pending: nothing.

- [x] **T014** · Performance budget and mutation-run settings (RF-060)
  - Layer and files: domain tests and tooling · `src/domain/warnings.budget.test.ts`, `tests/setup/fast-check.ts`, `tests/setup/fast-check-mutation.ts`, `jest.config.js` (`setupFiles`), `jest.stryker.config.js`, `stryker.config.json` (`jest.configFile`, `timeoutMS`), `eslint.config.js` (Node globals for the new config file).
  - Done when: 500 calls of `evaluateWarnings` on the worst planned grid take under 2.5 s in Jest with coverage; Stryker runs only `src/domain/**/*.test.ts`, without `*.budget.test.ts`, with 100 fast-check runs; normal Jest runs use 1,000; `FORCE_MUTATION=1 npm run verify` is green and its duration is written in the task's commit message body.
  - Scenarios:
    - Happy path: the budget test passes with coverage on.
    - Boundaries: the worst grid has 8 periods, 3 overtimes and 13 players.
    - Outside the rules: random marks that break every rule.
    - Odd data: not applicable.
    - Sequences: `npx stryker run` does not list the budget test or any test outside `src/domain/`.
    - Interruptions: not applicable.
    - Mistakes: a property that sets its own `numRuns` would bypass the setting, so none does (checked in review).
  - Pending: nothing.

## US2, US6 and US7 · Call-up, format and squad rules (domain)

- [x] **T015** · Call-up rules: initial call-up, players to add, name and number snapshot, removal with marks (RF-019, RF-023, RF-030, RF-032, RF-033, RF-034, RF-042, E-017, E-018)
  - Layer and files: domain · `src/domain/call-up.ts`, test.
  - Done when: `initialCallUp` takes only active players, sorted; `playersToAdd` offers only active players not in the call-up; `callUpEntryFor` copies name and number; `removeFromCallUp` removes the row and its marks; `entryHasMarks` decides the confirmation.
  - Scenarios:
    - Happy path: 12 active and 1 deactivated → 12 players.
    - Boundaries: an entry with only a circled X has marks.
    - Outside the rules: adding a 13th player is allowed.
    - Odd data: no active players → empty call-up.
    - Sequences: snapshot Juan 7, then Juan becomes 9 in the squad → the entry still says 7 (E-018); remove Ana and add her again with a new entry → empty row.
    - Interruptions: not applicable.
    - Mistakes: removing Ana with marks (E-017) → `entryHasMarks` true; after removal no cell of Ana remains.
  - Pending: nothing.

- [x] **T016** · Format change (RF-038, RF-040, RF-041, RF-055, E-016)
  - Layer and files: domain · `src/domain/format-change.ts`, test.
  - Done when: `changeFormat` keeps marks of the periods that still exist, drops the rest, keeps overtimes with their marks after the new last period, in any direction; the same format returns the same grid.
  - Scenarios:
    - Happy path: 8 → 4 with marks in P5–P8 → only P1–P4 marks remain (E-016).
    - Boundaries: 4 → 8 keeps everything and adds empty P5–P8.
    - Outside the rules: not applicable.
    - Odd data: same format → same grid; 6 periods with 1 overtime → 4 periods shows P1–P4 then OT1 with its marks.
    - Sequences: 8 → 4 → 8 → P5–P8 empty.
    - Interruptions: not applicable.
    - Mistakes: overtime marks never lost on a format change.
  - Pending: nothing.

- [x] **T017** · Duplicate-number warning (RF-017, RF-069)
  - Layer and files: domain · `src/domain/duplicate-numbers.ts`, test.
  - Done when: `duplicateNumbers` returns each number shared by two or more active players, once, and never rejects a player.
  - Scenarios:
    - Happy path: two active 7 → ["7"].
    - Boundaries: "0" and "00" are not duplicates.
    - Outside the rules: three players with 7 → ["7"] once.
    - Odd data: no players → [].
    - Sequences: change one to 8 → [].
    - Interruptions: not applicable.
    - Mistakes: a deactivated 7 does not count.
  - Pending: nothing.

## US3 · Undo (domain)

- [x] **T018** · Undo history: cell changes, pruning and revert with skipped cells (RF-055, RF-057, RF-086, E-026, E-031)
  - Layer and files: domain · `src/domain/undo.ts`, test.
  - Done when: `cellChanges` and `undoEntryFor` list exactly the cells whose state differs; `pruneHistory` drops missing cells and empty entries; `undoLast` reverts the last entry with a surviving cell, discards the entries with none on the same press, and never produces 6 X.
  - Scenarios:
    - Happy path: one tap → one change; one replacement → two changes, undone in one press.
    - Boundaries: undo with an empty history → same grid, no changes.
    - Outside the rules: reverting into a column that now has 5 X never makes 6.
    - Odd data: same grid → no changes.
    - Sequences: E-026 → Ana's P2 empty, Eva's cell skipped; E-031 → Bea's overtime entry discarded and Ana's P1 emptied in one press.
    - Interruptions: not applicable.
    - Mistakes: an overtime removed and added again, or a format changed 8 → 4 → 8, never receives old marks after `pruneHistory`; a re-added player (new entry) never receives old marks.
  - Pending: nothing.

## Examples, properties and delivery close

- [x] **T019** · Spec examples table through the public domain functions (E-001, E-002, E-003, E-004, E-005, E-006, E-007, E-008, E-009, E-010, E-011, E-012, E-013, E-014, E-015, E-016, E-017, E-018, E-020, E-026, E-027, E-030, E-031)
  - Layer and files: domain tests · `src/domain/spec-examples.test.ts`, one `it.each` table, so the examples of the spec can be read in one place (the per-file tests of T004–T018 stay).
  - Done when: every row passes; for the examples that state the whole grid (E-001, E-002, E-005, E-007–E-010, E-015, E-030), the row also asserts that no other warning is shown.
  - Scenarios:
    - Happy path: each example as written in the spec.
    - Boundaries: E-005 (window not complete) next to E-004 (complete).
    - Outside the rules: E-003, E-004, E-006, E-015, E-030.
    - Odd data: E-020 order with "0" and "00".
    - Sequences: E-026 and E-031 as sequences of domain calls.
    - Interruptions: not applicable.
    - Mistakes: E-013 remove anyway; E-007's row has no subs and P5 and P6 empty, exactly as the spec states, so "only «!» on P5" does not depend on how the test fills the grid.
  - Pending: nothing.

- [x] **T020** · Properties on random grids: warnings deterministic and justified, counter identity (RF-060, RF-061, RF-070, RF-071, RF-072)
  - Layer and files: domain tests · `src/domain/grid.properties.test.ts`, `tests/support/grid-arbitraries.ts` (random grids of the three formats, 0 to 15 players and 0 to 3 overtimes; it lives in `tests/` because files in `src/domain/` that are not tests may not import fast-check).
  - Done when: the grid properties of `plan.md` hold for 1,000 random cases each in normal runs: `evaluateWarnings` is deterministic and every warning it reports is justified, and played + rested + circled X equals the number of columns for every player; the separate example of a complete 8-period window with 12 players and no sub reports nothing.
  - Scenarios:
    - Happy path: random grids within the rules report only justified warnings.
    - Boundaries: grids at exactly 5 X per column; players at exactly the minimums.
    - Outside the rules: grids that break every rule still evaluate without throwing.
    - Odd data: 0, 1 and 15 players; 0 to 3 overtimes.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: no warning ever points at a free period or an overtime (RF-072).
  - Pending: nothing.

- [x] **T021** · Properties on random sequences of actions: 5-X limit, only the acted cells change, Undo never writes into re-created rows or columns (RF-054, RF-055, RF-057, RF-086)
  - Layer and files: domain tests · `src/domain/actions.properties.test.ts`, `tests/support/grid-arbitraries.ts` (adds the action generator: taps, menu choices, answers, undos, overtimes, format changes and call-up changes).
  - Done when: the action properties of `plan.md` hold for 1,000 random sequences each in normal runs.
  - Scenarios:
    - Happy path: random sequences never reach 6 X, also after undos.
    - Boundaries: sequences that start from columns with exactly 5 X.
    - Outside the rules: sequences that break every rule are applied anyway, apart from the sixth X.
    - Odd data: empty sequences; sequences of only undos.
    - Sequences: undo after an overtime removed and added again, a format changed 8 → 4 → 8, or a player removed and added again never touches the re-created row or column.
    - Interruptions: not applicable.
    - Mistakes: a tap or menu choice never changes any cell other than the tapped one, or the two of a replacement (RF-054).
  - Pending: nothing.

- [x] **T022** · Brute-force oracle for "rule impossible to meet" on realistic grids of the three formats (RF-003, RF-004, RF-067)
  - Layer and files: domain tests · `src/domain/rule-feasibility.oracle.test.ts`.
  - Done when: `isRuleImpossible` agrees with brute force on the mixed and the possible-by-construction generators of `plan.md` (formats 4, 6 and 8; call-ups from the format minimum to 13; at most 4 X missing in the window); a fixed-seed test shows at least 20 % of each outcome in the mixed generator.
  - Scenarios:
    - Happy path: a valid complete window with up to 4 X removed → possible.
    - Boundaries: 8 players in 4 periods and 8 periods; 9 in 6 periods; minimums of 2 reached exactly.
    - Outside the rules: 13 players → impossible.
    - Odd data: circled X in most empty cells of a period.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: brute force never fills a circled X cell, and never counts a filling with 6 X in a period.
  - Pending: nothing.

- [x] **T023** · D1 close: verification with mutation testing, Codex and Security review, D1 section of `summary.md`, PR
  - Layer and files: `specs/001-planificador-v1/review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with Stryker ≥ 80 % and domain coverage ≥ 90 %, and the mutation run time recorded in `review.md`; no blocking finding; the D1 summary explains the engine with real code; the PR "001 D1: rules engine" is merged by Fernando.
  - Pending: nothing. The PR #4 is merged.

**D1 checkpoint:** every rule of the regulations exists as a pure, tested function; every domain example of the spec passes; the app looks the same as before.

# D2 · Usable in a match (US1–US4)

**Reviewed by the Planner on 2026-11-12 with the D1 lessons** (`plan.md` "Deviations"; Fernando approves again before T024). Rules for every D2 task:

1. **"Done when" is never shorter than the plan (Codex D1-01).** Every function, type, component, repository method, store action, view field, screen state and text key that `plan.md` assigns to a task is named in its "Done when". If the Implementer finds something in the plan that the task does not name, it stops and asks.
2. **Test names (traceability).** `scripts/check-traceability.mjs` reads only the literal first argument of `it(…)`, `test(…)` and `it.each(…)(…)`, and in Maestro files any text that is not a `#` comment. For tables: pass the table as a named constant (`it.each(CASES)(…)`: the argument of `it.each` may hold at most one level of nested parentheses, or the title is silently missed; tagged-template tables are not read) and write ONE literal title that carries every RF and E ID of the table, such as `it.each(CASES)("RF-016 E-021: %s is a valid number", …)`. IDs placed in a row, a `%s`, a `${}`, a variable, a `describe` or a comment do not count.
3. **Size limits.** ESLint applies 250 lines per file to `src/**` (tests next to the code included) and, from T080, also to `tests/**`, `scripts/**` and `plugins/**`; outside test files, 60 lines per function (components too), complexity 10, 4 parameters and 3 levels of nesting. Each task below names its split files where the plan's single file would pass the limit.
4. **Mutation testing (decision of Fernando, 2026-11-12).** From T030 on, the D2 branch differs from `main` in `src/domain/`, so every `verify.sh` runs Stryker. Locally it runs in incremental mode: `STRYKER_INCREMENTAL=1 npm run verify` (`scripts/verify.sh` already reads this variable and passes `--incremental --incrementalFile reports/stryker-incremental.json`; `reports/` is gitignored; no script change is needed). A full local run, `STRYKER_INCREMENTAL=1 STRYKER_FORCE=1 npm run verify` (every mutant again, file rebuilt), is required in T030, T037 and T061, and in any task that changes `tests/support/`, `jest*.config.js` or `stryker.config.json`, because Stryker does not see those files (SEC-02). The tasks that change `src/domain/` (T030, T037) record the local mutation time in the commit body, and at the next CI run check that the cache was restored and the incremental run reused it.
5. **CI mutation cache (decision of Fernando, 2026-11-12).** The cache key keeps hashing `tests/support/**`. The first CI run after T024 (`package-lock.json`), T080, T028 and T029 (`tests/support/`) is a full Stryker run, about 25 minutes against the 40-minute timeout; write the times in `review.md` at T061.
6. **Database in screen tests.** Screens and stores in tests use the in-memory database of `tests/support/test-database.ts`: state tests pass it to the store factories, and screen tests replace `@/data/database` with `jest.mock` (`plan.md`, "State").
7. **Maestro flows carry their IDs in their `name`.** `check-traceability.mjs` reads every non-`#` text of a `*.yaml` file, so a flow counts as a test of every ID written in it: write the RF and E IDs only in the flow's `name`, and keep a Jest test as the evidence of every ID that a machine can check (Maestro does not run in CI).
8. **Routes and their headers.** Each task declares, in `src/app/_layout.tsx`, the `Stack.Screen` options of the routes it creates (presentation and header title), and adds links only to routes that already exist, so the typed routes of `app.json` (`typedRoutes`) never meet a link to a missing route. Header titles reuse approved keys and data, never new text: list of teams `teams.title`; new team `teams.new`; edit team `common.edit`; team screen the team's name; new player (both routes) `players.new`; new match `matches.new`; call-up `callUp.title`; match grid no title text (only Back and, on tablets, the grid buttons).
9. **Known D2 limits, on purpose (`plan.md` "Deliveries" and "Risks").** (a) A tap on an empty cell of a full rule-window period, and a tap on an X in a period with a sub, do nothing yet: their question and reminder arrive with US5 in D3. (b) A saved match is reached only right after «Guardar»: once the coach goes Back from its grid, or the app closes, there is no way back to it in the interface until the team's match list arrives in D3 (T071). The data is still saved; E-019 is proven in D2 by state and screen tests and by Maestro with a deep link. (c) A team with no players shows an empty list with no text. (d) A failed read reuses an existing state, with no new text: the list of teams shows `teams.empty`, and a team or match that cannot be read shows `notFound.message` (answers of 2026-11-12).
10. **Answers of 2026-11-12 (phase 5, Fernando).** Names and category are trimmed by the domain validators, which return the normalised value (T030, T037); empty texts are saved as `null`; every form that creates something ignores «Guardar» while a save is running (T034, T035, T047, and the draft's `create` in T086); a score is digits only and stored as a number (T037, T043); route IDs accept only the canonical text of a positive integer (T032); a tablet is a window whose shortest side is at least 600 points (T053); actions with nothing to do return `unchanged` (T032, T042, T086). See `plan.md` "Deviations".

## Setup

- [x] **T024** · Data stack install
  - Layer and files: configuration · `package.json`, `package-lock.json`, `eslint.config.js` (ignores `src/data/migrations/`) and `.prettierignore` (created; ignores `src/data/migrations/`, which T027 fills), `app.json` (only if `npx expo install` adds the `expo-sqlite` plugin entry: kept, with no options), `plan.md` "New dependencies" (installed versions), `osv-scanner.toml` (only with Fernando's approval, see "Mistakes").
  - Done when: `expo-sqlite`, `drizzle-orm` and `zustand` are installed with `npx expo install expo-sqlite drizzle-orm zustand`, and `drizzle-kit`, `better-sqlite3` and `@types/better-sqlite3` with `npx expo install drizzle-kit better-sqlite3 @types/better-sqlite3 -- -D`, each once, here; `drizzle-orm` resolves to the 0.45 line and `drizzle-kit` to its matching 0.31 line (decision 9; if npm `latest` has moved to 1.x by then, install `drizzle-orm@0.45` and `drizzle-kit@0.31` explicitly); the installed versions are written in `plan.md` "New dependencies"; ESLint and Prettier ignore `src/data/migrations/`; Security has reviewed every new package (licence, maintenance, install scripts, native code); the dev build starts on iOS and Android; `verify.sh` is green. `drizzle.config.ts` is created in T027, with the schema, so that `drizzle-kit check` never runs without one.
  - Scenarios:
    - Happy path: dev build opens the app with the new packages.
    - Boundaries: `npm ls drizzle-orm drizzle-kit` shows the 0.45 and the 0.31 lines; `npx expo install --check` reports nothing to fix for `expo-sqlite` and `zustand`; each of the six packages is listed once in `package.json`: `expo-sqlite`, `drizzle-orm` and `zustand` in `dependencies`, `drizzle-kit`, `better-sqlite3` and `@types/better-sqlite3` in `devDependencies`.
    - Outside the rules: no new permission in the generated manifests.
    - Odd data: an unformatted 300-line file placed in `src/data/migrations/` passes `npx eslint .` and `prettier --check .`, and the same file in `src/data/` fails both (the file is removed afterwards); `node -e` loads `better-sqlite3` and opens `:memory:` with the Node version of the Mac.
    - Sequences: `npx expo-doctor` and `npm audit` green after installing.
    - Interruptions: an install cut halfway is redone from the lock file: `rm -rf node_modules && npm ci` leaves `git diff --exit-code package-lock.json` clean and `npm run verify` green.
    - Mistakes: `better-sqlite3` is a development dependency and is not bundled; no `babel.config.js` or `metro.config.js` is created. If `osv-scanner` reports advisories in `drizzle-kit`'s tree (it depends on the deprecated `@esbuild-kit/esm-loader`, which brings an old `esbuild`), Security records them and Fernando decides on an exception in `osv-scanner.toml` with a reason and an expiry of 90 days at most (`docs/security.md`); if `expo-doctor` flags a new package in its React Native Directory check, the Implementer stops and asks. no `drizzle.config.ts` exists yet, so `verify.sh` does not run `drizzle-kit check` in this task and still passes; the dev build opens the app although no code calls the database yet.
  - Mutation cache: `package-lock.json` changes, so the first CI run of the branch with domain changes is full (rule 5).
  - Pending: the dev build on the iOS and Android simulators was not run by the Implementer: Fernando checks it. The `esbuild` exception is recorded in `osv-scanner.toml` (approved by Fernando on 2026-11-13, expires 2027-02-10); the Expo patch versions were updated in their own commit.

- [x] **T080** · The 250-line limit also in `tests/`, `scripts/` and `plugins/`, and the four oversized test files split
  - Layer and files: tooling and tests · `eslint.config.js` (the `max-lines` rule, 250 lines without blank lines and comments, also for `tests/**/*.{ts,tsx}`, `scripts/**/*.{js,mjs}` and `plugins/**/*.js`; `max-lines-per-function` stays off for tests); `tests/scripts/check-traceability.test.ts` (about 404 counted lines today) split into two test files by subject, with their shared fixture helpers in `tests/scripts/traceability-fixtures.ts`; `tests/support/grid-arbitraries.ts` (about 331), `tests/support/action-interpreter.ts` (about 298) and `tests/support/feasibility-oracle.ts` (about 280) each split into smaller files under `tests/support/`. Counted with non-blank, non-comment lines on 2026-11-12; every other file under `tests/`, `scripts/` and `plugins/` is under 250.
  - Done when: `npx eslint .` fails on a file of 251 counted lines under `tests/` and passes on the split tree; each split support file keeps its old path as the entry point and re-exports from the new files, so no import in `src/domain/` changes and `src/domain/` is not touched (if an import there has to change after all, the task runs the full local Stryker run of rule 4 and says so in the commit body); no test is deleted, skipped or weakened (rule 7): the number of tests in Jest's summary and every test title are the same before and after, and the traceability check reports the same; `verify.sh` is green.
  - Scenarios:
    - Happy path: `npm run lint` and `npm test` green after the split, with the same test count.
    - Boundaries: a file at exactly 250 counted lines passes; 251 fails.
    - Outside the rules: a file of 251 counted lines is flagged under each of `tests/` (one `.ts` and one `.tsx`), `scripts/` (`.mjs`) and `plugins/` (`.js`); a 251-line file under `src/` is still flagged as before; `max-lines-per-function` is still off for test files.
    - Odd data: blank lines and comments do not count (`skipBlankLines`, `skipComments`).
    - Sequences: the fast-check properties of T020–T022 still run 1,000 cases each in normal runs.
    - Interruptions: not applicable.
    - Mistakes: a moved test keeps its literal title, so its RF and E IDs still count; no fixture or helper carries an ID that could count as a test. the three entry-point files keep their old paths and exported names, so the imports of the T020–T022 tests resolve unchanged and `npx tsc --noEmit` is green; the number of tests in Jest's summary and the output of the traceability check are identical before and after (both recorded in the commit body); `jest.stryker.config.js` still selects only `src/domain/**/*.test.ts`; the new fixture and helper files contain no `it(` or `test(` call, so they are never read as tests.
  - Mutation cache: this task changes `tests/support/`: the next CI run with domain changes is full (rule 5), and T030 runs the full local run (rule 4).
  - Pending: nothing.

- [x] **T085** · The focused-test check of `verify.sh` only matches real calls
  - Layer and files: tooling · `scripts/check-focused-tests.sh` (new, executable, mode `100755` in git), `scripts/verify.sh` (calls it in the step "Focused or skipped tests"), `tests/scripts/check-focused-tests.test.ts`.
  - Done when:
    - **What is wrong today.** `verify.sh` runs `grep -rEn '\b(it|test|describe)(\.[A-Za-z]+)*\.(only|skip)\b|\b(xit|xtest|xdescribe|fit|ftest|fdescribe)\b' src tests 2>/dev/null`. Its second half matches the words `fit`, `xit`… anywhere on a line, also inside test titles, strings and comments, so a title such as "RF-079: 4 and 6 periods fit at 375 pt" (T053) fails `verify.sh`; its first half also matches `it.skip`-like text inside strings; and `2>/dev/null` with `if grep` turns a missing folder into "nothing found".
    - **The script.** `scripts/check-focused-tests.sh [dir…]` goes to the repository root first (as `verify.sh` does), defaults to `src tests`, exits 2 with a message when an argument is not a folder, searches `*.test.ts` and `*.test.tsx` with `grep -rEn` and two POSIX extended patterns, exits 1 and lists the lines when either matches, exits 2 if `grep` itself fails, and 0 otherwise. Pattern 1, a call at the start of a line (Prettier puts every test call on its own line), with an optional generic and a backtick for tagged-template tables:

      ```text
      ^[[:space:]]*((it|test|describe)(\.[A-Za-z]+)*\.(only|skip)|x(it|test|describe)|f(it|test|describe))(\.[A-Za-z]+)*(<[^>]*>)?[[:space:]]*[(`]
      ```

      Pattern 2, a skipped or focused function used as a value, as in `const d = process.env.CI ? describe : describe.skip;`:

      ```text
      [?:=(,][[:space:]]*(it|test|describe)(\.[A-Za-z]+)*\.(only|skip)([^A-Za-z0-9_]|$)
      ```

      Still not found, accepted and documented in the script: a call after other code on the same line, such as `if (x) it.only(…)`.
  - Scenarios:
    - Happy path: `it.only(`, `describe.skip(`, `fit(`, `xit(` and `test.concurrent.only(` at the start of a line each make the script exit 1.
    - Boundaries: `it.only.each(TABLE)(`, `it.skip.each`, `fit.each`, `fdescribe(` and `it.only<Row>(` are found; indented calls are found; `? describe : describe.skip;` is found. the script is executable in git (`git ls-files -s scripts/check-focused-tests.sh` shows `100755`); a folder given twice, or with a trailing slash, is searched once without error.
    - Outside the rules: a test title "6 periods fit across", a comment `// it.only(`, a variable `const fit =` and `it.each(CASES)("…")` are not found.
    - Odd data: an empty folder and a folder with no test files → exit 0; a `.ts` file that is not a test is not searched; a folder that does not exist → exit 2. the script run from another working directory (for example from `scripts/`) gives the same result, because it goes to the repository root first; a folder name with spaces in a searched path is searched; a `*.test.tsx` file is searched and a `*.test.js` file is not (the script's documented patterns).
    - Sequences: the script run twice gives the same result; `verify.sh` fails on a focused test and passes without one.
    - Interruptions: the search itself fails: a stub `grep` first on `PATH` that exits 2 makes the script exit 2 with a message, never 0; with the arguments `src nope`, where `src` is clean and `nope` does not exist, it exits 2.
    - Mistakes: the fixtures are written at run time to a temporary folder, as quoted strings (never a template literal whose lines start with a call), so pattern 1 never flags the script's own test file; pattern 2 matches anywhere on a line, so its fixtures build the name by concatenation (`"describe" + ".skip"`) instead of writing `describe.skip` after `?`, `:`, `=`, `(` or `,`; neither the fixtures nor the test names carry RF or E IDs; the test follows `tests/scripts/check-traceability.test.ts` (`spawnSync`). Test helpers are never named `fit`, `xit` or similar (T053 talks about periods that "fit"). `verify.sh` prints the offending file and line when the check exits 1, and fails loudly (not as "nothing found") if the script is missing or not executable.
  - Pending: nothing.

- [x] **T025** · Keep the data out of Android backups and device-to-device transfer: config plugin, Android part (RF-088, E-028)
  - Layer and files: configuration · `plugins/with-backup-exclusion.js` (created, Android part), `app.json` (`plugins`; `android.allowBackup: false` kept), `tests/plugins/with-backup-exclusion.test.ts`, `docs/security.md` (Android controls), device check in `review.md`.
  - Done when: the plugin writes `data_extraction_rules.xml` (`<cloud-backup>` and `<device-transfer>`) and `full_backup_content.xml`, both excluding every domain listed in `plan.md`, and sets `android:dataExtractionRules` and `android:fullBackupContent`; the test checks, by reading versioned files, that `allowBackup` is false, that the plugin is listed in `app.json` and that both XML files exclude every domain; after `npx expo prebuild --platform android --clean` the manifest has both attributes, and on the emulator `adb shell bmgr backupnow` reports that the app takes no part in backup.
  - Scenarios:
    - Happy path: `prebuild` for Android, then a dev build on the emulator.
    - Boundaries: the rules for Android 12 and later (`dataExtractionRules`) and for Android 11 and lower (`fullBackupContent`) are both present. each of the nine domains of `plan.md` (`root`, `file`, `database`, `sharedpref`, `external`, `device_root`, `device_file`, `device_database`, `device_sharedpref`) is excluded in `<cloud-backup>`, in `<device-transfer>` and in `full_backup_content.xml`, checked one by one in a loop.
    - Outside the rules: not applicable.
    - Odd data: running `prebuild` twice does not duplicate the attributes or the XML files. an `AndroidManifest.xml` that already has `android:dataExtractionRules` or `android:fullBackupContent` (from another plugin) ends with one attribute of each, ours; a `res/xml/` folder that already holds other files keeps them.
    - Sequences: `prebuild`, change nothing, `prebuild` again → identical output.
    - Interruptions: not applicable.
    - Mistakes: an XML without the `<device-transfer>` section, or missing one domain, fails the test. `allowBackup` set to `true` in `app.json`, the plugin removed from `plugins`, or the plugin listed twice each fail the test; the test names carry `RF-088 E-028`, so the traceability check counts them (E-028 itself is the device check).
  - Pending: nothing.

- [x] **T026** · Keep the data out of iOS backups: config plugin, iOS part, and Security audit of the plugin (RF-088, E-028)
  - Layer and files: configuration · `plugins/with-backup-exclusion.js` (iOS part, with `withAppDelegate`), `tests/plugins/with-backup-exclusion.test.ts` (Swift fragment), `docs/security.md` (iOS control and audit checklist), device check in `review.md`.
  - Done when: the database folder is the one of the installed expo-sqlite's `defaultDatabaseDirectory`; the plugin adds tagged, idempotent launch code to `AppDelegate.swift` that creates that folder if missing and sets `isExcludedFromBackup`, and throws if its anchor is missing; the test checks the Swift fragment; after `npx expo prebuild --platform ios --clean`, `xattr` on the iOS simulator shows the exclusion on the database folder; Security has audited the whole plugin, both platforms.
  - Scenarios:
    - Happy path: `prebuild` for iOS, then a dev build on the simulator.
    - Boundaries: the folder does not exist yet on first launch → it is created and excluded. the folder already exists with a WAL file inside → the exclusion is set and no file is deleted; the folder path in the Swift fragment equals the `defaultDatabaseDirectory` that the test reads from the installed expo-sqlite.
    - Outside the rules: not applicable.
    - Odd data: running `prebuild` twice does not duplicate the iOS code. the tag markers appear exactly once in `AppDelegate.swift` after two merges; an anchor with different indentation still matches or the plugin throws, never silently skips.
    - Sequences: `prebuild`, change nothing, `prebuild` again → identical output.
    - Interruptions: the exclusion runs at native launch, before the JavaScript opens the database: in the generated Swift the exclusion call comes before the React Native start-up line (the test compares their positions), so a first launch killed right after the folder is created still has it excluded.
    - Mistakes: an `AppDelegate.swift` without the anchor makes the plugin throw with a clear message; the Library/Caches folder is never used. the iOS merge leaves the Android part untouched (the T025 tests still pass) and an iOS-only `prebuild` writes no Android file.
  - Pending: the simulator `xattr` device check (`npx expo prebuild --platform ios --clean`, dev build, `xattr` on the SQLite folder) is for Fernando. SEC-T026-3 is carried to T029: it must call `openDatabaseSync` without a `directory` argument, because the default folder is the excluded one.

- [x] **T027** · Schema, first migration and the migration bundle script (RF-011, RF-082)
  - Layer and files: data and tooling · `drizzle.config.ts` (moved here from T024: `dialect: "sqlite"`, no driver, `schema: "./src/data/schema.ts"`, `out: "./src/data/migrations"`), `src/data/schema.ts`, `src/data/migrations/` (generated SQL and `meta/`), `scripts/bundle-migrations.mjs`, `src/data/migrations/bundle.ts` (generated), `package.json` (`db:generate`), `tests/scripts/bundle-migrations.test.ts`.
  - Done when: the five tables of `plan.md` (`teams`, `players`, `matches`, `call_up_entries`, `marks`) exist with every column, check, unique index, index and cascade of the plan's table in the generated SQL; `bundle.ts` exports the journal and every migration as a string, in the shape that the installed `drizzle-orm/expo-sqlite/migrator` `migrate()` expects (checked against its types; Drizzle's current Expo guide is written for the 1.0 release candidate, with `babel-plugin-inline-import`, so it is not the reference for 0.45); `db:generate` runs `drizzle-kit generate` and then the script; the test fails when `bundle.ts` differs from the SQL files; `drizzle-kit check` green.
  - Scenarios:
    - Happy path: `npm run db:generate` writes the SQL and the bundle.
    - Boundaries: a migration with quotes, backticks and `${` in its SQL is bundled unchanged. the generated SQL carries each check and key of the plan: `default_format` and `format` in (4, 6, 8), `column_kind` in ('period', 'overtime'), `mark` in ('starter', 'sub'), both scores null or both set, the unique (`match_id`, `player_id`), the primary key of `marks`, and `ON DELETE CASCADE` on every foreign key (a test reads the SQL text).
    - Outside the rules: not applicable.
    - Odd data: a journal with one entry. a missing `meta/_journal.json`, or a journal entry without its `.sql` file, makes the script exit non-zero with a message and leaves the previous `bundle.ts` untouched.
    - Sequences: generating twice with no schema change changes no file.
    - Interruptions: the script reads every file before it writes `bundle.ts`, so an error halfway (an unreadable `.sql`) never leaves a half-written bundle.
    - Mistakes: editing a `.sql` file without re-bundling turns the test red. `bundle.ts` assigned to the parameter type of the installed `migrate()` compiles with `tsc`, so a change in the shape between drizzle-orm versions turns it red; every journal entry has its snapshot file in `meta/` (checked by the tests; `drizzle-kit` 0.31 does not fail on a missing snapshot).
  - Size (review D2-A-06, checked): not split. The schema has no test of its own until T028, so the bundle script and its test are what make this task testable; the five tables are declarative and the script is small.
  - Pending: nothing.

- [x] **T028** · Shared database type, test database helper and schema tests (RF-016, RF-017, RF-025)
  - Layer and files: data and tests · `src/data/database-types.ts` (created here: `AppDatabase`), `tests/support/test-database.ts` (in-memory `better-sqlite3` with `drizzle-orm/better-sqlite3`, the real SQL files applied with `migrate()` from `drizzle-orm/better-sqlite3/migrator`), `src/data/schema.checks.test.ts` and `src/data/schema.cascades.test.ts` (two files, to stay under 250 lines).
  - Done when: `src/data/database-types.ts` exports `type AppDatabase = BaseSQLiteDatabase<"sync", unknown, typeof schema>` (`BaseSQLiteDatabase` from `drizzle-orm/sqlite-core`), the one type that the repositories, the store factories, `database.ts` and the test helper share (`plan.md` "Data"); `tsc` passes with the `better-sqlite3` database assigned to `AppDatabase` here, and with the `expo-sqlite` one in T029; if `tsc` does not accept `unknown` as the run result, the second type argument becomes the union of both drivers' run-result types, decided here and written in `plan.md` "Deviations"; repositories never read the driver's run result (new IDs come from `.returning()`), so the choice never leaks into them; the helper opens a migrated database per test with foreign keys on, typed as `AppDatabase`; tests prove each check and each cascade; no file under `src/` imports `better-sqlite3`; `src/state/` can import `AppDatabase` without `react-native`.
  - Mutation cache: this task changes `tests/support/`: the next CI run with domain changes is full (rule 5).
  - Scenarios:
    - Happy path: a fresh database migrates and has the five tables.
    - Boundaries: format 4 and 8 accepted, 5 rejected by the check; "0" and "00" stored distinct. score 0–0 and 999–0 are stored; `overtime_count` is 0 and `is_active` is true by default; a team and category name of 40 characters and notes of 500, with accents, emoji and quotes, are stored unchanged.
    - Outside the rules: only one score set → rejected by the check. the same player twice in one match's call-up is rejected by the unique index, and the same player in two matches is accepted; two players with the same name and number in one team are both stored (RF-017).
    - Odd data: two players with the same number in one team are accepted (RF-017). a team with a null category, a match with a null time and a player with the number "00".
    - Sequences: migrating twice does nothing the second time.
    - Interruptions: a transaction that fails halfway leaves nothing written.
    - Mistakes: deleting a team removes its players, matches, call-up entries and marks; deleting a call-up entry removes its marks. a player for a team that does not exist is rejected (foreign keys on); a mark with `mark = 'x'` or `column_kind = 'week'` is rejected; deleting one match leaves the other matches of the same team.
  - Pending: nothing.

- [x] **T029** · Open the database and migrate at start-up (RF-011, RF-082)
  - Layer and files: data, state and app · `src/data/database.ts`, `src/state/database-ready.ts`, `src/app/_layout.tsx`, `tests/support/mock-database.ts` (the `jest.mock` helper for `@/data/database`), tests. `src/state/app-stores.ts` is created in T032, with its first store (review D2-A-13).
  - Done when: `database.ts` opens the database with `openDatabaseSync` from `expo-sqlite` in its default directory (`defaultDatabaseDirectory`, the folder T026 excludes from iOS backups; no `directory` argument, SEC-T026-3 of Security), wraps it with `drizzle()` from `drizzle-orm/expo-sqlite`, sets `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`, and runs `migrate()` from `drizzle-orm/expo-sqlite/migrator` with `bundle.ts` once; it gives the database, typed as `AppDatabase` (T028; `tsc` passes with the `expo-sqlite` database assigned to it), through a getter, and opens it only when `initializeDatabase()` runs, so importing it never touches the native module; `initializeDatabase(): Promise<void>` (`database-ready.ts`) is called by the root layout, which keeps the splash screen with `expo-splash-screen` (API read in the SDK 58 docs) until it ends; `SQLiteProvider` and `useSQLiteContext` are not used (`plan.md` "Data"); screen tests can replace `@/data/database` with the in-memory database through the helper; the dev build starts on both platforms with an empty list.
  - Scenarios:
    - Happy path: first launch creates and migrates the database.
    - Boundaries: second launch does not migrate again. `initializeDatabase()` called twice at the same time opens and migrates once, and both calls end together.
    - Outside the rules: not applicable.
    - Odd data: an existing database with the first migration applied, opened with a bundle that has one more migration (a test double), applies only the new one and keeps every row; asking for the database before `initializeDatabase()` has run throws a clear error, never returns `undefined`.
    - Sequences: kill the app during the splash, launch again → still opens.
    - Interruptions: a failing migration keeps the splash and shows nothing half-made (state test with a throwing double). also a failure while opening the file: the splash stays and no screen is rendered.
    - Mistakes: no screen renders before the database is ready. importing `@/data/database` in a Jest test never loads `expo-sqlite`; both PRAGMAs are set (`foreign_keys` reads 1 and `journal_mode` reads `wal`, checked through the double).
  - Mutation cache: this task changes `tests/support/`: the next CI run with domain changes is full (rule 5).
  - Pending: nothing.

## US1 · Create teams and players

- [x] **T030** · Domain: team and player validation, team order (RF-013, RF-016, RF-073, E-021)
  - Layer and files: domain · `src/domain/squad-validation.ts`, `src/domain/team-order.ts`, tests.
  - Done when: `ValidationError` is the union `"nameRequired" | "numberInvalid" | "scoreIncomplete" | "scoreInvalid"` of `plan.md` (`scoreInvalid` is used from T037); `Validation<T>` is `{ kind: "valid"; value: T } | { kind: "invalid"; errors: readonly ValidationError[] }`; `validateTeamInput({ name, category })` (one parameter) returns either the errors or the **normalised value**: the name trimmed at both ends and the category trimmed, with an empty or spaces-only category as `null`; a name that is empty or only spaces (or tabs and newlines) gives `nameRequired`; `validatePlayerInput({ name, number })` returns the errors (`nameRequired`, `numberInvalid` as RF-016 and E-021 say) or the value with the name trimmed and the number as given (the number is never trimmed: " 7" is invalid); `compareTeams` sorts alphabetically in Spanish (RF-073). The state layer saves only the `value` these functions return, so trimming lives in the domain and nowhere else (answer of 2026-11-12). The E-021 cases are one `it.each` table with one literal title carrying `RF-016 E-021`.
  - Mutation: first D2 task that changes `src/domain/`; the trimming and the normalised value are domain behaviour, covered by this full run. Run the full local Stryker run (rule 4: `STRYKER_INCREMENTAL=1 STRYKER_FORCE=1 npm run verify`), which also creates the local incremental file, and record its time in the commit body; at the next CI run, check in the job log that the cache was restored (the changes of T024, T080, T028 and T029 make that first run full) and that the run after it reuses the file.
  - Scenarios:
    - Happy path: «Cadete B» and «Alevín A» → «Alevín A» first. `validateTeamInput({ name: "Alevín A", category: "2015" })` and `validatePlayerInput({ name: "Ana", number: "7" })` return no errors.
    - Boundaries: E-021: "0", "00", "7", "99" valid; "07", "100" and "" give `numberInvalid`. "9" and "10" valid; "01", "000" and "0 " give `numberInvalid`; a name of 1 and of 40 characters is valid; a category of `null`, of "" and of only spaces is valid.
    - Outside the rules: a number already used by another player never gives an error, because the validator takes no list of players (RF-017; the warning is `duplicateNumbers`).
    - Odd data: "7a", " 7", "-1" invalid; names with spaces around are trimmed (« Alevín A » → value «Alevín A»; « Ana » → «Ana»); a category « » or "" → value `null`, « 2015 » → «2015»; inner spaces are kept («Alevín A» stays as typed); accents and capitals sorted naturally. an empty name together with an invalid number gives both errors, always in the same order; digits that are not ASCII ("٣", full-width "７"), "7.0", "+7", "1e1" and a number with a tab or a newline inside are `numberInvalid`; a name of tabs and newlines is blank; names with emoji and accents are valid. Properties (fast-check): for every integer from 0 to 99 its decimal text is valid, every text that is not one of the 101 valid numbers ("0"–"99" and "00") is `numberInvalid`, and neither function throws for any string.
    - Sequences: `compareTeams` gives the same order for any permutation of the same teams (property) and sorting twice changes nothing; two teams with the same name compare as equal and both are kept (RF-014); «Ñandú» comes after «Nuño» and «álvaro» next to «Alba», not at the end.
    - Interruptions: not applicable.
    - Mistakes: a name of only spaces is blank. a team name of only spaces is `nameRequired`, and a missing category (`null`) is never an error.
  - Pending: nothing.

- [x] **T031** · Data: team and player repositories (RF-013, RF-014, RF-016, RF-017, RF-085)
  - Layer and files: data · `src/data/records.ts` (`TeamRecord`, `PlayerRecord`), `src/data/team-repository.ts`, `src/data/player-repository.ts`, `team-repository.test.ts` and `player-repository.test.ts` with `tests/support/test-database.ts`.
  - Done when: `createTeam`, `updateTeam`, `listTeams` and `getTeam` create, edit, list and read teams; `createPlayer` and `listPlayers` create players and list them for one team only; duplicates are saved; records carry the format as a number and lists come in database order (sorting is the state layer's, review P-01); repositories take the database as an argument typed as `AppDatabase` (T028), use only Drizzle's synchronous API with parameters, and read new IDs with `.returning()`; `src/data/` imports only types from the domain; a failing write throws and leaves nothing written.
  - Scenarios:
    - Happy path: create two teams → both listed. create a player in a team → `listPlayers` for that team returns it, and `listPlayers` for another team does not.
    - Boundaries: "0" and "00" stored and read back distinct. a team name and a category of 40 characters and a player name of 40 are stored and read back unchanged; `getTeam` with an unknown ID returns nothing, without throwing.
    - Outside the rules: a second player 7 is saved. a second player with the same name and number as an existing one is also saved (RF-017).
    - Odd data: a category of null and an empty list of players. names with accents, emoji and an apostrophe («D'Angelo»); the number "00" next to "0"; two teams with the same name are two rows (RF-014). The repository stores what it is given: a missing category arrives as `null`, because the state layer passes the value normalised by `validateTeamInput` (T030; answer of 2026-11-12); a `null` category is read back as `null`, never as "" or «null».
    - Sequences: create, edit name and category, read back. Also: change the default format 6 → 8 with `updateTeam`, read back → 8, and no match changes (T038 owns matches).
    - Interruptions: a write that fails halfway leaves nothing.
    - Mistakes: a name with quotes or `'; DROP TABLE` is stored as text (parameterised queries). `updateTeam` with an unknown ID changes no row and does not throw; `updateTeam` with a default format of 5 throws and leaves the team as it was (the check constraint), which the state layer turns into `saveFailed`.
  - Pending: nothing.

- [x] **T032** · State: squad store, route parameters, format options and save results (RF-001, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073, RF-085, E-020)
  - Layer and files: state · `src/state/squad-store.ts` (factory `createSquadStore(db)`), `src/state/route-params.ts`, `src/state/format-options.ts`, `src/state/save-result.ts`, `src/state/app-stores.ts` (created here, with the squad store built on the database of `database.ts`), tests split as `squad-store.teams.test.ts`, `squad-store.players.test.ts` and `route-params.test.ts`.
  - Done when: the store publishes `teams` sorted with `compareTeams` and, for the open team, `players` sorted with `comparePlayers` and `duplicateNumbers`; its actions are `loadTeams()`, `openTeam(id)`, `createTeam(input)`, `updateTeam(id, input)` and `addPlayer(input)`, each returning a `SaveResult` (`saved`, `invalid` with its `ValidationError`s, `saveFailed`, or `unchanged` when there was nothing to do) when it writes; they validate with `validateTeamInput` and `validatePlayerInput` and save the normalised `value` they return (names and category trimmed, an empty category as `null`; T030), through the repositories of T031, and only then publish; `createTeam` saves the default format chosen in the form as the team's `defaultFormat`; invalid input saves nothing; a failed write returns `saveFailed` and publishes nothing; `openTeam` with an unknown ID publishes "not found"; `addPlayer` with no team open returns `unchanged` and writes nothing; a failed **read** reuses the existing states, with no new text (known D2 limit, answer of 2026-11-12): `loadTeams` that throws publishes an empty list (the screen shows `teams.empty`), and `openTeam` that throws publishes "not found"; `route-params.ts` turns `teamId`, `playerId` and `matchId` into positive integers or `null`, accepting only the canonical text of a positive integer: the text is converted to a number and kept only if it is a safe positive integer whose decimal text is exactly the original (round trip), so «01», «1.0», «+1», « 1» and «1e3» are `null`; `format-options.ts` exports `formatOptions`, the domain's `FORMATS` (RF-001), and `NEW_TEAM_DEFAULT_FORMAT = 6`, the format the new-team form starts with (answer of 2026-11-12).
  - Scenarios:
    - Happy path: create team → appears in the sorted list. the squad store opened on a team with players 9, 4 and 7 publishes 4, 7, 9; `formatOptions` is exactly `[4, 6, 8]` (RF-001); `createTeam` with format 8 → the team's `defaultFormat` is 8, and with the form's default → 6.
    - Boundaries: adding the second 7 publishes the duplicate warning; E-020 order published. "0" and "00" in the same team are not a duplicate (no warning); three players with 7 publish "7" once; two pairs (7 and 9) publish both numbers; a team name and category of 40 characters are saved.
    - Outside the rules: the second 7 is saved and published, never rejected (RF-017).
    - Odd data: route parameter "abc", "0" or "-1" → `null`; a well-formed ID of a team that does not exist → not found. Also: route parameter "1.5", "1e3", "", `undefined`, an array `["1", "2"]` and "9007199254740993" → `null`; "01", "007", "1.0", "+1" and " 1" → `null` (only the canonical text is valid), "1" and "42" → 1 and 42; a team name « Alevín A » with category « » is saved as «Alevín A» with a `null` category, and a player « Ana » as «Ana» (the value of T030); `addPlayer` when no team is open → `unchanged`, nothing saved, nothing thrown; `loadTeams` with a repository double that throws → `teams` empty, nothing thrown; `openTeam` with a double that throws → "not found".
    - Sequences: create team, add three players, list in number order. Also: open team A, then team B → `players` and `duplicateNumbers` are B's only; update a team's name and category → `teams` is re-sorted at once (renaming «Alevín A» to «Zaragoza» moves it last).
    - Interruptions: a new store reads the same data from the database.
    - Mistakes: blank team name → error, nothing saved; repository throws → `saveFailed`, list unchanged. Also: blank name and invalid number together → `invalid` with both errors and nothing saved; `updateTeam` with an unknown ID → `saveFailed`, list unchanged; after a `saveFailed`, the next valid action returns `saved` (the failure is not remembered).
  - Pending: nothing.

- [x] **T033** · UI: navigation and the list of teams (RF-012, RF-014, RF-073)
  - Layer and files: app · `src/app/_layout.tsx` (the `Stack`, with the header of the list, `teams.title`), `src/app/index.tsx`, `src/i18n/es.json` (`teams.title`, `teams.empty`), tests in `tests/app/` (`renderRouter`, with the database mock of T029).
  - Done when: the app opens on the list of teams, sorted alphabetically, read from the squad store's `loadTeams()`; an empty list shows `teams.empty`; every text comes from `es.json`. The list has no links yet: «Nuevo equipo» arrives with its route in T034 and the link to a team with its route in T035 (D2 rule 8, review D2-A-10).
  - Scenarios:
    - Happy path: «Cadete B» and «Alevín A» → «Alevín A» first (RF-073). the header shows «Equipos» (`teams.title`) and the root route has no back button.
    - Boundaries: one team; no team → «Todavía no hay equipos. Crea el primero.». Also: two teams → both listed; a name with leading spaces is shown without them.
    - Outside the rules: not applicable.
    - Odd data: a 40-character team name is cut with an ellipsis; names with accents. Also: a team name with emoji; a team without category shows no empty category line.
    - Sequences: a team created through the store appears in the list without restarting.
    - Interruptions: launching the app again shows the list of teams first (RF-073).
    - Mistakes: two teams with the same name are both listed (RF-014). Also: no English text anywhere on the screen (RF-012: every visible text is in `es.json`, checked by querying the Spanish texts only); the list screen is built only after the database is ready (T029), so it never shows `teams.empty` for a moment before the teams load. If reading the teams fails (repository double that throws), the screen shows the empty list with `teams.empty` and no other text (answer of 2026-11-12; known D2 limit, T061).
  - Pending: the phase-0 placeholder test `tests/app/index.test.tsx` (old home title) was deleted, authorized by the developer on 2026-11-13. Device check (header «Equipos» on iOS and Android) is for the developer.

- [x] **T034** · UI: new-team form, format picker, input limits and save error (RF-001, RF-012, RF-013, RF-082, RF-085, E-022, E-029)
  - Layer and files: app and UI · `src/app/teams/new.tsx` (modal, header `teams.new`), `src/app/index.tsx` (the «Nuevo equipo» button), `src/ui/team-form.tsx`, `src/ui/format-picker.tsx`, `src/ui/input-limits.ts`, `src/ui/save-error-banner.tsx`, `src/i18n/es.json` (`teams.new`, `team.field.name`, `team.field.category`, `team.field.defaultFormat`, `common.save`, `format.option`, `validation.nameRequired`, `error.saveFailed`), tests in `tests/app/` and next to the components.
  - Done when: «Nuevo equipo» on the list opens `/teams/new`; the form starts with «6 periodos» selected (`NEW_TEAM_DEFAULT_FORMAT`, T032), which the coach can change, and the chosen format is saved as the team's default format (answer of 2026-11-12); a team is created with name, category and default format; names and category are saved trimmed, an empty or spaces-only category as `null`, and a spaces-only name shows «Escribe un nombre.» (T030); while a save is running, «Guardar» ignores new presses, so two quick presses create one team; the format picker shows exactly «4 periodos», «6 periodos» and «8 periodos» from `formatOptions`; `input-limits.ts` holds the limits as constants, `NAME_MAX_LENGTH = 40`, `NOTES_MAX_LENGTH = 500`, `SCORE_MAX_LENGTH = 3` and `NUMBER_MAX_LENGTH = 2` (the player number, RF-016, E-022), and name and category stop at 40 characters (`maxLength`) with no message; a successful «Guardar» returns with `router.back()` to the list (plan "After «Guardar»"); leaving the form without «Guardar» discards it without asking; a failed save shows `error.saveFailed` in `save-error-banner.tsx`, drawn over the screen so it takes no layout height. `team-form.tsx` takes the initial values and an `onSave` callback as props, so T081 reuses it for editing. No component function passes 60 lines: the fields are split out of `team-form.tsx` if needed.
  - Scenarios:
    - Happy path: create «Alevín A», 6 periods → listed. Also: the form opens in a modal with the header «Nuevo equipo»; the three fields are found by their labels «Nombre», «Categoría» and «Variante por defecto».
    - Boundaries: the format picker shows exactly three options; a 40-character name is saved, a 41st character is not accepted (E-022). Also: the category has `maxLength` 40 and a 40-character category is saved; name and category show no message at the limit; RNTL's `changeText` does not apply `maxLength`, so the tests check the prop and T036 types 41 characters for real (E-022).
    - Outside the rules: a team whose category is the same as another team's, and two teams with the same name, are both saved (RF-014); nothing about a team is blocked except a blank name.
    - Odd data: empty category. Also: a name with spaces around is saved without them and shown as «Alevín A»; accents and emoji; a category of only spaces is saved as `null` and the list shows no category line; a name of only spaces → «Escribe un nombre.», nothing saved; opening the form and pressing «Guardar» at once → only «Escribe un nombre.»; the form opens with «6 periodos» selected, and a team saved without touching it has default format 6.
    - Sequences: create two teams one after the other, both listed in order. Also: change the format option 4 → 8 → 6 before saving → the team is saved with 6.
    - Interruptions: go back from a half-filled form → no question, no team saved (RF-082); E-029 as far as Jest can go: type «Cadete B» in the new-team form, unmount it without «Guardar» (the app being closed), render the list of teams with a new squad store on the same in-memory database → no «Cadete B», and every team saved before is listed (the real close and reopen is T036). Also: pressing the Android Back button, or the header's back button, with the form half-filled leaves it with no question and saves nothing; rotating the device keeps the typed text.
    - Mistakes: save with a blank name → «Escribe un nombre.», nothing saved; save fails → message, team not in the list. Also: after a failed save the form stays open with its text, so the coach can press «Guardar» again, and the next successful save closes it and hides the message; two quick presses on «Guardar» → one team in the database (the button ignores presses while saving; one test).
  - Pending: authorized by the orchestrator on 2026-11-13: `screenTexts()` in `tests/support/screen-reading.ts` now drops the text «Nuevo equipo» (the new button on every list), so the T033 assertions in `teams-list.test.tsx` stay unchanged. The header, the modal and the title are set in `src/app/_layout.tsx` through `screenOptions` by route name, because `layout.test.tsx` mocks `Stack` without `Stack.Screen`. Device check (modal look, keyboard, Android Back button) is for the developer; T036 types 41 characters for real.

- [x] **T081** · UI: edit-team route and the not-found state (RF-013, RF-082, RF-085)
  - Layer and files: app and UI · `src/app/teams/[teamId]/edit.tsx` (modal, header `common.edit`), reusing `src/ui/team-form.tsx`, `src/ui/not-found.tsx`, `src/i18n/es.json` (`common.edit`, `notFound.message`), tests in `tests/app/`. Taken out of T034 on 2026-11-12 (review D2-A-06).
  - Done when: the edit route shows the team's saved name, category and default format and saves them with the squad store's `updateTeam`; a successful «Guardar» returns with `router.back()`; leaving without «Guardar» keeps the saved data; a failed save shows `error.saveFailed` and changes nothing; with a malformed or unknown `teamId` the route shows only `notFound.message` («No se ha encontrado: puede que se haya borrado.») and changes nothing. This is the first route with an ID, so `not-found.tsx` is created here and reused by T035, T046, T047 and later screens. The link to this route is added by the team screen in T035.
  - Scenarios:
    - Happy path: edit «Alevín A» to «Alevín B» and category «2015» → the list shows the new data (RF-013). Also: the header shows «Editar» (`common.edit`) and the fields start with the saved name, category and default format.
    - Boundaries: a 40-character name is kept; the 41st character is not accepted.
    - Outside the rules: not applicable.
    - Odd data: `/teams/abc/edit`, `/teams/0/edit` and the ID of a team that does not exist → not-found message. Also: `/teams/1.5/edit` and `/teams/1/edit` for a team that was just deleted directly in the database → not-found message; a team with no category shows an empty category field, and clearing the category (or leaving only spaces) saves no category (`null`, T030), never "" or the text «null».
    - Sequences: edit twice, the list shows the last data; change the default format 6 → 8, existing data unchanged. Also: edit the name to the same value → saved without error and the list is unchanged.
    - Interruptions: leave the edit form without «Guardar» → no question, saved data unchanged (RF-082).
    - Mistakes: blank name → «Escribe un nombre.», nothing saved; save fails → message, old data still shown. Also: after a failed save the list still shows the old name; the next successful save hides the message; the edit form never changes another team.
  - Pending: the edit route is reachable only by a push until T035 adds the «Editar» button on the team screen. The Test designer fixed a nested `act` around `testRouter.push` in the tests before this task was finished. The route opens the team in the store before its first render (a `useState` initializer, because the lint rules forbid `setState` in an effect and reading a ref in render), so the store never shows another team's data. Device check (modal look, keyboard, Android Back button) is for the developer.

- [x] **T035** · UI: team screen with sorted players, new player form and duplicate-number warning (RF-016, RF-017, RF-069, E-020, E-021, E-022)
  - Layer and files: app and UI · `src/app/index.tsx` (each team opens its screen), `src/app/teams/[teamId]/index.tsx` (header: the team's name), `src/app/teams/[teamId]/players/new.tsx` (modal, header `players.new`), `src/ui/player-form.tsx`, `src/ui/warnings/duplicate-number-banner.tsx`, `src/i18n/es.json` (`team.players`, `players.new`, `player.field.name`, `player.field.number`, `validation.numberInvalid`, `warning.duplicateNumber`, `common.edit`), tests.
  - Done when: tapping a team in the list opens `/teams/[teamId]`; the team shows its players sorted (number and name); the team screen links to the edit route of T081 («Editar») and to the new-player form («Nuevo jugador»); a player is added with name and number; the name stops at `NAME_MAX_LENGTH` and the number at `NUMBER_MAX_LENGTH` (T034); a blank name shows `validation.nameRequired` and an invalid number `validation.numberInvalid`; a successful «Guardar» returns with `router.back()` to the team screen; the player name is saved trimmed and a spaces-only name shows «Escribe un nombre.» (T030); while a save is running, «Guardar» ignores new presses, so two quick presses add one player; the duplicate-number banner lists the numbers (`warning.duplicateNumber`); a team with no players shows an empty list with no text (there is no approved text for it; known D2 limit, answer of 2026-11-12); an unknown `teamId`, or a team whose read fails, shows `notFound.message`.
  - Scenarios:
    - Happy path: add 9, 4, 7 → 4, 7, 9. Also: the team screen shows the team's name as the header, the sorted players and the «Editar» and «Nuevo jugador» links.
    - Boundaries: E-020 order on screen; the number field accepts at most two characters. Also: the player name field has `maxLength` 40 and a 40-character name is saved (US1 criterion 4, E-022); E-021 at screen level, as a table: "0", "00", "7" and "99" are saved, "07", "100" and an empty number show the message and save nothing (the test double does not apply `maxLength`, so "100" goes straight to the validation).
    - Outside the rules: second 7 saved and the banner appears.
    - Odd data: unknown `teamId` → «No se ha encontrado: puede que se haya borrado.», on the team screen and on the new-player route. Also: an empty name → «Escribe un nombre.»; Luis 7 and Ana 7 → Ana first; "0" and "00" in the same team → both listed, "0" first and no duplicate-number banner (they are different numbers); three players with 7 → the banner names 7 once; a team with no players shows an empty list with no text and no banner (answer of 2026-11-12); a player name « Ana » is listed as «Ana».
    - Sequences: add players one after another without leaving the screen. Also: the banner appears at the moment the second 7 is saved, without leaving the screen.
    - Interruptions: leaving the new-player form without «Guardar» saves nothing. Also: the new-player form half-filled and the app closed (the tree unmounted and a new store on the same in-memory database) → the team has no new player and the players saved before are listed (US1 criterion 5, RF-082).
    - Mistakes: "07" or a missing number → «El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.» (E-021). Also: a blank name and an invalid number together → both messages; a failed save (throwing double) → `error.saveFailed`, the player is not listed and the form keeps its text (RF-085); two quick presses on «Guardar» → one player in the database (the button ignores presses while saving; one test).
  - Pending: the team screen's header title is set with `<Stack.Screen options>` inside the route, because the layout cannot know the team's name (the other titles stay in `screenOptions` by route name). With the orchestrator's authorization, `updateTeam` in the squad store also refreshes the open `team`, so the header shows the new name after «Editar» and «Guardar». Device check (modal look, keyboard, header, Android Back button) is for the developer.

- [x] **T036** · Maestro set-up, US1 journey and form interruption (RF-011, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073, RF-082, E-029)
  - Layer and files: e2e · install the Maestro CLI on the Mac (not npm); `e2e/us1-teams-and-players.yaml`, `e2e/us1-form-interruption.yaml` (`stopApp`, `launchApp`); how to run them in `summary.md`.
  - Done when: the flows create two teams and players including a duplicate number, check order and warning, and reproduce E-029; each flow's `name` carries the IDs it covers (D2 rule 7), for example `name: "RF-073 RF-082 E-029: form left half-filled when the app closes"`; they pass on the iOS simulator and the Android emulator; output in `review.md`.
  - Scenarios:
    - Happy path: the US1 acceptance criteria 1–5, with no network; E-029: create «Alevín A» (6 periods) and «Cadete B» → «Alevín A» is listed first (RF-073, RF-014); add players 9, 4 and 7 to one team → shown 4, 7, 9 (RF-016). Maestro cannot switch the network off; the airplane-mode check of RF-011 is T079.
    - Boundaries: type 41 characters into the team name, the category and the player name with `inputText` → each field shows 40 and no message appears (E-022; Jest cannot prove this, because `changeText` does not apply `maxLength`); type "100" into the number → the field keeps "10".
    - Outside the rules: add a second player with number 7 → saved, and the duplicate-number warning is shown (RF-017, RF-069).
    - Odd data: players with the numbers "0" and "00" and a team with an empty category → saved; "0" is listed before "00".
    - Sequences: create two teams one after the other and, in one of them, add three players without leaving the team screen.
    - Interruptions: E-029: type «Cadete B» in the new-team form, `stopApp`, `launchApp` without `clearState` → the list of teams, without «Cadete B», with the teams saved before; the same with a half-filled new-player form → the team has no new player.
    - Mistakes: «07» in the number → «El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.»; a blank team name → «Escribe un nombre.»; going back from a half-filled form shows no question and saves nothing.
  - Pending: flows written, NOT run on the iOS simulator or the Android emulator (decision of Fernando, 2026-11-13: Maestro is not installed or run in this session). Fernando installs Maestro (>= 2.7.0, needed for accents in `inputText` on Android) and runs `maestro test e2e/us1-teams-and-players.yaml` and `maestro test e2e/us1-form-interruption.yaml` on a Release build (`npx expo run:ios --configuration Release`, `npx expo run:android --variant release`); the output then goes to `review.md`. Risks: ambiguous `tapOn` of labels and inputs (a `testID` may be needed), iOS value assertions, iOS swipe-down to dismiss a modal, `hideKeyboard` flakiness.

**US1 checkpoint:** Fernando creates teams with name, category and default format, adds players, sees them sorted by number and sees the duplicate-number warning, on iPhone and Android.

## US2 · Create a match and its call-up

- [x] **T037** · Domain: match input, defaults and date and time display (RF-025, RF-026, RF-036, RF-083, RF-084, E-023, E-032)
  - Layer and files: domain · `src/domain/match-input.ts`, `src/domain/match-date.ts`, tests.
  - Done when: `newMatchDefaults(defaultFormat, today)` gives the team's default format, `today` and no time; `validateMatchInput({ homeName, awayName, notes, homeScore, awayScore })` (one parameter; the scores as the text typed) returns the errors or the **normalised value** (`Validation<T>` of T030): home and away names and notes trimmed at both ends, an empty or spaces-only name or notes as `null`, each score empty → `null` and digits → the number («007» → 7); a score that is not a whole number from 0 to 999 («7a», «-1», «1.5») gives the new error `scoreInvalid` (answer of 2026-11-12); one score without the other gives `scoreIncomplete`, and both or none gives no error; the state layer saves only that value; `displayDate` and `displayTime` give «01/03/2026» and «18:30», and `displayTime(null)` gives `null`; `isoDate` and `isoTime` pad with zeros; the domain never reads the clock (`today` is a parameter). Table tests use one literal title per table with its IDs (for example `RF-083 E-023 E-032`).
  - Mutation: changes `src/domain/` (`validateMatchInput` with its trimming, score parsing and `scoreInvalid`). Run the full local Stryker run (rule 4) and record its time in the commit body; check, at the next CI run, that only the new mutants run (the cache from the run after T030 is reused).
  - Scenarios:
    - Happy path: team with 6 periods, today 2026-11-11 → 6 periods, 2026-11-11, no time; E-023 → «11/11/2026». Also: `newMatchDefaults(8, "2026-11-11")` and `newMatchDefaults(4, …)` give 8 and 4 periods; `isoDate({ year: 2026, month: 3, day: 1 })` gives "2026-03-01" and `isoTime({ hour: 9, minute: 5 })` gives "09:05".
    - Boundaries: score 0–0 and 999–0 valid; both empty valid; 00:00 and 23:59. Also: 1 January and 31 December («01/01/2026», «31/12/2026»), the leap day 2028-02-29, the year boundary as `today`; 0–0 is a valid score and `homeScore` "0" with `awayScore` "" is `scoreIncomplete` (0 is a value, not empty).
    - Outside the rules: a date in the past or far in the future, and a score such as 999–0, are valid: the domain blocks nothing else.
    - Odd data: no time → `displayTime` returns `null` (E-032 after «Quitar hora»). Also: `isoDate` and `isoTime` pad single digits; property: `displayDate(isoDate(parts))` and `displayTime(isoTime(parts))` read back the same parts for any valid day, month, hour and minute.
    - Sequences: the same inputs always give the same outputs (the domain never reads the clock: `newMatchDefaults` with two different `today` values gives two different dates).
    - Interruptions: not applicable.
    - Mistakes: only the home score → `scoreIncomplete`; 1 March is «01/03/2026», never «1/3/2026». Also: «007» and «0» → 7 and 0; «» → `null`; «7a», «-1», «1.5», « 7» and «1000» → `scoreInvalid`; a home name « » → `null` and « Ana CB » → «Ana CB»; notes « » → `null`; a `scoreInvalid` score with the other one empty gives `scoreInvalid` (the incomplete check looks only at valid scores); the quoted examples E-023 («11/11/2026») and E-032 («01/03/2026», «18:30») pass through the public functions.
  - Pending: nothing.

- [x] **T038** · Data: match repository, create with call-up snapshot and read, and the grid records (RF-019, RF-025, RF-026, RF-030, RF-036, RF-037, RF-084)
  - Layer and files: data · `src/data/records.ts` (`MatchRecord`, `CallUpEntryRecord`, `MarkRecord`), `src/data/match-repository.ts` (`createMatch`, `getMatch`), `src/data/grid-repository.ts` (created here with `loadGridRecords`, which T041 needs to open a match; T049 adds the writes), tests.
  - Done when: `createMatch` creates a match and its call-up entries (with the name and number of each player, RF-019) in one transaction; `getMatch` reads the match back unchanged; `loadGridRecords(matchId)` returns the match, its call-up entries and its marks (none yet, or rows written directly by the test); changing the team default does not change existing matches.
  - Scenarios:
    - Happy path: create with 12 players → 12 entries. Also: the created match has the format and date it was given, a null time and no score, and `getMatch` reads every field back unchanged (RF-025).
    - Boundaries: match with only format and date. Also: a call-up of 0 entries and of 12; formats 4 and 8; notes of 500 characters and names of 40; a score of 0–0 and 999–0 stored as numbers, not as nulls.
    - Outside the rules: 13 entries saved. Also: 8 entries in a 6-period match are saved (RF-010).
    - Odd data: free text with emojis and quotes; 500-character notes. Also: the same player twice in the call-up → the unique index throws and no match is left; the same player in two matches is fine; the numbers "0" and "00" in the snapshot stay distinct; `loadGridRecords` of an unknown match returns nothing, without throwing.
    - Sequences: change default 6 → 8, existing match still 6, new one 8; a match created with format 8 in a 6 team keeps the team default at 6. Also: rename a player in the database after the match was created → the match's entry still holds the old name and number, and a match created afterwards holds the new ones (RF-019; E-018 is proved with the UI in D3).
    - Interruptions: failure halfway → no match and no entries.
    - Mistakes: deselected players are not in the call-up. Also: `loadGridRecords` returns the marks written directly by the test, including an overtime mark, and the overtime count.
  - Pending: nothing.

- [x] **T039** · Data: call-up repository, add, remove with marks, create a player from the match (RF-019, RF-032, RF-033, RF-034, RF-035, E-017)
  - Layer and files: data · `src/data/call-up-repository.ts`, tests.
  - Done when: `addToCallUp` stores the snapshot and returns the new entry with its `id`; `removeFromCallUp` deletes the entry and its marks; `createPlayerInMatch` creates the player in the team and in the call-up in one transaction and returns both; a write that breaks the unique index throws, like any failed write, and leaves nothing written.
  - Scenarios:
    - Happy path: add a player → entry with current name and number. Also: `createPlayerInMatch` returns a player and an entry with the same name and number, and the player is listed in the team.
    - Boundaries: remove the last player of the call-up. Also: adding a 13th player is saved (RF-010); the number "00" is snapshotted as "00".
    - Outside the rules: the repository does not look at the format or the call-up range: it saves whatever the state layer asks.
    - Odd data: adding the same player twice is rejected by the unique index; the repository throws and the state layer turns it into `saveFailed` (T042), so nothing reaches the user as an exception. Also: removing an entry that does not exist changes nothing and does not throw.
    - Sequences: remove Ana with marks (E-017), add her again → new entry `id`, empty row. Also: remove Ana with marks (E-017) → only her marks are deleted, those of the other entries stay.
    - Interruptions: failure creating the entry → no player created either.
    - Mistakes: removing from one match leaves her in other matches.
  - Pending: nothing.

- [x] **T040** · State: new-match draft, its fields and the call-up selection (RF-026, RF-027, RF-030, RF-031, RF-036, RF-068, RF-083, RF-084, E-015, E-024, E-030)
  - Layer and files: state · `src/state/new-match-draft.ts` (factory with the database and a clock), `src/state/app-stores.ts` (adds the draft), tests in `new-match-draft.fields.test.ts`. `create()` is T086 (split on 2026-11-12, review D2-A-06).
  - Done when: a reset (when the screen opens) fills the draft with `newMatchDefaults`: the team default format, today's date from the clock passed to the factory (so tests fix 2026-11-11) and no time, and `callUpSelection` lists the team's active players only, sorted (`initialCallUp`), all selected, with `callUpRange` (RF-068); `setFormat(format)` changes it without confirmation and without touching the team (RF-084, E-024); `setDate` and `setTime` take the picker's parts and store them with `isoDate` and `isoTime`; `clearTime()` leaves no time (RF-083); `setMyTeamAs("home" | "away")` writes the team name only (RF-027; not named `use…`, because `react-hooks/rules-of-hooks` would take it for a hook, review D2-A-03); the home, away, score and notes fields are set as typed; `toggle(playerId)` selects or deselects and updates `callUpRange`.
  - Scenarios:
    - Happy path: 12 active → 12 selected, no warning in 6 periods. Also: the draft opened on a 6-period team has format 6, date 2026-11-11 (the clock passed to the factory) and no time, and empty home, away, score and notes.
    - Boundaries: deselect to 9 → none; to 8 → warning (E-015); 13 selected → warning (E-030). Also: 9 and 12 selected → no warning; 8 and 13 → warning, in 6 periods (RF-068).
    - Outside the rules: 8 selected → the warning stays and nothing is blocked.
    - Odd data: team without players → empty call-up and warning. Also: a team with 12 active players and one deactivated (written directly in the database, because deactivation arrives in D3) → exactly the 12 active ones are listed and selected (RF-030); two players with the same number or with "0" and "00" are listed sorted; `toggle` of a player that is not listed changes nothing; `setTime` with 00:00 stores "00:00".
    - Sequences: `setFormat(8)` in a 6-period team → the draft has 8, the team default is still 6 (E-024); deselect in one draft, reset → everyone selected again. Also: with 8 players selected in a 6-period team, `setFormat(4)` removes the range warning (minimum 8) and `setFormat(6)` brings it back; `setTime`, `clearTime` and `setTime` again leave the last time; `clearTime` with no time leaves no time.
    - Interruptions: a reset drops every field typed before (the screen closed without «Guardar»). Also: a reset after the clock has moved to the next day takes the new day (the date is read from the clock at every reset, not when the module loads).
    - Mistakes: quick home then edit the text → edited text kept; the category is never copied. Also: `setMyTeamAs("home")` then `setMyTeamAs("away")` writes the team name in each field as asked and edits to one field never change the other.
  - Pending: nothing.

- [x] **T086** · State: create the match from the draft, once (RF-025, RF-030, RF-031, RF-036, RF-084, RF-085, E-015, E-024, E-030)
  - Layer and files: state · `src/state/new-match-draft.ts` (`create()`), tests in `new-match-draft.create.test.ts`. Taken out of T040 on 2026-11-12 (review D2-A-06).
  - Done when: `create()` validates with `validateMatchInput` and returns `invalid` with its errors (`scoreIncomplete` or `scoreInvalid`) and nothing saved; otherwise it saves the normalised value (trimmed names, `null` for empty texts, scores as numbers; T037) with `createMatch` (T038); `create()` on a draft that was never reset for a team returns `unchanged` and writes nothing; with the selected players' snapshots from `callUpEntryFor`, and returns `saved` with the match id, or `saveFailed` with nothing saved; after a successful `create`, calling it again returns the same match id and writes nothing, until the draft is reset (review P-30).
  - Scenarios:
    - Happy path: 12 selected → a match with 12 call-up entries. Also: with the defaults of a 6-period team the saved match has format 6, the draft's date and no time, and no home, away, score or notes (US2 criterion 1, RF-036).
    - Boundaries: 8 players in 6 periods → created (E-015); 13 → created (E-030).
    - Outside the rules: create with 8 players → created, the range warning stays in the draft.
    - Odd data: no players selected → a match with an empty call-up. Also: every field filled (names of 40 characters, notes of 500, score 999–0, a time) → saved and read back unchanged (RF-025); score 0–0 → saved as 0 and 0, not as empty; score «007»–«1» → saved as 7 and 1; a home name of only spaces → saved as `null`; a match with only the format and the date saves; `create()` before any reset → `unchanged`, no match.
    - Sequences: E-024 → a match with 8 periods, team default still 6; deselect in one match, next new match has everyone selected again (RF-031). Also: a `saveFailed` create followed by a second `create` tries again and saves one match (a failed create is not remembered as done).
    - Interruptions: a failing write → `saveFailed`, no match and no entries in the database (RF-085).
    - Mistakes: only the home score → `invalid` with `scoreIncomplete`, no match saved; `create` called twice in a row → one match in the database and the same id both times; after a reset, `create` makes a new match.
  - Pending: nothing. `create()` lives in `new-match-draft.ts`; the validation and the save are in `new-match-save.ts` (split to keep the factory under 60 lines). `SaveResult` is unchanged: `CreateResult = SaveResult & { matchId? }` is defined in `new-match-save.ts`.

- [x] **T041** · State: match session, opening and closing, and the first row view (RF-042, RF-068, E-020)
  - Layer and files: state · `src/state/match-session-store.ts` (created here, factory `createMatchSessionStore(db)`: the state of `plan.md` with `status`, `grid`, `warnings`, `view`, `history` and `saveFailed`, and the actions `openMatch` and `closeMatch`; the other actions go to their own slice files, `plan.md` "State"), `src/state/match-view.ts` (first version of `buildMatchView(source)`: `matchId`, `format`, rows sorted, with `entryId`, number, name and `hasMarks`; `callUpRange`), `src/state/app-stores.ts`, tests split as `match-session-store.open.test.ts` and `match-view.rows.test.ts`.
  - Done when: `openMatch(id)` reads the records with `loadGridRecords` (T038) and the team's players with `listPlayers` (T031), and builds a `MatchGrid` with the saved data: the format narrowed with `isFormat`, `overtimeCount` from `overtime_count`, the entries sorted with `comparePlayers`, and the saved marks (each `MarkRecord` turned into its `Cell`, period or overtime, and its `Mark`); it evaluates the warnings with `evaluateWarnings` and publishes the view; an unknown ID, or a read that throws, gives `notFound` (no new state or text, answer of 2026-11-12); `closeMatch` empties the grid, the warnings, the view and the history and sets `closed`; opening another match replaces the whole session. The view fields that later tasks fill (columns, cells, counters, warnings, `playersToAdd`) are added to the `MatchView` type by those tasks, and the D3 fields (`formatOptions`, `replaceableStarters`) in D3.
  - Scenarios:
    - Happy path: open a match with 12 players → 12 rows in E-020 order.
    - Boundaries: a player without marks has `hasMarks` false; 9 players in 6 periods → no range warning. Also: 0 players → no rows and the range warning; 12 players; formats 4 and 8 open with their period count.
    - Outside the rules: 13 players in the call-up → range warning in the view.
    - Odd data: `openMatch` with an unknown ID → `notFound`; a match with 2 overtimes and marks in P2 and OT2 → both marks in the grid, 2 overtimes. Also: rows with the same number are sorted by name and "0" comes before "00" (E-020); the rows show the name and number saved in the call-up, not the player's current ones: rename the player in the database and open the match → the old name and number (RF-019).
    - Sequences: open match A, then match B → only B's rows; `closeMatch` → `closed` and no view.
    - Interruptions: a new store on the same database shows the same call-up, the same marks (written directly by the test, including an overtime mark) and the same overtime count (review D2-A-04; T052 relies on it for E-019).
    - Mistakes: `closeMatch` twice, or with no match open, does nothing more. Also: `openMatch` for the same match twice gives the same view and a second `openMatch` empties the history; `openMatch` when the database read throws → `notFound` (the screen shows «No se ha encontrado: puede que se haya borrado.»), never a half-filled view and no new text (answer of 2026-11-12; known D2 limit, T061).
  - Pending: nothing.

- [x] **T042** · State: call-up actions in the open match (RF-023, RF-032, RF-033, RF-034, RF-035, RF-060, RF-085, RF-086, E-017)
  - Layer and files: state · `src/state/match-session-call-up.ts` (slice of the session store: `addToCallUp(playerId)`, `removeFromCallUp(entryId)`, `createPlayerInMatch(input)`), `src/state/match-view.ts` (`playersToAdd`), tests split as `match-session-store.call-up.test.ts` and `match-view.players-to-add.test.ts`.
  - Done when: `addToCallUp` builds the snapshot with `callUpEntryFor`, saves it with the repository's `addToCallUp`, and inserts the returned entry with the domain's `addToCallUp` (the D1-01 function: new empty row in `comparePlayers` order); `removeFromCallUp` saves with the repository's `removeFromCallUp`, applies the domain's `removeFromCallUp` and runs `pruneHistory`; `removeFromCallUp` of an entry that is no longer in the grid returns `unchanged`, saves nothing, raises no error and leaves `saveFailed` as it was (answer of 2026-11-12); `createPlayerInMatch` validates with `validatePlayerInput` (returns `invalid` and saves nothing on errors), saves with the repository's `createPlayerInMatch` and adds the entry like `addToCallUp`; every action saves first, then re-evaluates the warnings and publishes the view (RF-060), and none pushes an undo entry; `playersToAdd` (from the domain's `playersToAdd`) offers only active players not in the call-up; a failed save leaves the view as it was, sets `saveFailed` and returns `saveFailed`; the next successful change clears `saveFailed`.
  - Scenarios:
    - Happy path: add two players → two new empty rows in order. Also: `createPlayerInMatch` with a valid name and number → the player is in the team and the call-up, in order.
    - Boundaries: remove the only player → no rows; add a 13th → range warning. Also: removing a player with marks re-evaluates the warnings (RF-060: Juan with X in P1–P3 removed → his light red cells are gone); adding the 9th player to a 6-period call-up removes the range warning.
    - Outside the rules: adding the 13th player is saved and warned, never blocked (RF-010).
    - Odd data: `playersToAdd` is empty when every active player is in the call-up. Also: `removeFromCallUp` of an entry that is no longer there (double press) → `unchanged`, nothing saved, no error and no `saveFailed`; adding the same player twice → the repository's unique index throws and the action returns `saveFailed` with the view unchanged (T039); `createPlayerInMatch` with a blank name or "07" → `invalid`, nothing created; "0", "00" and a duplicate number are accepted.
    - Sequences: remove Ana with marks (E-017), add her again → empty row, no old marks.
    - Interruptions: a new store on the same database shows the changed call-up.
    - Mistakes: `playersToAdd` never offers a deactivated player; a failed save leaves the view and returns `saveFailed`. Also: no call-up action pushes an undo entry (`canUndo` stays as it was).
  - Pending: a player id that is not in the team makes `addToCallUp` return `unchanged` (the spec does not say; chosen by the Implementer). If the write succeeds but the later read for `playersToAdd` throws, the result is `saveFailed` although the entry is saved (not reachable in tests).

- [ ] **T043** · UI: new-match form without the pickers: format, home and away with the quick option, score and notes (RF-025, RF-027, RF-036, RF-084, E-022, E-024)
  - Layer and files: app and UI · `src/app/teams/[teamId]/index.tsx` (the «Nuevo partido» button), `src/app/teams/[teamId]/matches/new.tsx` (form part, header `matches.new`; resets the draft when it opens), `src/ui/match-form.tsx` (the format and its change handler come as props, so the details screen of T072 can reuse it; the date and time slot is filled in T082), `src/ui/score-fields.tsx` (the two scores, split out so no component function passes 60 lines and no file 250), `src/i18n/es.json` (`matches.new`, `match.field.format`, `match.field.home`, `match.field.away`, `match.field.score`, `match.field.notes`, `match.quickHome`, `match.quickAway`, `validation.scoreIncomplete`), tests in `tests/app/` and next to the components. The pickers are T082 (split on 2026-11-12, review D2-A-06).
  - Done when: the team screen opens `/teams/[teamId]/matches/new` with «Nuevo partido»; the form shows the format, home, away, score and notes of RF-025 with their defaults and the limits of `input-limits.ts` (`NAME_MAX_LENGTH`, `NOTES_MAX_LENGTH`, `SCORE_MAX_LENGTH`); the format picker is filled with the team default and changes without a dialog; the quick buttons call `setMyTeamAs`; each score field uses the numeric keyboard (`keyboardType="number-pad"`) and drops any character that is not a digit while typing, so only digits reach the draft, and the score is saved as a number («007» → 7, empty → no score; T037); a `scoreIncomplete` result shows `validation.scoreIncomplete`; `scoreInvalid` gets no new text: the filter makes it unreachable from the form, so if it ever arrives the form saves nothing and shows no message (answer of 2026-11-12); home and away names are saved trimmed, and a name of only spaces is saved as no name.
  - Scenarios:
    - Happy path: keep the defaults → the team's default format is shown. Also: the form opens in a modal with the header «Nuevo partido»; the fields are found by the labels «Variante», «Local», «Visitante», «Resultado final» and «Notas».
    - Boundaries: home and away stop at 40 characters, notes at 500, each score at 3 digits (E-022). Also: the `maxLength` props are 40, 500 and 3 (RNTL's `changeText` does not apply them, so T048 types the extra characters for real).
    - Outside the rules: not applicable.
    - Odd data: empty home, away, score and notes are accepted. Also: a home name of only spaces → the match is saved with no home name; « Cadete B » → «Cadete B»; typing «7a-» in a score leaves «7» in the field; «007» is saved as 7; score 0–0 is accepted; the score fields have the numeric keyboard (prop checked).
    - Sequences: change the format to 8 → no dialog, the draft has 8 (E-024).
    - Interruptions: rotating keeps the form. Also: leaving the form with the header's back button or Android Back → no question and no match; the app closed with the form half-filled (unmount, new stores on the same database) → no match in the database, and the form opened again shows the defaults (RF-082).
    - Mistakes: one score only → «Escribe los dos resultados o ninguno.»; quick «Mi equipo es local» writes the team name only, and the text can then be edited. Also: the score error disappears once both scores are filled or both emptied; quick «Mi equipo es visitante» fills only «Visitante»; using the quick option never changes the team's name.
  - Pending: nothing.

- [ ] **T082** · UI: date and time with the native pickers and «Quitar hora» (RF-026, RF-083, E-023, E-032)
  - Layer and files: UI · `src/ui/date-time-field.ios.tsx`, `src/ui/date-time-field.android.tsx`, `src/ui/match-form.tsx` (the date and time slot), `src/i18n/es.json` (`match.field.date`, `match.field.time`, `match.clearTime`), tests with the pickers replaced by a test double. Taken out of T043 on 2026-11-12 (review D2-A-06).
  - Done when: the date and time are chosen with the `@expo/ui` pickers, each inside its `Host` (API read in the SDK 58 docs: `DatePicker` from `@expo/ui/swift-ui` and `DateTimePicker` from `@expo/ui/jetpack-compose`; SDK 58 also has a drop-in `DateTimePicker` compatible with `@react-native-community/datetimepicker`, and if it gives the native pickers on both platforms with one file, it may replace the two platform files, recorded in "Deviations"); the chosen parts go to the draft's `setDate` and `setTime`; the fields show the strings the draft formats, «01/03/2026» and «18:30»; «Quitar hora» calls `clearTime`; there is no text field for the date or the time.
  - Scenarios:
    - Happy path: keep the defaults → today shown as «11/11/2026» (E-023).
    - Boundaries: 1 January and 31 December; 00:00 and 23:59.
    - Outside the rules: a date in the past (2020) and one far in the future (2030) are accepted: the form blocks no date.
    - Odd data: no time chosen → the time shows as empty.
    - Sequences: choose 1 March 2026 at 18:30 → «01/03/2026» and «18:30», then «Quitar hora» → no time (E-032). Also: choose a time, then change the date → the time is kept; choose a time, «Quitar hora», choose another time → the new one is shown.
    - Interruptions: rotating with a picker open keeps the chosen value. Also: leaving the form without «Guardar» drops the chosen date and time: the form opened again shows today and no time (RF-082).
    - Mistakes: «Quitar hora» with no time chosen changes nothing; 1 March is shown as «01/03/2026», never «1/3/2026». Also: dismissing a picker without choosing (Android cancel) keeps the previous value; the form has no text input for the date or the time (RF-083: no editable text field is labelled «Fecha» or «Hora»).
  - Pending: nothing.

- [ ] **T045** · UI: confirmation dialog that closes only with its buttons, also against the Android Back button (RF-034)
  - Layer and files: UI · `src/ui/choice-dialog.tsx` (confirmation mode, on React Native `Modal`; not `Alert`), `src/i18n/es.json` (`common.cancel`), tests.
  - Done when: the dialog shows title, message, the confirm button and «Cancelar» (`common.cancel`); tapping outside does nothing; `onRequestClose`, which React Native's `Modal` calls for the Android Back button, does nothing, so Back neither closes the dialog nor leaves the screen (D44, D46); it is used first by the call-up removal of RF-034.
  - Scenarios:
    - Happy path: confirm → the callback runs once. Also: «Cancelar» closes the dialog and the confirm callback never runs; the buttons are found by role and by their visible text.
    - Boundaries: a long title wraps and the buttons stay visible. Also: two quick presses on the confirm button run the callback once.
    - Outside the rules: not applicable.
    - Odd data: names with accents in the title. Also: an empty message; a title with a 40-character name.
    - Sequences: open, cancel, open again.
    - Interruptions: rotating with the dialog open keeps it. Also: the dialog unmounted while open (the screen closes) runs no callback.
    - Mistakes: tapping outside does not close it and changes nothing; Android Back (`onRequestClose` fired in the test) leaves it open, runs no callback and does not navigate back.
  - Pending: nothing.

- [ ] **T046** · UI: match screen first version and call-up screen (RF-023, RF-032, RF-033, RF-034, RF-035, RF-068, E-017)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx` (first version, no header title: call-up list, range warning and the «Convocatoria» button; `openMatch` when it mounts and `closeMatch` only in that effect's cleanup, as in `plan.md` "Leaving the match"; in tests it is opened with `renderRouter` at `/matches/1`, because the new-match screen reaches it only in T044), `src/app/matches/[matchId]/call-up.tsx` (pushed on top of the match screen, header `callUp.title`), `src/i18n/es.json` (`callUp.title`, `callUp.add`, `callUp.remove`, `callUp.createPlayer`, `callUp.addEmpty`, `confirm.removeFromCallUp.title`, `confirm.removeFromCallUp.message`, `confirm.removeFromCallUp.confirm`), tests in `tests/app/`.
  - Done when: the match screen opens the call-up screen with `router.push`; the call-up screen lists the call-up and offers `view.playersToAdd`, so only active players not in the call-up are offered; adding and removing call the session's `addToCallUp` and `removeFromCallUp`, and a `saveFailed` result shows `error.saveFailed`; when none is left, the list shows `callUp.addEmpty` («No quedan jugadores activos por añadir. Puedes crear uno nuevo.»; the «Crear jugador nuevo» button next to it arrives with its route in T047, D2 rule 8); removing a player with marks asks `confirm.removeFromCallUp.*`; without marks it asks nothing; the call-up screen is opened with `router.push`; a call-up route whose match session is not open shows `notFound.message`.
  - Scenarios:
    - Happy path: add two players. Also: the call-up screen shows the header «Convocatoria».
    - Boundaries: a player without marks is removed without a dialog. Also: 8 players in a 6-period match → range banner in the match screen and in the call-up screen; 9 and 12 → none (RF-068).
    - Outside the rules: 13 players → range banner.
    - Odd data: no players left to add → «No quedan jugadores activos por añadir. Puedes crear uno nuevo.»; unknown `matchId` → not-found message. Also: a call-up of 0 players → no rows and the range banner; players "0" and "00" listed in order. The marks of E-017 are written directly in the database, because the cells arrive in T055.
    - Sequences: remove a player and add him again; open the call-up and go back → the match screen is the same session, not opened again. Also: remove Ana with marks and confirm → her row is gone and her marks with it (E-017); add her again → an empty row.
    - Interruptions: RF-082: add a player and remove another, unmount the tree (the app closing) and open `/matches/1` with new stores on the same in-memory database → the call-up is as it was left.
    - Mistakes: cancel the confirmation → player and marks stay (E-017); Android Back with the confirmation open → it stays open. Also: tapping outside the open confirmation leaves it open and keeps the player and the marks (RF-034); a failed save (throwing double) when adding or removing → `error.saveFailed` is shown and the call-up is unchanged.
  - Pending: nothing.

- [ ] **T047** · UI: create a new player from the match (RF-035, RF-085)
  - Layer and files: app and UI · `src/app/matches/[matchId]/new-player.tsx` (modal, header `players.new`, pushed from the call-up screen with `router.push`, with the grid underneath), `src/app/matches/[matchId]/call-up.tsx` (the «Crear jugador nuevo» button), reusing `src/ui/player-form.tsx`, `src/i18n/es.json` (`callUp.createPlayer`; reuses `players.new` and `player.field.*`), tests.
  - Done when: «Crear jugador nuevo» in the call-up screen is always offered, also when no active player is left to add, and opens this route; the player is created in the team and in the call-up of that match in one step, through the session's `createPlayerInMatch`; a route whose match session is not open for its `matchId` shows only `notFound.message` and creates nothing (plan "Child routes without the grid below"); «Guardar» returns with `router.back()` to the screen that opened the form (the call-up screen, with the grid underneath) and never pushes a second grid (plan "After «Guardar»", review P-30); a failed save shows the message and creates neither; while a save is running, «Guardar» ignores new presses, so two quick presses create one player (answer of 2026-11-12); the name is saved trimmed (T030); if the match could not be read (`openMatch` gave `notFound`, answer 9 of 2026-11-12), the route shows `notFound.message` like a match that does not exist.
  - Scenarios:
    - Happy path: create «Nora 15» → in the team and in the grid. Also: the player created from the match is in the team's players (checked through the squad store) and in the call-up (US2 criterion 4).
    - Boundaries: name of 40 characters. Also: the number "0" and "99"; the name field has `maxLength` 40 and the number field 2.
    - Outside the rules: a duplicate number is allowed.
    - Odd data: "00"; the route opened for a match whose session is not open → not-found message. Also: an empty name → «Escribe un nombre.», nothing created.
    - Sequences: create, then remove her from the call-up → still in the team. Also: create two players in a row; with 12 players already in the call-up, creating one more shows the range banner on return (RF-010).
    - Interruptions: leaving without «Guardar» creates nothing. Also: the app closed with the form half-filled → no player in the team (RF-082).
    - Mistakes: "07" → number message, nothing created. Also: a failed save (throwing double) → `error.saveFailed`, the player exists neither in the team nor in the call-up; two quick presses on «Guardar» → one player in the team and one entry in the call-up (the button ignores presses while saving; one test).
  - Pending: nothing.

- [ ] **T044** · UI: call-up selection in the new-match screen, with count and range warning, and «Guardar» to the grid (RF-005, RF-010, RF-030, RF-031, RF-068, E-015, E-030)
  - Layer and files: app and UI · `src/app/teams/[teamId]/matches/new.tsx` (call-up part and «Guardar»), `src/ui/call-up-selector.tsx`, `src/ui/warnings/call-up-range-banner.tsx`, `src/ui/save-error-banner.tsx` (reused, T034), `src/i18n/es.json` (`callUp.title`, `callUp.count`, `warning.callUpRange`, `error.saveFailed`), tests next to the components and in `tests/app/` (`renderRouter` from `expo-router/testing-library`; its `testRouter` calls are asynchronous and awaited).
  - Order: placed after T047 on 2026-11-12 (review D2-A-10), so that the grid route it opens (T046) already exists when `typedRoutes` checks the link.
  - Done when: every active player is listed and selected at first; the count and the range warning follow the selection; «Guardar» calls the draft's `create()` (T086); a successful «Guardar» opens the grid of the created match with `router.replace`, never `router.push`, so the new-match route leaves the stack and Back from the grid goes to the team screen, never to the filled form (plan "After «Guardar»", review P-30); when `create` does not return `saved`, the screen stays on the form and does not navigate; when it returns `saveFailed`, the screen shows `error.saveFailed` in `save-error-banner.tsx` and keeps everything typed and selected (answer of 2026-11-12).
  - Scenarios:
    - Happy path: create with defaults and 12 players → the grid of the new match is shown. Also: the match saved with the defaults has the team's default format and today's date and no time (US2 criterion 1), and deselecting two of twelve players before «Guardar» saves a match with 10 entries (US2 criterion 2).
    - Boundaries: 8 players in 6 periods → warning visible, button still enabled (E-015). Also: 9 and 12 players → no banner; the count shows «12 convocados».
    - Outside the rules: 13 players → warning, created (E-030).
    - Odd data: team with no active players. Also: players with the same number or with "0" and "00" are listed in order; a team with no active players → «Guardar» creates a match with an empty call-up, with the range banner.
    - Sequences: toggle players, change the format, create; with `renderRouter` starting at `/teams/1` and pushing `/teams/1/matches/new`: create, then Back (`testRouter.back()`) → the pathname is `/teams/1`, the team screen, and not the new-match form, and the in-memory database holds exactly one match for the team (the team's match list arrives in D3, T071).
    - Interruptions: RF-082: the app closed on the new-match screen before «Guardar» (unmount, new stores on the same database) → no match saved; the screen opened again shows the defaults with everyone selected again; a failing `create` (throwing double) → the screen stays on the form, does not navigate, saves no match, shows «No se ha podido guardar el cambio. Inténtalo de nuevo.» (`error.saveFailed`, drawn by this screen) and keeps the typed home name, the score and the call-up selection; a second «Guardar» once the double stops failing saves one match.
    - Mistakes: the deactivated players are not listed; two quick presses on «Guardar» → one match in the database. Also: pressing Back with players deselected saves nothing, and the next new match starts with everyone selected (RF-031).
  - Pending: nothing.

- [ ] **T048** · Maestro US2 journey (RF-030, RF-031, RF-033, RF-035, RF-036, RF-037, RF-068, RF-083, RF-084, E-015, E-023, E-024, E-032)
  - Layer and files: e2e · `e2e/us2-match-and-call-up.yaml`.
  - Done when: the flow covers the US2 acceptance criteria 1–6 with the real native pickers and passes on both platforms; the flow's `name` carries the IDs it covers (D2 rule 7); output in `review.md`.
  - Scenarios:
    - Happy path: default format and date, everyone selected, player created from the match, format changed in the form (E-024), «Quitar hora» (E-032): in a 6-period team the new match has 6 periods and today's date (E-023, RF-036); the real pickers show «01/03/2026» and «18:30» after choosing 1 March 2026 at 18:30; after «Guardar» the grid opens.
    - Boundaries: 8 players warning: deselect to 8 → the range warning is shown and «Guardar» still works (E-015); add players until 13 → the warning is shown (E-030); type 41 characters in the home name, 501 in the notes and a fourth digit in a score → each field keeps its limit (E-022).
    - Outside the rules: a match with 8 players is created and its screen opens (RF-010, RF-068).
    - Odd data: a team with no active players → the match is created with an empty call-up; a time left empty → the match has no time.
    - Sequences: create the match, then Back from its grid (Maestro `back` on Android, the header back button on iOS) → the team screen, and the new-match form is not shown (review P-30; the "listed once" check is in T073); create a player from the match, remove another one, who has no marks, from the call-up (no confirmation, RF-033) and add him again. The removal of a player with marks (E-017) is not in this flow, because the grid cannot be marked until T055: it is in T056's flow, and the Jest tests of T046 prove the confirmation and the deletion of the marks with marks written directly in the database (answer of 2026-11-12).
    - Interruptions: `stopApp` with the new-match form half-filled, `launchApp` → the list of teams; `openLink: planificadorperiodos://matches/1` shows `notFound.message`, so no match was created (RF-082; the D2 interface has no match list to look at).
    - Mistakes: one score only → «Escribe los dos resultados o ninguno.»; the quick «Mi equipo es local», then an edit of the text; the format changed in the form shows no dialog and the team's default stays (E-024).
  - Pending: nothing.

**US2 checkpoint:** Fernando creates a match with today's date and the team's format, picks the call-up, sees the range warning when it applies and edits the call-up afterwards.

## US3 · Plan the periods

- [ ] **T049** · Data: grid repository, save cell changes and overtimes (RF-056, RF-058, RF-059, RF-082, RF-085)
  - Layer and files: data · `src/data/grid-repository.ts` (adds the writes to the file of T038), tests split as `grid-repository.marks.test.ts` and `grid-repository.overtimes.test.ts`.
  - Done when: `saveCellChanges(matchId, changes)` upserts or deletes marks (an `"empty"` state deletes the row) in one transaction, mapping each `Cell` to `column_kind` and `column_number`; `addOvertime` and `removeLastOvertime` update `overtime_count`, and `removeLastOvertime` deletes the marks of that overtime in the same transaction; what is saved reads back the same with `loadGridRecords`.
  - Scenarios:
    - Happy path: save three marks, load → same records. Also: an overtime added, a mark saved in it, load → the overtime count and the mark.
    - Boundaries: removing an overtime with marks deletes only its marks. Also: two overtimes, remove the last → one remains with its marks; marks only in overtime 2 → removing it deletes exactly those.
    - Outside the rules: not applicable.
    - Odd data: match with no marks and no overtimes. Also: an empty list of changes writes nothing; the same change saved twice leaves one row; an `"empty"` change on a cell that has no row does nothing and does not throw; a mark in overtime 3 and in period 8.
    - Sequences: X → circled X → empty on the same cell.
    - Interruptions: failure in the second change of a replacement → neither saved. Also: `addOvertime` failing leaves `overtime_count` as it was; `removeLastOvertime` failing after deleting the marks leaves the marks and the count as they were (one transaction).
    - Mistakes: a mark of an entry not in the match is rejected. Also: `removeLastOvertime` with no overtime changes nothing; `saveCellChanges` for a match that does not exist is rejected.
  - Pending: nothing.

- [ ] **T050** · State: grid view with columns, cells and counters (RF-042, RF-043, RF-070, RF-071, E-014, E-020)
  - Layer and files: state · `src/state/match-view-grid.ts` (created here, review D2-A-11: `ColumnView` with `key` and `column`, `CellView` with `key`, `cell` and `state`, `RowView.counter` and `cells`), `src/state/match-view.ts` (calls it; `canUndo`, `canRemoveOvertime`, `lastOvertimeHasMarks`), tests in `match-view.grid.test.ts`.
  - Done when: `buildMatchView` gives one column per period then per overtime (`gridColumns`), one row per entry in E-020 order, one cell per row and column with its state (`cellState`), and the counter of each row (`playerCounter`); `canUndo` is true when the history has an entry; `canRemoveOvertime` is true only with an overtime; `lastOvertimeHasMarks` comes from the domain's `lastOvertimeHasMarks`; it calls only domain functions.
  - Scenarios:
    - Happy path: 6 periods + 1 overtime, 10 players → 10 rows, 7 columns.
    - Boundaries: E-014 counter 3 and 3. Also: 8 periods and 3 overtimes → 11 columns; 4 periods → 4 columns; 13 rows.
    - Outside the rules: a player with an X in every column still gets a counter and every cell is `starter`.
    - Odd data: empty call-up → no rows; 0 overtimes → `canRemoveOvertime` false. Also: rows with the numbers "0" and "00" in E-020 order; one circled X in 6 periods → played + rested = 5 (RF-071).
    - Sequences: two overtimes → only the last can be removed.
    - Interruptions: building the view twice from the same source gives equal views (a pure function).
    - Mistakes: every cell has exactly one state. Also: `canUndo` is false with an empty history and true with one entry; the counter changes when a cell changes.
  - Pending: nothing.

- [ ] **T051** · State: tap and overtimes, saved at once (RF-044, RF-048, RF-049, RF-051, RF-056, RF-058, RF-059, RF-060, RF-082, RF-085, E-025)
  - Layer and files: state · `src/state/match-session-marks.ts` (slice of the session store: `tapCell(cell)`, `addOvertime()`, `removeLastOvertime()`), tests split as `match-session-store.tap.test.ts` and `match-session-store.overtimes.test.ts`, with the in-memory database and a throwing double.
  - Done when: `tapCell` asks the domain's `tapCell`, computes the changes with `cellChanges`, saves them with `saveCellChanges`, and only then publishes the grid, the warnings (`evaluateWarnings`) and the view, and pushes `undoEntryFor(before, after)` to the history; the questions (`askSubOrStarter`, `chooseReplacedStarter`, `confirmRemoveStarter`) and `unchanged` leave the grid, the history and the database as they were in D2; `addOvertime` and `removeLastOvertime` go through the domain functions of the same names and the repository, push no undo entry, and `removeLastOvertime` runs `pruneHistory`; a failed save publishes nothing, pushes nothing and sets `saveFailed`, which the next successful change clears.
  - Scenarios:
    - Happy path: tap empty with 4 X → X saved and published. Also: tapping an X in a period with no sub empties it (RF-049) and tapping a circled X empties it (RF-051); the circled X is made by tapping an empty cell in P6 with 5 X (RF-048).
    - Boundaries: tap with 5 X in the window → no change (question, D3); 5 X in P6 → circled X. Also: the fifth X in a period (4 → 5 X) is saved; the sixth tap in a full P1 leaves the database, the grid and the history untouched (RF-055).
    - Outside the rules: a tap breaking a rule is saved and warned.
    - Odd data: tap on a cell of an entry no longer in the call-up → nothing. Also: tap on a cell of an overtime that was removed → nothing; the store opened on a match with no marks and no overtimes works.
    - Sequences: many taps in a row → database equals store after each. Also: property (fast-check) over random sequences of taps, `addOvertime`, `removeLastOvertime` and `undo` through the store: no period ever has more than 5 X, and after every action the grid read back from the database equals the published one (RF-055, RF-082); only the current state is kept, no versions (RF-056).
    - Interruptions: E-025 → Ana's P1 stays empty, P1 has 3 X, `saveFailed`, no undo entry. Also: `addOvertime` failing → no overtime, `saveFailed`; `removeLastOvertime` failing → the overtime and its marks stay; the next successful change clears `saveFailed`.
    - Mistakes: `removeLastOvertime` on an overtime with marks removes it and its marks at once, because the confirmation lives in the interface (T055); `removeLastOvertime` with no overtime → nothing saved, nothing published. Also: a failed tap followed by `undo` reverts the action before it, not the failed one (no entry was pushed).
  - Pending: nothing.

- [ ] **T052** · State: undo of mark changes (RF-055, RF-057, RF-082, RF-086, E-019, E-031)
  - Layer and files: state · `src/state/match-session-undo.ts` (slice of the session store: `undo()`), tests in `match-session-store.undo.test.ts` (and `match-session-store.undo-structure.test.ts` if it passes 250 lines).
  - Done when: each mark change pushes one entry; `undo` uses `undoLast`, saves its `changes` with `saveCellChanges` and publishes the grid, the warnings, the history and the view; with nothing left to undo it saves and publishes nothing; overtimes and call-up changes never push (format changes arrive in D3); structural changes prune; the history survives every action of the open session and is emptied only by `closeMatch` (and is empty in a new store); a failed save keeps the history and the grid, and sets `saveFailed`.
  - Scenarios:
    - Happy path: three marks, three undos → grid as before. Also: tap an empty cell in P6 with 5 X (circled X) and undo → empty; tap an X to remove it and undo → the X is back.
    - Boundaries: undo with an empty history does nothing; undo never leaves a column with 6 X (RF-055). Also: undo with exactly one entry empties the history.
    - Outside the rules: not applicable.
    - Odd data: the D2 counterpart of E-026 with the real database: mark Eva in P2, remove Eva with `removeFromCallUp` (as the call-up screen does), undo → that entry is discarded and the same press reverts the mark made before it (RF-086). E-026 itself needs the starter replacement, which the store gets in D3, so it moved to T062 (review of 2026-11-12).
    - Sequences: E-031; mark, add overtime, undo → overtime still there, mark gone; mark, add and remove a player through the call-up actions, undo → the mark is gone (the session was never closed).
    - Interruptions: E-019: marks in P1–P3 and an overtime, new store on the same database → same marks and overtime, nothing to undo; mark, `closeMatch`, `openMatch` of the same match → nothing to undo (RF-057). Also: `undo` with a failing save → the history and the grid stay and `saveFailed` is true; the next successful change clears it; E-019 as above.
    - Mistakes: undo pressed more times than actions. Also: after a failed tap (E-025) `undo` reverts the previous action, not nothing and not the failed one.
  - Pending: nothing.

- [ ] **T053** · UI: grid layout as pure size functions, with the tablet height budget (RF-076, RF-078, RF-079, RF-080, RF-081)
  - Layer and files: UI · `src/ui/grid/grid-layout.ts`, tests split as `grid-layout.phone.test.ts` and `grid-layout.tablet.test.ts`; every `it.each` table has its own literal title carrying the RF IDs of that table (one literal title per table, never one title shared by two tables). These titles say "fit", which the focused-test check of T085 no longer confuses with `fit(`; no helper in these tests is named `fit`, `xit` or the like, because a call of it at the start of a line would be flagged.
  - Done when: `grid-layout.ts` takes the window size and the measured heights of the banners, the legend and the header row, and returns the cell width `max(44, ⌊(available width − player column) / period columns⌋)`, the row height `max(44, min(56, rows space / rows))`, whether each scroll is needed and whether the grid buttons go in the header; a window is a tablet when its shortest side is at least `TABLET_MIN_SHORT_SIDE = 600` points (a constant exported by `grid-layout.ts`, applied to the size from `useWindowDimensions`, so the answer does not change on rotation; answer of 2026-11-12); for 375 × 667, 667 × 375, 768 × 1024 and 1024 × 768 the cell width is ≥ 44 pt, 4 and 6 periods fit at 375 pt, 8 periods fit in landscape and on tablet, 12 rows fit on tablet in both orientations with the worst-case banners and legend of `plan.md`, with more than 12 players on a tablet every period still fits across and vertical scroll is set when the rows do not fit (RF-081, D49), overtimes that do not fit set horizontal scroll, and the grid buttons go in the header only on tablets.
  - Scenarios:
    - Happy path: 6 periods at 375 pt → no horizontal scroll.
    - Boundaries: 8 periods at 375 pt → scroll with 44 pt cells; 1024 × 768 with every banner → 12 rows of 44 pt fit. Also: the width where the cell is exactly 44 pt → no horizontal scroll, and one point narrower → scroll with 44 pt cells; 4 rows on a tablet → the row height is capped at 56, and 12 rows → 44.
    - Outside the rules: 13 players on a tablet, 8 periods → no horizontal scroll in either orientation; vertical scroll in 1024 × 768 (13 × 44 = 572 > 530 pt), none in 768 × 1024. Also: a window narrower than the 375 pt reference (320 pt) with 6 periods → horizontal scroll, cells still 44 pt (nothing breaks, RF-078).
    - Odd data: 3 overtimes on a tablet → horizontal scroll; 15 players on a phone in landscape → vertical scroll. Also: 0 players → no vertical scroll; 0 and 3 overtimes; banner heights of 0 and the worst case; a shortest side of 599 points is a phone and of 600 a tablet, in both orientations (599 × 900 and 900 × 599 → toolbar; 600 × 900 and 900 × 600 → header). Property (fast-check): for any width from 320, any height, 4, 6 or 8 periods, 0 to 5 overtimes and 0 to 20 players, the cell width and the row height are never below 44, and when no horizontal scroll is needed the columns and the player column fit in the width.
    - Sequences: rotate → recomputed. Also: rotating 375 × 667 → 667 × 375 → 375 × 667 gives the first result again.
    - Interruptions: not applicable.
    - Mistakes: the cell width and the row height are never below 44. Also: on a phone the grid buttons are in the toolbar under the grid, in both orientations (667 × 375 included), and on the tablet sizes in the header.
  - Pending: nothing.

- [ ] **T054** · UI: column headers and grid cells with their three states and accessible labels (RF-042, RF-043)
  - Layer and files: UI · `src/ui/grid/column-header.tsx`, `src/ui/grid/grid-cell.tsx`, `src/i18n/es.json` (`grid.header.period`, `grid.header.overtime`, `grid.cell.empty`, `grid.cell.starter`, `grid.cell.sub`), tests next to each component. The grid that assembles them is T083 (split on 2026-11-12, review D2-A-06).
  - Done when: `column-header.tsx` draws «P1»… and «PR1»… from a `ColumnView`; `grid-cell.tsx` draws a `CellView` in one of three distinct states, each with its accessible label from `grid.cell.*` with the player's name and the column header («Ana, P2: casilla vacía», «Ana, P2: X, titular», «Ana, P2: X con círculo, entró de cambio»); each cell is pressable, at least 44 pt (sizes come as props), and passes its `cell` back through an `onTapCell` prop.
  - Scenarios:
    - Happy path: the three states of one row in P2 → three different drawings and labels. Also: the three cells are found by their accessible labels and by role button; the header shows «P2».
    - Boundaries: an overtime cell's label uses «PR1»; P8 and PR3 headers. Also: a name of 40 characters in the label; an overtime cell with 3 overtimes («PR3»).
    - Outside the rules: not applicable.
    - Odd data: a name with accents in the label. Also: the player number "00" does not change the label (the label has the name and the column only).
    - Sequences: re-render after a change shows the new state and the new label.
    - Interruptions: not applicable.
    - Mistakes: a cell is never shown with two states, and its label always matches the state shown; a tap calls `onTapCell` once with that cell. Also: pressing a cell of each state calls `onTapCell` once with that cell and never any other callback.
  - Pending: nothing.

- [ ] **T083** · UI: the grid with the fixed player column, counters and sizes (RF-042, RF-070, RF-071, RF-076, RF-077, E-014, E-020)
  - Layer and files: UI · `src/ui/grid/match-grid.tsx`, `src/ui/grid/player-column.tsx`, `src/i18n/es.json` (`grid.counter`), tests next to each component. Taken out of T054 on 2026-11-12 (review D2-A-06).
  - Done when: the grid draws only `MatchView`; a vertical `ScrollView` holds the player column and a horizontal `ScrollView` with the header row (T054's headers) and the cells (T054's cells); the player column is outside the horizontal `ScrollView` (RF-077); one row per entry with number, name (cut with an ellipsis) and «J n · D n» below; sizes come from `grid-layout.ts` (T053) with `useWindowDimensions` and the heights measured with `onLayout`, and are recomputed on rotation (RF-076); whether the window is a tablet is decided only by `grid-layout.ts` (`TABLET_MIN_SHORT_SIDE`), never by the component or by `Platform`.
  - Scenarios:
    - Happy path: 6 periods + 1 overtime, 10 players → 10 rows, 7 columns.
    - Boundaries: E-014 counter «J 3 · D 3». Also: 13 players with 8 periods → every period across and vertical scroll set; 1 player; «J 1 · D 5» after one X in 6 periods (a circled X adds to neither).
    - Outside the rules: not applicable.
    - Odd data: very long name → ellipsis; empty call-up → no rows; E-020 order. Also: names with "0" and "00" numbers; 3 overtimes → horizontal scroll set.
    - Sequences: a new window size (rotation) → the sizes are recomputed. Also: a change of a cell in the view → its counter changes at once.
    - Interruptions: rendering the same view twice (unmount, mount) gives the same tree; nothing is kept in the component between mounts.
    - Mistakes: the player column never sits inside the horizontal `ScrollView`. Also: the header row scrolls with the cells (it is inside the horizontal `ScrollView`); the grid imports only types from the domain and draws only `MatchView` (it computes no rule).
  - Pending: nothing.

- [ ] **T055** · UI: match screen with tap, overtimes, toolbar and save error (RF-044, RF-049, RF-056, RF-058, RF-059, RF-085, E-025)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx` (composes the grid of T083, the toolbar and the banners, so the screen file stays under 250 lines and no function passes 60), `src/ui/grid/grid-toolbar.tsx` (the three buttons), `src/i18n/es.json` (`grid.undo`, `grid.addOvertime`, `grid.removeOvertime`, `confirm.removeOvertime.title`, `confirm.removeOvertime.message`, `confirm.removeOvertime.confirm`), tests in `tests/app/` split by subject (marks, overtimes). The Undo history across the match's routes is T084 (split on 2026-11-12, review D2-A-06).
  - Done when: tapping cells calls the session's `tapCell`; «Deshacer», «Añadir prórroga» and «Quitar prórroga» go in the navigation header on tablets and in a toolbar under the grid on phones, as `grid-layout.ts` decides (T053); «Deshacer» calls `undo` and is disabled when `view.canUndo` is false; «Añadir prórroga» adds a column; «Quitar prórroga» only for the last one, with a confirmation that closes only with its buttons when it has marks; a failed save shows `error.saveFailed`. Known D2 limit (D2 rule 9): a tap on an empty cell of a full rule-window period, or on an X in a period with a sub, does nothing yet.
  - Scenarios:
    - Happy path: mark five starters in P1. Also: tap an X in a period with no sub → empty and the period has 4 X (RF-049, US3 criterion 2).
    - Boundaries: «Quitar prórroga» without marks → no dialog; a sixth tap in a full P1 changes nothing (D2 limit, the question arrives in D3).
    - Outside the rules: a tap that breaks the rest minimum is marked, and no tap is blocked except the sixth X (RF-060); Undo, «Añadir prórroga» and «Quitar prórroga» are found by role and visible text.
    - Odd data: match with 13 players → banner. Also: tap an empty cell in an overtime with 5 X → a circled X without asking (E-012, RF-048); tap it again → empty (RF-051); 0 overtimes → «Quitar prórroga» is not offered.
    - Sequences: mark, add overtime, undo, undo. Also: add two overtimes in a 6-period match → 8 columns, and only the second offers «Quitar prórroga»; on a 375 × 667 window the three buttons are in the toolbar under the grid, and on a 1024 × 768 window in the header; with `useWindowDimensions` mocked to 599 × 900 they are in the toolbar and to 600 × 900 in the header (`TABLET_MIN_SHORT_SIDE`, T053; answer of 2026-11-12).
    - Interruptions: E-025 with a failing repository double → the cell stays empty and `error.saveFailed` is shown. Also: after the failed tap «Deshacer» is still disabled (no entry was pushed), and the message goes away after the next successful tap.
    - Mistakes: cancel removing an overtime with marks → stays with its marks; tapping outside that dialog, or pressing Android Back (`onRequestClose`) while it is open, does nothing and leaves the overtime with its marks (RF-059). Also: «Deshacer» is disabled with an empty history, and pressing it more times than there are marks changes nothing.
  - Pending: nothing.

- [ ] **T084** · UI: the Undo history across the match's own routes, and leaving the match (RF-057, RF-082, E-019)
  - Layer and files: app · `src/app/matches/[matchId]/index.tsx` (the mount effect: `openMatch` on mount, `closeMatch` only in its cleanup), tests in `tests/app/` with `renderRouter` from `expo-router/testing-library` (awaited `testRouter` calls) and the database mock of T029. Taken out of T055 on 2026-11-12 (review D2-A-06).
  - Done when: `closeMatch` runs only when the match route is popped (going back to the team), never when the call-up or new-player route is pushed on top (D48, `plan.md` "Leaving the match"); no blur or focus event is used.
  - Scenarios:
    - Happy path: mark a cell, push the call-up route and go back → «Deshacer» removes that mark.
    - Boundaries: the same through the new-player route. Also: pressing the Android Back button from the call-up returns to the grid with the session kept.
    - Outside the rules: not applicable.
    - Odd data: open `/matches/1` directly (as the deep link of T056 does) → the grid with its saved marks.
    - Sequences: mark a cell, go back to the team screen, open the match again with `testRouter.push("/matches/1")` → «Deshacer» is disabled (RF-057). In the app this reopening has no button in D2 (D2 rule 9); the test and Maestro use the route directly. Also: mark Eva, remove Eva in the call-up screen, go back to the grid, press «Deshacer» → the mark is discarded and Eva does not come back (the D2 counterpart of E-026, RF-086).
    - Interruptions: E-019 at screen level: marks in P1–P3 and an overtime, unmount the whole tree (the app closing), render again with new stores on the same in-memory database → the list of teams first; push `/matches/1` → the same marks and overtime, «Deshacer» disabled.
    - Mistakes: pushing the call-up twice and going back twice keeps the same session; the grid is never pushed from its own child routes. Also: going back and forth to the call-up does not call `openMatch` again (a spy shows one call).
  - Pending: nothing.

- [ ] **T056** · Maestro US3 journeys and match interruption (RF-034, RF-042, RF-057, RF-058, RF-059, RF-082, E-017, E-019)
  - Layer and files: e2e · `e2e/us3-planning.yaml`, `e2e/us3-interruption.yaml` (`stopApp`, `launchApp`, `openLink`).
  - Done when: both flows pass on both platforms; each flow's `name` carries the IDs it covers (D2 rule 7); output in `review.md`.
  - Scenarios:
    - Happy path: US3 acceptance criteria 1–5 and 7: mark five starters in P1, tap one X to remove it, press «Deshacer» several times (each press reverts one action); add and remove overtimes; mark a cell, open the call-up screen, go back to the grid and press «Deshacer» → the mark is gone. Each flow starts with `launchApp` and `clearState: true`, so the first match created has ID 1, and reopens it with `openLink: planificadorperiodos://matches/1` (the `scheme` of `app.json`).
    - Boundaries: P1 with 5 X and a sixth tap on an empty cell → nothing changes and nothing appears (D2 limit, RF-055); three overtimes added → the grid scrolls horizontally; only the last overtime offers «Quitar prórroga».
    - Outside the rules: mark one player in P1, P2 and P3 → the marks are accepted and the warnings of US4 show.
    - Odd data: `openLink` to `planificadorperiodos://matches/99`, to `…/matches/abc` and to `…/matches/01` → `notFound.message` (only the canonical text of a positive integer is a valid ID, T032); an overtime with marks removed → confirmation, confirm → gone with its marks.
    - Sequences: mark, add an overtime, «Deshacer» twice → the overtime stays and the mark is gone; mark a cell, go back to the team, open the match again with the deep link → «Deshacer» has nothing to undo (RF-057). E-017 (moved here from T048 on 2026-11-12): mark two cells of Ana, open the call-up screen and remove her → the confirmation «¿Quitar a Ana de la convocatoria?»; «Cancelar» → Ana and her marks stay; remove again and confirm → back on the grid her row and marks are gone (RF-034).
    - Interruptions: E-019: marks in P1–P3 and an overtime, `stopApp`, `launchApp` without `clearState` → the list of teams is shown; `openLink` → the same marks and overtime, «Deshacer» has nothing to undo; second flow: remove a player in the call-up screen, `stopApp`, `launchApp`, `openLink` → the call-up is as it was left (RF-082).
    - Mistakes: «Deshacer» pressed more times than there are actions; cancel the overtime removal and tap outside its dialog (and, on Android, the Back command) → the overtime stays with its marks. Criterion 6 (save failure) is covered by T051 and T055, and criterion 8 by T053 and T057.
  - Pending: nothing. **Answered by Fernando on 2026-11-12 (D2 review, review D2-A-01):** the team's match list stays in D3; D2 reopens a match only with the deep link, in Maestro, and E-019 is proven in D2 by the store (T052), the screen tests (T084) and this flow, not through a list. In the app, once the coach goes Back from a new match's grid, there is no way back to it until T071 (D2 rule 9, `plan.md` "Risks").

- [ ] **T057** · Device check of the grid layout on phone and tablet (RF-076, RF-077, RF-078, RF-079, RF-080, RF-081)
  - Layer and files: `review.md` (device check with screenshots).
  - Done when: Fernando checks the grid on an iPhone, the 5th-gen iPad and an Android phone, in portrait and landscape, against RF-076–RF-081, and checks by eye that the warning colours (light red cells, players in red) show on the three devices, since Maestro checks only text (T060); including 12 players with every banner and the legend on the iPad in landscape, and 13 players on the iPad (every period across, vertical scroll in landscape).
  - Scenarios:
    - Happy path: 4, 6 and 8 periods, 0 and 2 overtimes, 9, 12 and 13 players, each device and orientation: a 6-period match with 10 players and no overtimes on a 375 pt iPhone in portrait shows every period without horizontal scroll (RF-079).
    - Boundaries: 8 periods on a 375 pt phone in portrait → horizontal scroll with cells of at least 44 pt (RF-078); 12 players with every banner and the legend on the iPad in landscape → no vertical scroll; 13 players on the iPad → every period across, vertical scroll in landscape and none in portrait (RF-081).
    - Outside the rules: 13 players and 2 overtimes on a phone in landscape → both scrolls, and the player column and the counters stay visible.
    - Odd data: a very long player name → cut with an ellipsis; 15 players on a phone in landscape → vertical scroll.
    - Sequences: rotate portrait → landscape → portrait with marks on the grid → the same marks, the sizes recomputed, the player column fixed (RF-076, RF-077).
    - Interruptions: rotate with the call-up screen open and with the overtime-removal dialog open → the screen and the dialog stay.
    - Mistakes: scroll the grid sideways and down, then tap a cell → the tapped cell is the one marked, and the player column and its counters stay in place; the buttons are reachable on each device.
  - Pending: nothing.

**US3 checkpoint:** Fernando plans a match: marks and removes X, undoes several times, also after opening the call-up and coming back, adds and removes overtimes, on phone and tablet in both orientations. He plans a match right after creating it; reopening it from the team's list arrives in D3 (T071), so in D2 a closed and reopened match is checked by the tests and by Maestro's deep link (T056). Known D2 limits (D2 rule 9): a tap on an empty cell of a full rule-window period, or on an X in a period with a sub, does nothing yet; and after Back from the grid there is no way back to the match in the interface. Answered by Fernando on 2026-11-12.

## US4 · See the rule warnings

- [ ] **T058** · State: warnings and legend in the match view (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-072, RF-087, E-001, E-027)
  - Layer and files: state · `src/state/match-view-warnings.ts` (created here, review D2-A-11: `CellView.isLightRed`, `RowView.isInRed`, `ColumnView.headerMark`), `src/state/match-view.ts` (calls it; `MatchView.ruleImpossible`, `MatchView.legend`), tests in `match-view.warnings.test.ts`.
  - Done when: the view takes every colour and mark from `Warnings` (`lightRedCells`, `playersInRed`, `periodWarnings`, `ruleImpossible`) and the legend from `legendItems`; a grid with no warning has nothing set. These flags are the machine proof of the colours: Maestro checks only text (T060). The examples are grids passed straight to `buildMatchView`, because grids with a circled X in the rule window (E-002, E-027) cannot be built through D2's store actions; one `it.each` table per file, with one literal title carrying its RF and E IDs.
  - Scenarios:
    - Happy path: E-001 → Juan's P4 and P5 cells `isLightRed`. Also: the view of a grid with no warning has no light red cell, no player in red, no header mark, no general warning and an empty legend (RF-061, RF-087); E-004 → Pedro `isInRed` and `ruleImpossible`.
    - Boundaries: E-027 → legend light red, «!», «≠», not player in red. Also: E-005 → Pedro not `isInRed` while P5 has 3 X, and only P5 has a header mark (RF-064); the player in red and the general warning appear when P5 reaches 5 X (E-004).
    - Outside the rules: E-003 → Juan `isInRed`, `ruleImpossible`.
    - Odd data: free periods and overtimes never coloured (RF-006). Also: a light red cell in P5 of an 8-period grid with 3 overtimes stays in the legend, whatever is on screen (the view is built from the whole grid, RF-087: scrolling never changes it); marks in P7, P8 and overtimes never colour anything.
    - Sequences: after each tap the view matches the new warnings (RF-060). Also: after the last light red cell disappears, the legend loses its line (E-001 → fill P4 and P5 → none).
    - Interruptions: reopening rebuilds the same view.
    - Mistakes: a header both incomplete and inconsistent gives only «≠». Also: E-002 gives «≠» on P3 and «!» on the others; an empty free period or overtime has no mark.
  - Pending: nothing.

- [ ] **T059** · UI: warnings on the grid, colours and legend (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-072, RF-087, E-001, E-002, E-003, E-004, E-007, E-027)
  - Layer and files: UI · `src/ui/theme/warning-colors.ts`, `src/ui/grid/*` (colours and header marks), `src/ui/warnings/rule-impossible-banner.tsx`, `src/ui/warnings/warning-legend.tsx`, `src/i18n/es.json` (`warning.*`, `grid.header.incompleteMark`, `grid.header.inconsistentMark`), tests.
  - Done when: light red cells, players in red, «!» and «≠» in headers, the general warning (`warning.ruleImpossible`) above the grid and the legend under it (`warning.lightRedCell`, `warning.playerInRed`, `warning.incompletePeriod`, `warning.inconsistentPeriod`) render only from `MatchView`, with the colours of `warning-colors.ts` (the tests check the style colour of each light red cell and red player, because Maestro checks only text, T060); their heights reach `grid-layout.ts` through `onLayout` (T083); nothing is coloured by default. Component tests use `MatchView` fixtures, so E-002 and E-027 can be drawn although D2 cannot mark a circled X in the window.
  - Scenarios:
    - Happy path: E-001 → P4 and P5 light red, «!» on P1–P5. Also: a grid with no warning shows no coloured cell, no banner and no legend (RF-061, RF-087).
    - Boundaries: E-003 → red player, P5 light red and the general warning. Also: a window period with 4 X shows «!» and with 5 X does not; an empty free period and an overtime show none (RF-065).
    - Outside the rules: E-004 → red and general warning.
    - Odd data: E-007 (no subs, P5 and P6 empty) → only «!» on P5, no legend item other than «!». Also: E-001 and E-007 → no general warning banner (RF-067); with the only light red cell scrolled out of view (a scroll event on the horizontal `ScrollView`) the legend still explains it, and scrolling does not change the legend (RF-087).
    - Sequences: the last light red cell disappears → its legend line disappears. Also: a screen test in `tests/app/` with the real stores and the in-memory database: tap Juan's P1, P2 and P3 → P4 and P5 turn light red (E-001, RF-060) and tapping his X in P3 again removes the colour.
    - Interruptions: warnings shown again after reopening. Also: a screen test: unmount the tree and render `/matches/1` again with new stores → the same colours, marks and legend.
    - Mistakes: E-002 → «≠» on P3, not «!»; E-027 legend without the player in red. Also: a header both incomplete and inconsistent shows only «≠»; the legend never explains the player in red when only a light red cell exists.
  - Pending: nothing.

- [ ] **T060** · Maestro US4 journey and performance on the 5th-gen iPad (RF-060, RF-062, RF-063, RF-064, RF-065, RF-067, RF-087, E-001, E-003, E-005, E-006, E-007, E-008, E-009)
  - Layer and files: e2e · `e2e/us4-warnings.yaml`; measurement in `review.md`.
  - Done when: the flow reproduces the US4 acceptance criteria and E-001, E-003 and E-005–E-009 on both platforms; the flow's `name` carries the IDs it covers (D2 rule 7); on the iPad, a release build repaints under 100 ms after a tap with 12 players and 8 periods. E-027 (the situation of E-002, with a circled X in P3) cannot be marked in D2, which has no question and no long-press menu yet, so its journey moved to T066 (review of 2026-11-12); criterion 5 (legend) is checked here with the light red cell, «!» and the player in red.
  - Scenarios:
    - Happy path: the five US4 acceptance criteria: E-001 (Juan with X in P1–P3 → the legend line «Si la marcas, no descansará el mínimo del tramo.» and «!» on P1–P5); a period with 4 X shows «!»; the general warning text and the legend appear. Maestro checks only text (the legend lines, «!» and the general warning) and compares no screenshots; the colours are tested in Jest (T058, T059) and checked by eye in T057 on the three devices (answer of 2026-11-12).
    - Boundaries: E-006: P1–P4 with 5 X and P5 with 4 X, Pedro and Luis with 1 X each and neither in P5 → the general warning; E-005 (12 players) → Pedro not in red, only «!» on P5.
    - Outside the rules: E-003: Juan with 4 X in the first 5 periods → the general warning and the legend line «No cumple la regla del tramo.».
    - Odd data: E-008 (8 periods) and E-009 (4 periods): marks in the free periods add no legend line and no «!»; E-007 → only «!» on P5.
    - Sequences: remove the last light red cell with a tap or with «Deshacer» → its legend line disappears; a legend with no mark disappears.
    - Interruptions: `stopApp`, `launchApp`, `openLink` to the match → the same warnings and legend.
    - Mistakes: marking a player into a rule breach is never blocked (RF-060). Performance: on the iPad, a release build repaints under 100 ms after a tap with 12 players and 8 periods (measurement in `review.md`).
  - Pending: nothing.

**US4 checkpoint:** Fernando sees light red cells, players in red, the period marks, the general warning and the legend appear and disappear as he taps, with no lag on the iPad.

- [ ] **T061** · D2 close: verification, Codex and Security review, D2 section of `summary.md`, PR
  - Layer and files: `review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green, with a full local Stryker run (D2 rule 4) and the mutation run times recorded (local full, local incremental, and on CI the full runs after T024, T080, T028 and T029 and the incremental ones, with whether the cache was restored); Maestro output recorded (the T036 flows were written but NOT run: run them first, see the T036 Pending); the "how to run Maestro" section of `summary.md` carries: install Maestro >= 2.7.0 (not npm), build a Release app (`npx expo run:ios --configuration Release`, `npx expo run:android --variant release`), then `maestro test e2e/us1-teams-and-players.yaml` and `maestro test e2e/us1-form-interruption.yaml`; the surviving mutants of `src/domain/undo.ts` listed in `review.md` from the Stryker HTML report, each classified as equivalent or as defence only (reachable only with a history that does not match the grid, `plan.md` "Test strategy"), and any survivor in a D2 domain file killed or explained; Security has reviewed the D2 dependencies, the backup plugin, the data layer and the navigation; no blocking finding; the D2 section of `summary.md` explains what was done with real code and states, under "Pending", the known D2 limits of D2 rule 9: a tap on an empty cell of a full rule-window period, or on an X in a period with a sub, does nothing yet (US5, D3); after pressing Back from a new match's grid there is no way back to that match in the interface until the team's match list (T071, D3), although its data is saved; a team with no players shows an empty list with no text; and a failed read shows an existing state with no specific message (the list of teams shows `teams.empty`, a team or match that cannot be read shows «No se ha encontrado: puede que se haya borrado.»); the PR "001 D2: teams, matches, grid, warnings" is merged by Fernando after using the app in a match.
  - Scenarios (checks of the close):
    - Happy path: `scripts/verify.sh` green with the full local Stryker run, coverage of `src/domain/` at 90 % or more and at least 80 % of mutants killed.
    - Boundaries: the traceability check passes with every ticked D2 task, including the IDs that only Maestro covers (each has a Jest test too, D2 rule 7).
    - Outside the rules: a blocking finding of Codex or Security sends the work back to phase 6; it is not left as a pending note.
    - Odd data: a surviving mutant in a D2 domain file that is not in the documented `undo.ts` list is a finding.
    - Sequences: the full local run first, then the CI runs after T024, T080, T028 and T029 (full) and the incremental ones, each with its time.
    - Interruptions: a Stryker run that is killed halfway is repeated from the full local command (the incremental file is rebuilt), never trusted.
    - Mistakes: `summary.md` states the four known D2 limits under "Pending"; Codex checks that the explanations match what was done.
  - Pending: the Planner reviews D3 with the lessons of D2 before it starts (including the slice files of the session store, `plan.md` "State").

# D3 · Rest of v1 (US5–US7)

## US5 · Record subs during the match

- [ ] **T062** · State: questions and answers in the session (RF-045, RF-046, RF-047, RF-050, RF-051, RF-054, RF-057, RF-086, E-011, E-013, E-026)
  - Layer and files: state · `src/state/match-session-store.ts` (`pending`, `answerSub`, `answerStarter`, `chooseReplaced`, `confirmRemove`, `cancelQuestion`), `src/state/match-view.ts` (`replaceableStarters`), tests.
  - Done when: each domain question is stored as `pending`; each answer saves and publishes; `cancelQuestion` (the one action behind «Cancelar», tapping outside and Android Back) leaves the grid as it was at any step; a replacement is one undo entry.
  - Scenarios:
    - Happy path: E-011 → question → sub → circled X saved.
    - Boundaries: starter → choose Eva → both cells saved together.
    - Outside the rules: not applicable.
    - Odd data: a tap on another cell while a question is pending is ignored.
    - Sequences: replacement then undo → both cells restored in one press; E-026 with the real database (moved here from T052 on 2026-11-12): replace Eva by Ana in P2, remove Eva with `removeFromCallUp`, undo → Ana's P2 empty, P2 with 4 X, Eva not back.
    - Interruptions: closing with a pending question → nothing saved for it.
    - Mistakes: cancel while choosing the replaced X → no change (RF-045).
  - Pending: nothing.

- [ ] **T063** · State: long-press menu actions (RF-052, RF-053, RF-057)
  - Layer and files: state · `src/state/match-session-store.ts` (`openCellMenu`, `chooseCellMenuOption`), tests.
  - Done when: `openCellMenu` sets `pending` to the menu only on marked cells; each choice goes through the domain; «Titular» with 5 X asks which X; «Quitar» on an X with a sub shows the reminder; each change is one undo entry; closing the menu goes through `cancelQuestion`.
  - Scenarios:
    - Happy path: circled X → «Titular» with 4 X.
    - Boundaries: same state chosen → nothing saved, no undo entry.
    - Outside the rules: not applicable.
    - Odd data: long press on an empty cell → no menu.
    - Sequences: menu change then undo.
    - Interruptions: not applicable.
    - Mistakes: «Quitar» with a sub, then cancel → X stays; closing the menu without a choice → nothing saved, no undo entry.
  - Pending: nothing.

- [ ] **T064** · UI: sub-or-starter question, replaced-X choice and removal reminder (RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, RF-066, E-011, E-012, E-013)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx`, `src/ui/choice-dialog.tsx` (question mode: «Cancelar», tapping outside and Android Back all cancel), `src/i18n/es.json` (`grid.subOrStarter.*`, `grid.chooseReplaced.title`, `grid.removeXReminder.*`), tests.
  - Done when: the three dialogs show the approved texts; each one is cancelled by «Cancelar», by tapping outside or by Android Back (`onRequestClose`), with no change; the replaced-X choice lists the five starters by number and name; confirmations still ignore taps outside and Back.
  - Scenarios:
    - Happy path: E-011 question, answer sub.
    - Boundaries: E-012 in P6 → circled X without a dialog.
    - Outside the rules: not applicable.
    - Odd data: two starters with the same number are told apart by name.
    - Sequences: E-013 → reminder → remove anyway → «≠» in P3.
    - Interruptions: rotating the device with a dialog open keeps it.
    - Mistakes: tapping outside the question or the choice cancels it and leaves the tapped cell empty; Android Back with the question, the choice or the reminder open cancels it with no change and does not leave the match screen (RF-045, RF-050).
  - Pending: nothing.

- [ ] **T065** · UI: long press on cells with gesture handler and the cell menu (RF-052, RF-053, RF-076)
  - Layer and files: UI and app · `src/ui/grid/grid-cell.tsx`, `src/app/_layout.tsx` (root view if v3 requires it), `src/ui/choice-dialog.tsx` (menu layout), `src/i18n/es.json` (`grid.cellMenu.*`, `common.cancel`), tests.
  - Done when: a long press on a marked cell opens the menu with exactly three options, «Titular», «Entró de cambio» and «Quitar», and below them, set apart, the «Cancelar» button, which is not a fourth option; «Cancelar», tapping outside and Android Back close it with no change; on an empty cell nothing happens; a short tap still works; the v3 API used is the one in the installed version's docs.
  - Scenarios:
    - Happy path: long press on a circled X → «Titular».
    - Boundaries: «Titular» with 5 X → replaced-X choice.
    - Outside the rules: not applicable.
    - Odd data: long press while scrolling the grid does not open the menu.
    - Sequences: long press then tap on another cell.
    - Interruptions: not applicable.
    - Mistakes: long press on an empty cell → no mark, no menu; «Cancelar», tapping outside the menu or Android Back → cell unchanged, no undo entry; the menu never shows «Cancelar» as one of its options.
  - Pending: nothing.

- [ ] **T066** · Maestro US5 journey, E-026 through the call-up screen, E-027, and device check on phone and tablet (RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, RF-052, RF-053, RF-054, RF-055, RF-057, RF-066, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081, RF-086, RF-087, E-011, E-012, E-013, E-026, E-027)
  - Layer and files: e2e · `e2e/us5-subs.yaml`, `e2e/us5-undo-after-call-up.yaml`; device check in `review.md`.
  - Done when: the flows cover the US5 acceptance criteria 1–6 on both platforms, and E-026 as written: starter replacement of Eva by Ana in P2, Eva removed in the call-up screen, back to the grid, «Deshacer» → Ana's P2 empty, P2 with 4 X, Eva not back; Fernando checks the dialogs and menu on phone and tablet in both orientations.
  - Scenarios: the six US5 acceptance criteria, E-011–E-013 and E-026; E-027 (moved here from T060 on 2026-11-12): build E-002 with a sub in P3 and check that the legend explains the light red cell, «!» and «≠», and not the player in red.
  - Pending: nothing.

**US5 checkpoint:** Fernando records subs and starter replacements during a period, uses the long-press menu and never reaches a sixth X.

## US6 · View, edit and delete matches

- [ ] **T067** · Domain: match list order (RF-074, RF-075)
  - Layer and files: domain · `src/domain/match-order.ts`, test.
  - Done when: `compareMatches` orders by date descending, then time descending, with matches without a time after those with one.
  - Scenarios:
    - Happy path: 2026-11-01, 2026-11-08, 2026-11-15 → 15, 8, 1.
    - Boundaries: same date 10:00 and 12:00 → 12:00 first.
    - Outside the rules: not applicable.
    - Odd data: same date, one without time → the one with time first; identical date and time → stable.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: "09:00" versus "10:00" compared as times.
  - Pending: nothing.

- [ ] **T068** · Data: match lists, edit details, delete match, change format (RF-028, RF-029, RF-038, RF-040, RF-041, RF-074, RF-075, E-016)
  - Layer and files: data · `src/data/match-repository.ts`, `src/data/records.ts` (`MatchListRecord`), tests.
  - Done when: all matches are listed with team name and category, and a team's matches alone; `updateMatchDetails` updates every detail except the format; delete removes the match, call-up and marks; `changeMatchFormat` updates the format and deletes marks of vanished periods in one transaction.
  - Scenarios:
    - Happy path: list matches of two teams.
    - Boundaries: format 8 → 4 deletes P5–P8 marks, keeps overtime marks.
    - Outside the rules: not applicable.
    - Odd data: no matches → empty list.
    - Sequences: edit details twice, read back; clear the time; change the format, then update the details → the new format is kept.
    - Interruptions: failure halfway through a format change → nothing changed.
    - Mistakes: deleting one match leaves the team's other matches.
  - Pending: nothing.

- [ ] **T069** · State: match lists, editing and deleting matches (RF-025, RF-028, RF-029, RF-074, RF-075, RF-083, RF-085, E-023, E-032)
  - Layer and files: state · `src/state/matches-store.ts`, tests.
  - Done when: `allMatches` and `teamMatches` are published sorted with `compareMatches` and formatted with `displayDate` and `displayTime`, the team name and category only in `allMatches`; details are validated, saved and republished, and their input has no format; deleting removes the match from both lists; a failed save changes nothing.
  - Scenarios:
    - Happy path: three matches → 15, 8, 1.
    - Boundaries: E-023 «11/11/2026»; a match without time shows no time.
    - Outside the rules: not applicable.
    - Odd data: no score → `score` null.
    - Sequences: E-032 → «01/03/2026» and «18:30», then «Quitar hora» and «Guardar» → no time.
    - Interruptions: a new store lists the same matches.
    - Mistakes: one score only → `scoreIncomplete`, nothing saved.
  - Pending: nothing.

- [ ] **T070** · State: format change of the open match (RF-038, RF-039, RF-040, RF-041, RF-056, RF-082, RF-085, RF-086, E-016)
  - Layer and files: state · `src/state/match-session-store.ts` (`changeFormat`), `src/state/match-view.ts` (`formatOptions` with `isCurrent`), tests.
  - Done when: choosing the current format does nothing; another format is applied only through `changeFormat`, after the interface's confirmation, through the domain and the repository, and saved at once; it prunes the history and pushes no undo entry.
  - Scenarios:
    - Happy path: E-016 confirmed → marks P5–P8 gone.
    - Boundaries: the current format → nothing saved, no change (RF-039).
    - Outside the rules: not applicable.
    - Odd data: format change with no marks still goes through the confirmation in the interface.
    - Sequences: change format, undo → the format stays; 8 → 4 → 8 then undo never restores old P5–P8 marks; mark P2, change 6 → 8, undo → P2 reverted (the history survives the change, pruned).
    - Interruptions: reopen after a format change → new format saved.
    - Mistakes: failed save → format and marks as before.
  - Pending: nothing.

- [ ] **T071** · UI: list of every match and a team's matches (RF-074, RF-075, RF-083, E-023)
  - Layer and files: app and UI · `src/app/matches/index.tsx`, `src/app/teams/[teamId]/index.tsx` (matches section), `src/app/index.tsx` (link), `src/ui/match-list-item.tsx`, `src/i18n/es.json`, tests.
  - Done when: each item shows date, time, home, away, score if any and format; the list of every match also shows team and category; empty lists show their text.
  - Scenarios:
    - Happy path: three matches in order 15, 8, 1.
    - Boundaries: match without score or time; E-023 date format.
    - Outside the rules: not applicable.
    - Odd data: long team names.
    - Sequences: create a match, then Back from its grid → the team screen lists it exactly once, and the new-match form is not in the stack (review P-30); the list of every match also shows it once.
    - Interruptions: not applicable.
    - Mistakes: the team list never shows other teams' matches or the team name.
  - Pending: nothing.

- [ ] **T072** · UI: match details with «Guardar», format change saved at once with confirmation, delete match (RF-001, RF-025, RF-028, RF-029, RF-038, RF-039, RF-040, RF-041, RF-057, RF-082, RF-083, RF-085, RF-086, E-016, E-032)
  - Layer and files: app and UI · `src/app/matches/[matchId]/edit.tsx` (pushed on top of the match screen), `src/ui/match-form.tsx`, `src/i18n/es.json` (`confirm.formatChange.*`, `confirm.deleteMatch.*`, `match.clearTime`), tests in `tests/app/`.
  - Done when: as in `plan.md` "US6": the details are form fields saved only with «Guardar», which never writes the format; the format picker is outside «Guardar», shows the session's current format, does nothing for the current format, and for any other shows the general warning and confirmation and, on confirming, saves the change at once through the session; every detail can be edited and is shown unchanged on reopening; deleting asks first and then leaves the match; both confirmations close only with their buttons.
  - Scenarios:
    - Happy path: edit home, away and score, «Guardar».
    - Boundaries: format change with no marks still asks; the current format asks nothing.
    - Outside the rules: not applicable.
    - Odd data: clear every optional field; E-032 «Quitar hora».
    - Sequences: E-016 then reopen → P1–P4 only; mark a cell, open the details, go back to the grid → «Deshacer» removes that mark (RF-057); change the format, then «Guardar» the details → both saved.
    - Interruptions: in a 6-period match, type a new home name, change the format to 8 and confirm, go back without «Guardar» → the match has 8 periods and the old home name (RF-082); leaving without «Guardar» and without a format change keeps the saved details.
    - Mistakes: cancel the deletion or the format change → nothing changes; tapping outside either confirmation, or pressing Android Back while it is open, leaves it open and changes nothing (RF-029, RF-039).
  - Pending: nothing.

- [ ] **T073** · Maestro US6 journey (RF-028, RF-029, RF-039, RF-057, RF-074, RF-075, RF-082, RF-083, E-016, E-032)
  - Layer and files: e2e · `e2e/us6-matches.yaml`.
  - Done when: the flow covers the US6 acceptance criteria 1–5 and E-032 with the real pickers on both platforms; output in `review.md`.
  - Scenarios: the five US6 acceptance criteria, including a format change confirmed and the details left without «Guardar»; marking a cell, opening the details and coming back, then «Deshacer» removes the mark; creating a match and pressing Back from its grid → the team's list shows it exactly once (review P-30).
  - Pending: nothing.

**US6 checkpoint:** Fernando browses every match and each team's matches, edits a saved match, changes its format with the warning and deletes a match after confirming.

## US7 · Keep the squad up to date

- [ ] **T074** · Data: edit player, deactivate and reactivate, delete team with counts (RF-015, RF-018, RF-019, RF-020, RF-021, RF-022, RF-024, E-018)
  - Layer and files: data · `src/data/player-repository.ts`, `src/data/team-repository.ts`, tests.
  - Done when: name and number update only the player row (call-up snapshots untouched); `setPlayerActive` toggles; `countTeamContents` returns players and matches; `deleteTeam` cascades; there is no function to delete a single player.
  - Scenarios:
    - Happy path: Juan 7 → 9; old match still 7 (E-018).
    - Boundaries: deactivate the only player of a team.
    - Outside the rules: not applicable.
    - Odd data: same name and number in two teams; editing one leaves the other (RF-020).
    - Sequences: deactivate, reactivate, deactivate.
    - Interruptions: failure halfway through a team deletion → nothing deleted.
    - Mistakes: deleting a team never touches another team's data.
  - Pending: nothing.

- [ ] **T075** · State: edit, deactivate and reactivate players, delete a team (RF-015, RF-018, RF-019, RF-021, RF-022, RF-023, RF-024, RF-069, RF-085, E-018)
  - Layer and files: state · `src/state/squad-store.ts` (`updatePlayer`, `setPlayerActive`, `teamContents`, `deleteTeam`), tests.
  - Done when: editing validates like RF-016 and republishes the team; deactivating and reactivating save and republish; deactivated players leave the duplicate warning and `playersToAdd`; `teamContents` gives the counts; `deleteTeam` removes the team from every store; a failed save changes nothing.
  - Scenarios:
    - Happy path: rename and renumber Juan.
    - Boundaries: reactivate → selected in the next new-match draft.
    - Outside the rules: not applicable.
    - Odd data: deactivated player still shown with marks in a saved match.
    - Sequences: change Juan 7 → 9, add him to an older match → shows 9 there (RF-019). Also (RF-069, added on 2026-11-12): Juan and Ana both 7 → `duplicateNumbers` is ["7"]; change Juan to 8 → `duplicateNumbers` is empty; set them both to 7 again, deactivate Ana → empty again.
    - Interruptions: a new store sees the deactivation.
    - Mistakes: "07" → `numberInvalid`, nothing saved.
  - Pending: nothing.

- [ ] **T076** · UI: edit, deactivate and reactivate a player (RF-018, RF-021, RF-022, RF-023, RF-024, RF-069, E-018)
  - Layer and files: app and UI · `src/app/teams/[teamId]/players/[playerId].tsx`, `src/ui/player-form.tsx`, `src/i18n/es.json` (`player.*`, `confirm.deactivatePlayer.*`), tests.
  - Done when: editing updates the team; deactivating asks with a confirmation that closes only with its buttons and shows «Desactivado»; reactivating asks nothing; no delete action exists; an unknown `playerId` shows `notFound.message`.
  - Scenarios:
    - Happy path: rename Juan.
    - Boundaries: name of 40 characters.
    - Outside the rules: not applicable.
    - Odd data: a deactivated player is listed with «Desactivado»; unknown `playerId` → not-found message.
    - Sequences: deactivate, reactivate. Also (RF-069, added on 2026-11-12): with two active players numbered 7, the team screen shows the duplicate-number banner; edit one to 8 and «Guardar» → the banner is gone; with two 7 again, deactivate one and confirm → the banner is gone.
    - Interruptions: leaving without «Guardar» keeps the old data.
    - Mistakes: cancel deactivation → stays active; tapping outside the confirmation, or pressing Android Back while it is open, leaves it open and the player active (RF-022).
  - Pending: nothing.

- [ ] **T077** · UI: delete a team with confirmation (RF-015)
  - Layer and files: app and UI · `src/app/teams/[teamId]/edit.tsx`, `src/i18n/es.json` (`confirm.deleteTeam.*`), tests.
  - Done when: the confirmation states the numbers of players and matches and closes only with its buttons; on confirming, the team disappears from every list and the app returns to the teams list.
  - Scenarios:
    - Happy path: delete a team with 10 players and 3 matches.
    - Boundaries: team with no players and no matches.
    - Outside the rules: not applicable.
    - Odd data: plural forms «1 jugador» and «3 jugadores».
    - Sequences: delete, then the all-matches list no longer shows its matches.
    - Interruptions: not applicable.
    - Mistakes: cancel → nothing changes; tapping outside the confirmation, or pressing Android Back while it is open, leaves it open and changes nothing (RF-015).
  - Pending: nothing.

- [ ] **T078** · Maestro US7 journey (RF-015, RF-018, RF-019, RF-020, RF-022, RF-023, RF-024, E-018)
  - Layer and files: e2e · `e2e/us7-squad.yaml`.
  - Done when: the flow covers the US7 acceptance criteria 1–3 and E-018 on both platforms; output in `review.md`.
  - Scenarios: the three US7 acceptance criteria and E-018.
  - Pending: nothing.

**US7 checkpoint:** Fernando edits, deactivates and reactivates players and deletes a team, and saved matches keep the data they had.

## Closing

- [ ] **T079** · Full verification, Codex and Security review, `summary.md` and status "Closed" (RF-011, RF-012)
  - Layer and files: `spec.md` (status "Closed"), `review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with the spec "Closed" (every RF and E has a test); every Maestro flow green; a whole match played on a device in airplane mode with every text in Spanish; no blocking finding; Fernando accepts and merges the PR "001 D3: subs, matches, squad".
  - Pending: nothing.
