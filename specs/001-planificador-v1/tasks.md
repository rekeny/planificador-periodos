# Tasks · 001 Period planner v1

Legend: `[ ]` pending · `[x]` done. Each task is one commit, `T0NN RF-0NN: description`.

<!-- The RF and E IDs go on the same line as the checkbox: scripts/check-traceability.mjs reads them. -->

Three deliveries (ADR-004, `plan.md` "Deliveries"): **D1** T001–T023 on `001-planificador-v1-d1`, **D2** T024–T061 on `001-planificador-v1-d2`, **D3** T062–T079 on `001-planificador-v1-d3`. Before D2 and D3 start, the Planner reviews their tasks and Fernando approves again. Every task is at most three hours of work.

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

- [ ] **T023** · D1 close: verification with mutation testing, Codex and Security review, D1 section of `summary.md`, PR
  - Layer and files: `specs/001-planificador-v1/review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with Stryker ≥ 80 % and domain coverage ≥ 90 %, and the mutation run time recorded in `review.md`; no blocking finding; the D1 summary explains the engine with real code; the PR "001 D1: rules engine" is merged by Fernando.
  - Pending: the Planner reviews D2 with the lessons of D1 before it starts.

**D1 checkpoint:** every rule of the regulations exists as a pure, tested function; every domain example of the spec passes; the app looks the same as before.

# D2 · Usable in a match (US1–US4)

## Setup

- [ ] **T024** · Data stack: install expo-sqlite, Drizzle 0.45, drizzle-kit, Zustand and the test driver
  - Layer and files: configuration · `package.json`, `package-lock.json`, `drizzle.config.ts` (`dialect: "sqlite"`, no driver), `eslint.config.js` and `.prettierignore` (ignore `src/data/migrations/`), `plan.md` "New dependencies" (exact versions).
  - Done when: every package of the D2 dependency table is installed once here, `zustand` included; Security has reviewed them; the dev build starts on iOS and Android; `verify.sh` is green with `drizzle-kit check`.
  - Scenarios:
    - Happy path: dev build opens the app with the new packages.
    - Boundaries: not applicable.
    - Outside the rules: no new permission in the generated manifests.
    - Odd data: not applicable.
    - Sequences: `npx expo-doctor` and `npm audit` green after installing.
    - Interruptions: not applicable.
    - Mistakes: `better-sqlite3` is a development dependency and is not bundled; no `babel.config.js` or `metro.config.js` is created.
  - Pending: nothing.

- [ ] **T025** · Keep the data out of Android backups and device-to-device transfer: config plugin, Android part (RF-088, E-028)
  - Layer and files: configuration · `plugins/with-backup-exclusion.js` (created, Android part), `app.json` (`plugins`; `android.allowBackup: false` kept), `tests/plugins/with-backup-exclusion.test.ts`, `docs/security.md` (Android controls), device check in `review.md`.
  - Done when: the plugin writes `data_extraction_rules.xml` (`<cloud-backup>` and `<device-transfer>`) and `full_backup_content.xml`, both excluding every domain listed in `plan.md`, and sets `android:dataExtractionRules` and `android:fullBackupContent`; the test checks, by reading versioned files, that `allowBackup` is false, that the plugin is listed in `app.json` and that both XML files exclude every domain; after `npx expo prebuild --platform android --clean` the manifest has both attributes, and on the emulator `adb shell bmgr backupnow` reports that the app takes no part in backup.
  - Scenarios:
    - Happy path: `prebuild` for Android, then a dev build on the emulator.
    - Boundaries: the rules for Android 12 and later (`dataExtractionRules`) and for Android 11 and lower (`fullBackupContent`) are both present.
    - Outside the rules: not applicable.
    - Odd data: running `prebuild` twice does not duplicate the attributes or the XML files.
    - Sequences: `prebuild`, change nothing, `prebuild` again → identical output.
    - Interruptions: not applicable.
    - Mistakes: an XML without the `<device-transfer>` section, or missing one domain, fails the test.
  - Pending: nothing.

- [ ] **T026** · Keep the data out of iOS backups: config plugin, iOS part, and Security audit of the plugin (RF-088, E-028)
  - Layer and files: configuration · `plugins/with-backup-exclusion.js` (iOS part, with `withAppDelegate`), `tests/plugins/with-backup-exclusion.test.ts` (Swift fragment), `docs/security.md` (iOS control and audit checklist), device check in `review.md`.
  - Done when: the database folder is the one of the installed expo-sqlite's `defaultDatabaseDirectory`; the plugin adds tagged, idempotent launch code to `AppDelegate.swift` that creates that folder if missing and sets `isExcludedFromBackup`, and throws if its anchor is missing; the test checks the Swift fragment; after `npx expo prebuild --platform ios --clean`, `xattr` on the iOS simulator shows the exclusion on the database folder; Security has audited the whole plugin, both platforms.
  - Scenarios:
    - Happy path: `prebuild` for iOS, then a dev build on the simulator.
    - Boundaries: the folder does not exist yet on first launch → it is created and excluded.
    - Outside the rules: not applicable.
    - Odd data: running `prebuild` twice does not duplicate the iOS code.
    - Sequences: `prebuild`, change nothing, `prebuild` again → identical output.
    - Interruptions: not applicable.
    - Mistakes: an `AppDelegate.swift` without the anchor makes the plugin throw with a clear message; the Library/Caches folder is never used.
  - Pending: nothing.

- [ ] **T027** · Schema, first migration and the migration bundle script (RF-011, RF-082)
  - Layer and files: data and tooling · `src/data/schema.ts`, `src/data/migrations/` (generated SQL and `meta/`), `scripts/bundle-migrations.mjs`, `src/data/migrations/bundle.ts` (generated), `package.json` (`db:generate`), `tests/scripts/bundle-migrations.test.ts`.
  - Done when: the five tables of `plan.md` exist with their checks and cascades in the generated SQL; `bundle.ts` has the shape that the installed `drizzle-orm/expo-sqlite/migrator` expects (checked against its types); the test fails when `bundle.ts` differs from the SQL files; `drizzle-kit check` green.
  - Scenarios:
    - Happy path: `npm run db:generate` writes the SQL and the bundle.
    - Boundaries: a migration with quotes, backticks and `${` in its SQL is bundled unchanged.
    - Outside the rules: not applicable.
    - Odd data: a journal with one entry.
    - Sequences: generating twice with no schema change changes no file.
    - Interruptions: not applicable.
    - Mistakes: editing a `.sql` file without re-bundling turns the test red.
  - Pending: nothing.

- [ ] **T028** · Test database helper and schema tests (RF-016, RF-017, RF-025)
  - Layer and files: tests · `tests/support/test-database.ts` (in-memory `better-sqlite3`, the real migrations), `src/data/schema.test.ts`.
  - Done when: the helper opens a migrated database per test with foreign keys on; tests prove each check and each cascade; no file under `src/` imports `better-sqlite3`.
  - Scenarios:
    - Happy path: a fresh database migrates and has the five tables.
    - Boundaries: format 4 and 8 accepted, 5 rejected by the check; "0" and "00" stored distinct.
    - Outside the rules: only one score set → rejected by the check.
    - Odd data: two players with the same number in one team are accepted (RF-017).
    - Sequences: migrating twice does nothing the second time.
    - Interruptions: a transaction that fails halfway leaves nothing written.
    - Mistakes: deleting a team removes its players, matches, call-up entries and marks; deleting a call-up entry removes its marks.
  - Pending: nothing.

- [ ] **T029** · Open the database and migrate at start-up (RF-011, RF-082)
  - Layer and files: data, state and app · `src/data/database.ts`, `src/state/database-ready.ts`, `src/state/app-stores.ts` (first version), `src/app/_layout.tsx`.
  - Done when: the app opens the database, sets foreign keys and WAL, runs the bundled migration once, and keeps the splash screen until it ends; the dev build starts on both platforms with an empty list.
  - Scenarios:
    - Happy path: first launch creates and migrates the database.
    - Boundaries: second launch does not migrate again.
    - Outside the rules: not applicable.
    - Odd data: not applicable.
    - Sequences: kill the app during the splash, launch again → still opens.
    - Interruptions: a failing migration keeps the splash and shows nothing half-made (state test with a throwing double).
    - Mistakes: no screen renders before the database is ready.
  - Pending: nothing.

## US1 · Create teams and players

- [ ] **T030** · Domain: team and player validation, team order (RF-013, RF-016, RF-073, E-021)
  - Layer and files: domain · `src/domain/squad-validation.ts`, `src/domain/team-order.ts`, tests.
  - Done when: a blank or spaces-only name gives `nameRequired`; E-021 holds; category is optional; teams sort alphabetically in Spanish.
  - Scenarios:
    - Happy path: «Cadete B» and «Alevín A» → «Alevín A» first.
    - Boundaries: E-021: "0", "00", "7", "99" valid; "07", "100" and "" give `numberInvalid`.
    - Outside the rules: not applicable.
    - Odd data: "7a", " 7", "-1" invalid; names with spaces around are trimmed; accents and capitals sorted naturally.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: a name of only spaces is blank.
  - Pending: nothing.

- [ ] **T031** · Data: team and player repositories (RF-013, RF-014, RF-016, RF-017, RF-085)
  - Layer and files: data · `src/data/records.ts`, `src/data/team-repository.ts`, `src/data/player-repository.ts`, tests with `tests/support/test-database.ts`.
  - Done when: teams are created, edited, listed and read; players are created and listed for one team only; duplicates are saved; records carry the format as a number; a failing write throws and leaves nothing written.
  - Scenarios:
    - Happy path: create two teams → both listed.
    - Boundaries: "0" and "00" stored and read back distinct.
    - Outside the rules: a second player 7 is saved.
    - Odd data: a category of null and an empty list of players.
    - Sequences: create, edit name and category, read back.
    - Interruptions: a write that fails halfway leaves nothing.
    - Mistakes: a name with quotes or `'; DROP TABLE` is stored as text (parameterised queries).
  - Pending: nothing.

- [ ] **T032** · State: squad store, route parameters, format options and save results (RF-001, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073, RF-085, E-020)
  - Layer and files: state · `src/state/squad-store.ts`, `src/state/route-params.ts`, `src/state/format-options.ts`, `src/state/save-result.ts`, tests.
  - Done when: actions validate with the domain, save through the repositories and publish teams sorted, players sorted and duplicate numbers; invalid input returns its errors and saves nothing; a failed write returns `saveFailed` and publishes nothing; `openTeam` with an unknown ID publishes "not found".
  - Scenarios:
    - Happy path: create team → appears in the sorted list.
    - Boundaries: adding the second 7 publishes the duplicate warning; E-020 order published.
    - Outside the rules: not applicable.
    - Odd data: route parameter "abc", "0" or "-1" → `null`; a well-formed ID of a team that does not exist → not found.
    - Sequences: create team, add three players, list in number order.
    - Interruptions: a new store reads the same data from the database.
    - Mistakes: blank team name → error, nothing saved; repository throws → `saveFailed`, list unchanged.
  - Pending: nothing.

- [ ] **T033** · UI: navigation and the list of teams (RF-012, RF-014, RF-073)
  - Layer and files: app · `src/app/_layout.tsx` (the `Stack`, its headers and the modal presentation of the form routes), `src/app/index.tsx`, `src/i18n/es.json` (`teams.title`, `teams.empty`, `teams.new`), tests in `tests/app/`.
  - Done when: the app opens on the list of teams, sorted alphabetically; an empty list shows `teams.empty`; «Nuevo equipo» navigates to `/teams/new` (route created in T034) and tapping a team to `/teams/[teamId]` (route created in T035), checked with `renderRouter`; every text comes from `es.json`.
  - Scenarios:
    - Happy path: «Cadete B» and «Alevín A» → «Alevín A» first (RF-073).
    - Boundaries: one team; no team → «Todavía no hay equipos. Crea el primero.».
    - Outside the rules: not applicable.
    - Odd data: a 40-character team name is cut with an ellipsis; names with accents.
    - Sequences: a team created through the store appears in the list without restarting.
    - Interruptions: launching the app again shows the list of teams first (RF-073).
    - Mistakes: two teams with the same name are both listed (RF-014).
  - Pending: nothing.

- [ ] **T034** · UI: team form, new and edit routes, format picker, save error and the not-found state (RF-001, RF-012, RF-013, RF-082, RF-085, E-022)
  - Layer and files: app and UI · `src/app/teams/new.tsx`, `src/app/teams/[teamId]/edit.tsx`, `src/ui/team-form.tsx`, `src/ui/format-picker.tsx`, `src/ui/input-limits.ts`, `src/ui/save-error-banner.tsx`, `src/ui/not-found.tsx`, `src/i18n/es.json` (`team.field.*`, `common.save`, `format.option`, `validation.nameRequired`, `error.saveFailed`, `notFound.message`), tests in `tests/app/` and next to the components.
  - Done when: a team can be created and edited with name, category and default format; the format picker shows exactly «4 periodos», «6 periodos» and «8 periodos»; name and category stop at 40 characters with no message; leaving the form without «Guardar» discards it without asking; a failed save shows `error.saveFailed`; the edit route with a malformed or unknown `teamId` shows only `notFound.message` («No se ha encontrado: puede que se haya borrado.») and changes nothing. This is the first route with an ID, so `not-found.tsx` is created here and reused by T035, T046 and later screens.
  - Scenarios:
    - Happy path: create «Alevín A», 6 periods → listed.
    - Boundaries: the format picker shows exactly three options; a 40-character name is saved, a 41st character is not accepted (E-022).
    - Outside the rules: not applicable.
    - Odd data: empty category; `/teams/abc/edit` and the ID of a deleted team → not-found message.
    - Sequences: create, edit, list updated.
    - Interruptions: go back from a half-filled form → no question, no team saved (RF-082).
    - Mistakes: save with a blank name → «Escribe un nombre.», nothing saved; save fails → message, team not in the list.
  - Pending: nothing.

- [ ] **T035** · UI: team screen with sorted players, new player form and duplicate-number warning (RF-016, RF-017, RF-069, E-020, E-021, E-022)
  - Layer and files: app and UI · `src/app/teams/[teamId]/index.tsx`, `src/app/teams/[teamId]/players/new.tsx`, `src/ui/player-form.tsx`, `src/ui/warnings/duplicate-number-banner.tsx`, `src/i18n/es.json`, tests.
  - Done when: the team shows its players sorted; a player is added with name and number; the name stops at 40 characters; an invalid number shows `validation.numberInvalid`; the duplicate-number banner lists the numbers; an unknown `teamId` shows `notFound.message`.
  - Scenarios:
    - Happy path: add 9, 4, 7 → 4, 7, 9.
    - Boundaries: E-020 order on screen; the number field accepts at most two characters.
    - Outside the rules: second 7 saved and the banner appears.
    - Odd data: unknown `teamId` → «No se ha encontrado: puede que se haya borrado.», on the team screen and on the new-player route.
    - Sequences: add players one after another without leaving the screen.
    - Interruptions: leaving the new-player form without «Guardar» saves nothing.
    - Mistakes: "07" or a missing number → «El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.» (E-021).
  - Pending: nothing.

- [ ] **T036** · Maestro set-up, US1 journey and form interruption (RF-011, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073, RF-082, E-029)
  - Layer and files: e2e · install the Maestro CLI on the Mac (not npm); `e2e/us1-teams-and-players.yaml`, `e2e/us1-form-interruption.yaml` (`stopApp`, `launchApp`); how to run them in `summary.md`.
  - Done when: the flows create two teams and players including a duplicate number, check order and warning, and reproduce E-029; they pass on the iOS simulator and the Android emulator; output in `review.md`.
  - Scenarios: the US1 acceptance criteria 1–5, with no network; E-029.
  - Pending: nothing.

**US1 checkpoint:** Fernando creates teams with name, category and default format, adds players, sees them sorted by number and sees the duplicate-number warning, on iPhone and Android.

## US2 · Create a match and its call-up

- [ ] **T037** · Domain: match input, defaults and date and time display (RF-025, RF-026, RF-036, RF-083, RF-084, E-023, E-032)
  - Layer and files: domain · `src/domain/match-input.ts`, `src/domain/match-date.ts`, tests.
  - Done when: `newMatchDefaults` gives the team's default format, today's date and no time; one score without the other gives `scoreIncomplete`; `displayDate` and `displayTime` give «01/03/2026» and «18:30»; `isoDate` and `isoTime` pad with zeros.
  - Scenarios:
    - Happy path: team with 6 periods, today 2026-11-11 → 6 periods, 2026-11-11, no time; E-023 → «11/11/2026».
    - Boundaries: score 0–0 and 999–0 valid; both empty valid; 00:00 and 23:59.
    - Outside the rules: not applicable.
    - Odd data: no time → `displayTime` returns `null` (E-032 after «Quitar hora»).
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: only the home score → `scoreIncomplete`; 1 March is «01/03/2026», never «1/3/2026».
  - Pending: nothing.

- [ ] **T038** · Data: match repository, create with call-up snapshot and read (RF-025, RF-026, RF-030, RF-036, RF-037, RF-084)
  - Layer and files: data · `src/data/match-repository.ts` (`createMatch`, `getMatch`), tests.
  - Done when: a match and its call-up entries (with name and number) are created in one transaction and read back unchanged; changing the team default does not change existing matches.
  - Scenarios:
    - Happy path: create with 12 players → 12 entries.
    - Boundaries: match with only format and date.
    - Outside the rules: 13 entries saved.
    - Odd data: free text with emojis and quotes; 500-character notes.
    - Sequences: change default 6 → 8, existing match still 6, new one 8; a match created with format 8 in a 6 team keeps the team default at 6.
    - Interruptions: failure halfway → no match and no entries.
    - Mistakes: deselected players are not in the call-up.
  - Pending: nothing.

- [ ] **T039** · Data: call-up repository, add, remove with marks, create a player from the match (RF-019, RF-032, RF-033, RF-034, RF-035, E-017)
  - Layer and files: data · `src/data/call-up-repository.ts`, tests.
  - Done when: adding stores the snapshot and returns the new entry with its `id`; removing deletes the entry and its marks; `createPlayerInMatch` creates the player in the team and in the call-up in one transaction.
  - Scenarios:
    - Happy path: add a player → entry with current name and number.
    - Boundaries: remove the last player of the call-up.
    - Outside the rules: not applicable.
    - Odd data: adding the same player twice is rejected by the unique index and reported, not thrown to the user.
    - Sequences: remove Ana with marks (E-017), add her again → new entry `id`, empty row.
    - Interruptions: failure creating the entry → no player created either.
    - Mistakes: removing from one match leaves her in other matches.
  - Pending: nothing.

- [ ] **T040** · State: new-match draft (RF-026, RF-027, RF-030, RF-031, RF-036, RF-068, RF-083, RF-084, RF-085, E-015, E-024, E-030)
  - Layer and files: state · `src/state/new-match-draft.ts`, tests.
  - Done when: the draft starts with the team default format, today's date, no time and every active player selected; `setFormat` changes it without confirmation and without touching the team; `clearTime` leaves no time; `useMyTeamAs` writes the team name only; deselecting updates the range warning; `create` saves and returns the match id, or `saveFailed` with nothing saved; after a successful `create`, calling it again returns the same match id and writes nothing, until the draft is reset (review P-30).
  - Scenarios:
    - Happy path: 12 active → 12 selected, no warning in 6 periods.
    - Boundaries: deselect to 9 → none; to 8 → warning (E-015); 13 selected → warning (E-030).
    - Outside the rules: create with 8 players → created, warning stays.
    - Odd data: team without players → empty call-up and warning.
    - Sequences: E-024 → 8 periods created, team default still 6; deselect in one match, next new match has everyone selected again.
    - Interruptions: the draft is dropped when the screen closes without «Guardar».
    - Mistakes: quick home then edit the text → edited text kept; the category is never copied; `create` called twice in a row → one match in the database and the same id both times; after a reset, `create` makes a new match.
  - Pending: nothing.

- [ ] **T041** · State: match session, opening and closing, and the first row view (RF-042, RF-068, E-020)
  - Layer and files: state · `src/state/match-session-store.ts` (created here: `status`, `openMatch`, `closeMatch`), `src/state/match-view.ts` (first version: rows sorted, with number, name and `hasMarks`; `callUpRange`), `src/state/app-stores.ts`, tests.
  - Done when: `openMatch` narrows and sorts the records into a `MatchGrid`, evaluates the warnings and publishes the view; an unknown ID gives `notFound`; `closeMatch` empties the grid, the warnings, the view and the history and sets `closed`; opening another match replaces the whole session.
  - Scenarios:
    - Happy path: open a match with 12 players → 12 rows in E-020 order.
    - Boundaries: a player without marks has `hasMarks` false; 9 players in 6 periods → no range warning.
    - Outside the rules: 13 players in the call-up → range warning in the view.
    - Odd data: `openMatch` with an unknown ID → `notFound`.
    - Sequences: open match A, then match B → only B's rows; `closeMatch` → `closed` and no view.
    - Interruptions: a new store on the same database shows the same call-up.
    - Mistakes: `closeMatch` twice, or with no match open, does nothing more.
  - Pending: nothing.

- [ ] **T042** · State: call-up actions in the open match (RF-023, RF-032, RF-033, RF-034, RF-035, RF-085, RF-086, E-017)
  - Layer and files: state · `src/state/match-session-store.ts` (`addToCallUp`, `removeFromCallUp`, `createPlayerInMatch`), `src/state/match-view.ts` (`playersToAdd`), tests.
  - Done when: call-up changes save first, then publish; removal prunes the history; `playersToAdd` offers only active players not in the call-up; a failed save leaves the view as it was and returns `saveFailed`.
  - Scenarios:
    - Happy path: add two players → two new empty rows in order.
    - Boundaries: remove the only player → no rows; add a 13th → range warning.
    - Outside the rules: not applicable.
    - Odd data: `playersToAdd` is empty when every active player is in the call-up.
    - Sequences: remove Ana with marks (E-017), add her again → empty row, no old marks.
    - Interruptions: a new store on the same database shows the changed call-up.
    - Mistakes: `playersToAdd` never offers a deactivated player; a failed save leaves the view and returns `saveFailed`.
  - Pending: nothing.

- [ ] **T043** · UI: new-match form with format, date and time pickers and quick home and away (RF-025, RF-026, RF-027, RF-036, RF-083, RF-084, E-022, E-023, E-024, E-032)
  - Layer and files: app and UI · `src/app/teams/[teamId]/matches/new.tsx` (form part), `src/ui/match-form.tsx` (the format and its change handler come as props, so the details screen of T072 can reuse it), `src/ui/date-time-field.ios.tsx`, `src/ui/date-time-field.android.tsx`, `src/i18n/es.json`, tests (pickers replaced by a test double).
  - Done when: the form shows every field of RF-025 with its defaults and limits; the format picker is filled with the team default and changes without a dialog; the date and time are chosen with the `@expo/ui` pickers (API read in the SDK 58 docs) and shown as «01/03/2026» and «18:30»; «Quitar hora» clears the time; there is no text field for the date or the time.
  - Scenarios:
    - Happy path: keep the defaults → today shown as «11/11/2026» (E-023).
    - Boundaries: home and away stop at 40 characters, notes at 500, each score at 3 digits (E-022).
    - Outside the rules: not applicable.
    - Odd data: no time chosen → the time shows as empty.
    - Sequences: choose 1 March 2026 at 18:30, then «Quitar hora» (E-032); change the format to 8 → no dialog (E-024).
    - Interruptions: rotating keeps the form.
    - Mistakes: one score only → «Escribe los dos resultados o ninguno.»; quick «Mi equipo es local» writes the team name only.
  - Pending: nothing.

- [ ] **T044** · UI: call-up selection in the new-match screen, with count and range warning (RF-005, RF-010, RF-030, RF-031, RF-068, E-015, E-030)
  - Layer and files: app and UI · `src/app/teams/[teamId]/matches/new.tsx` (call-up part and «Guardar»), `src/ui/call-up-selector.tsx`, `src/ui/warnings/call-up-range-banner.tsx`, `src/i18n/es.json`, tests next to the components and in `tests/app/` (`renderRouter` from `expo-router/testing-library`).
  - Done when: every active player is listed and selected at first; the count and the range warning follow the selection; a successful «Guardar» opens the grid of the created match with `router.replace`, never `router.push`, so the new-match route leaves the stack and Back from the grid goes to the team screen, never to the filled form (plan "After «Guardar»", review P-30); when `create` does not return `saved`, the screen stays on the form and does not navigate.
  - Scenarios:
    - Happy path: create with defaults and 12 players → the grid of the new match is shown.
    - Boundaries: 8 players in 6 periods → warning visible, button still enabled (E-015).
    - Outside the rules: 13 players → warning, created (E-030).
    - Odd data: team with no active players.
    - Sequences: toggle players, change the format, create; with `renderRouter` starting at `/teams/1` and pushing `/teams/1/matches/new`: create, then Back (`testRouter.back()`) → the pathname is `/teams/1`, the team screen, and not the new-match form, and the in-memory database holds exactly one match for the team (the team's match list arrives in D3, T071).
    - Interruptions: not applicable.
    - Mistakes: the deactivated players are not listed; two quick presses on «Guardar» → one match in the database.
  - Pending: nothing.

- [ ] **T045** · UI: confirmation dialog that closes only with its buttons, also against the Android Back button (RF-034)
  - Layer and files: UI · `src/ui/choice-dialog.tsx` (confirmation mode), tests.
  - Done when: the dialog shows title, message, the confirm button and «Cancelar»; tapping outside does nothing; `onRequestClose`, which React Native's `Modal` calls for the Android Back button, does nothing, so Back neither closes the dialog nor leaves the screen (D44, D46); it is used first by the call-up removal of RF-034.
  - Scenarios:
    - Happy path: confirm → the callback runs once.
    - Boundaries: a long title wraps and the buttons stay visible.
    - Outside the rules: not applicable.
    - Odd data: names with accents in the title.
    - Sequences: open, cancel, open again.
    - Interruptions: rotating with the dialog open keeps it.
    - Mistakes: tapping outside does not close it and changes nothing; Android Back (`onRequestClose` fired in the test) leaves it open, runs no callback and does not navigate back.
  - Pending: nothing.

- [ ] **T046** · UI: match screen first version and call-up screen (RF-023, RF-032, RF-033, RF-034, RF-035, RF-068, E-017)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx` (first version: call-up list and range warning; `openMatch` when it mounts and `closeMatch` only in that effect's cleanup, as in `plan.md` "Leaving the match"), `src/app/matches/[matchId]/call-up.tsx` (pushed on top of the match screen), `src/i18n/es.json` (`callUp.*`, including `callUp.addEmpty`), tests in `tests/app/`.
  - Done when: only active players not in the call-up are offered; when none is left, the list shows `callUp.addEmpty` («No quedan jugadores activos por añadir. Puedes crear uno nuevo.») and «Crear jugador nuevo» is still offered; removing a player with marks asks `confirm.removeFromCallUp.*`; without marks it asks nothing; the call-up screen is opened with `router.push`; a call-up route whose match session is not open shows `notFound.message`.
  - Scenarios:
    - Happy path: add two players.
    - Boundaries: a player without marks is removed without a dialog.
    - Outside the rules: 13 players → range banner.
    - Odd data: no players left to add → «No quedan jugadores activos por añadir. Puedes crear uno nuevo.»; unknown `matchId` → not-found message.
    - Sequences: remove a player and add him again; open the call-up and go back → the match screen is the same session, not opened again.
    - Interruptions: not applicable.
    - Mistakes: cancel the confirmation → player and marks stay (E-017); Android Back with the confirmation open → it stays open.
  - Pending: nothing.

- [ ] **T047** · UI: create a new player from the match (RF-035, RF-085)
  - Layer and files: app and UI · `src/app/matches/[matchId]/new-player.tsx` (pushed on top of the match screen), reusing `src/ui/player-form.tsx`, tests.
  - Done when: the player is created in the team and in the call-up of that match in one step; «Guardar» returns with `router.back()` to the screen that opened the form (the call-up screen, with the grid underneath) and never pushes a second grid (plan "After «Guardar»", review P-30); a failed save shows the message and creates neither.
  - Scenarios:
    - Happy path: create «Nora 15» → in the team and in the grid.
    - Boundaries: name of 40 characters.
    - Outside the rules: a duplicate number is allowed.
    - Odd data: "00".
    - Sequences: create, then remove her from the call-up → still in the team.
    - Interruptions: leaving without «Guardar» creates nothing.
    - Mistakes: "07" → number message, nothing created.
  - Pending: nothing.

- [ ] **T048** · Maestro US2 journey (RF-030, RF-031, RF-035, RF-036, RF-037, RF-068, RF-083, RF-084, E-015, E-017, E-023, E-024, E-032)
  - Layer and files: e2e · `e2e/us2-match-and-call-up.yaml`.
  - Done when: the flow covers the US2 acceptance criteria 1–6 with the real native pickers and passes on both platforms; output in `review.md`.
  - Scenarios: default format and date, everyone selected, 8 players warning, player created from the match, format changed in the form, «Quitar hora»; create the match, then Back from its grid (Maestro `back` on Android, the header back button on iOS) → the team screen, and the new-match form is not shown (review P-30; the "listed once" check is in T073, once the team's match list exists).
  - Pending: nothing.

**US2 checkpoint:** Fernando creates a match with today's date and the team's format, picks the call-up, sees the range warning when it applies and edits the call-up afterwards.

## US3 · Plan the periods

- [ ] **T049** · Data: grid repository, load records, save cell changes, overtimes (RF-056, RF-058, RF-059, RF-082, RF-085)
  - Layer and files: data · `src/data/grid-repository.ts`, tests.
  - Done when: `loadGridRecords` returns the match, its entries and its marks; `saveCellChanges` upserts or deletes marks in one transaction; adding and removing the last overtime update `overtime_count` and delete its marks.
  - Scenarios:
    - Happy path: save three marks, load → same records.
    - Boundaries: removing an overtime with marks deletes only its marks.
    - Outside the rules: not applicable.
    - Odd data: match with no marks and no overtimes.
    - Sequences: X → circled X → empty on the same cell.
    - Interruptions: failure in the second change of a replacement → neither saved.
    - Mistakes: a mark of an entry not in the match is rejected.
  - Pending: nothing.

- [ ] **T050** · State: grid view with columns, cells and counters (RF-042, RF-043, RF-070, RF-071, E-014, E-020)
  - Layer and files: state · `src/state/match-view.ts` (columns, cells, counters, `canUndo`, `canRemoveOvertime`, `lastOvertimeHasMarks`), tests.
  - Done when: `buildMatchView` gives one column per period then per overtime, one row per entry in E-020 order, one cell per row and column with its state, and the counter of each row; it calls only domain functions.
  - Scenarios:
    - Happy path: 6 periods + 1 overtime, 10 players → 10 rows, 7 columns.
    - Boundaries: E-014 counter 3 and 3.
    - Outside the rules: not applicable.
    - Odd data: empty call-up → no rows; 0 overtimes → `canRemoveOvertime` false.
    - Sequences: two overtimes → only the last can be removed.
    - Interruptions: not applicable.
    - Mistakes: every cell has exactly one state.
  - Pending: nothing.

- [ ] **T051** · State: tap and overtimes, saved at once (RF-044, RF-048, RF-049, RF-051, RF-056, RF-058, RF-059, RF-060, RF-082, RF-085, E-025)
  - Layer and files: state · `src/state/match-session-store.ts` (`tapCell`, `addOvertime`, `removeLastOvertime`), tests with the in-memory database and a throwing double.
  - Done when: each action saves before publishing and publishes new warnings and view; questions leave the grid unchanged in D2; removing an overtime prunes the history; a failed save publishes nothing and sets `saveFailed`.
  - Scenarios:
    - Happy path: tap empty with 4 X → X saved and published.
    - Boundaries: tap with 5 X in the window → no change (question, D3); 5 X in P6 → circled X.
    - Outside the rules: a tap breaking a rule is saved and warned.
    - Odd data: tap on a cell of an entry no longer in the call-up → nothing.
    - Sequences: many taps in a row → database equals store after each.
    - Interruptions: E-025 → Ana's P1 stays empty, P1 has 3 X, `saveFailed`, no undo entry.
    - Mistakes: removing an overtime with marks without confirming → nothing removed (the confirmation lives in the interface).
  - Pending: nothing.

- [ ] **T052** · State: undo of mark changes (RF-057, RF-082, RF-086, E-019, E-026, E-031)
  - Layer and files: state · `src/state/match-session-store.ts` (`undo`, history), tests.
  - Done when: each mark change pushes one entry; `undo` uses `undoLast`, saves and publishes; overtimes, call-up and format changes never push; structural changes prune; the history survives every action of the open session and is emptied only by `closeMatch` (and is empty in a new store); a failed save keeps the history.
  - Scenarios:
    - Happy path: three marks, three undos → grid as before.
    - Boundaries: undo with an empty history does nothing.
    - Outside the rules: not applicable.
    - Odd data: E-026 with the real database (the removal made with `removeFromCallUp`, as the call-up screen does).
    - Sequences: E-031; mark, add overtime, undo → overtime still there, mark gone; mark, add and remove a player through the call-up actions, undo → the mark is gone (the session was never closed).
    - Interruptions: E-019: marks in P1–P3 and an overtime, new store on the same database → same marks and overtime, nothing to undo; mark, `closeMatch`, `openMatch` of the same match → nothing to undo (RF-057).
    - Mistakes: undo pressed more times than actions.
  - Pending: nothing.

- [ ] **T053** · UI: grid layout as pure size functions, with the tablet height budget (RF-076, RF-078, RF-079, RF-080, RF-081)
  - Layer and files: UI · `src/ui/grid/grid-layout.ts`, test.
  - Done when: for 375 × 667, 667 × 375, 768 × 1024 and 1024 × 768 the cell width is ≥ 44 pt, 4 and 6 periods fit at 375 pt, 8 periods fit in landscape and on tablet, 12 rows fit on tablet in both orientations with the worst-case banners and legend of `plan.md`, with more than 12 players on a tablet every period still fits across and vertical scroll is set when the rows do not fit (RF-081, D49), overtimes that do not fit set horizontal scroll, and the grid buttons go in the header only on tablets.
  - Scenarios:
    - Happy path: 6 periods at 375 pt → no horizontal scroll.
    - Boundaries: 8 periods at 375 pt → scroll with 44 pt cells; 1024 × 768 with every banner → 12 rows of 44 pt fit.
    - Outside the rules: 13 players on a tablet, 8 periods → no horizontal scroll in either orientation; vertical scroll in 1024 × 768 (13 × 44 = 572 > 530 pt), none in 768 × 1024.
    - Odd data: 3 overtimes on a tablet → horizontal scroll; 15 players on a phone in landscape → vertical scroll.
    - Sequences: rotate → recomputed.
    - Interruptions: not applicable.
    - Mistakes: the cell width and the row height are never below 44.
  - Pending: nothing.

- [ ] **T054** · UI: grid component with fixed player column, headers, cells, counter and cell labels (RF-042, RF-043, RF-070, RF-071, RF-077, E-014, E-020)
  - Layer and files: UI · `src/ui/grid/match-grid.tsx`, `player-column.tsx`, `column-header.tsx`, `grid-cell.tsx`, `src/i18n/es.json` (`grid.header.*`, `grid.counter`, `grid.cell.empty`, `grid.cell.starter`, `grid.cell.sub`), tests.
  - Done when: the grid draws only `MatchView`; one row per entry with number, name and «J n · D n»; headers «P1»… and «PR1»…; three distinct cell states, each with its accessible label from `grid.cell.*` with the player's name and the column header («Ana, P2: casilla vacía», «Ana, P2: X, titular», «Ana, P2: X con círculo, entró de cambio»); the player column is outside the horizontal `ScrollView`.
  - Scenarios:
    - Happy path: 6 periods + 1 overtime, 10 players → 10 rows, 7 columns.
    - Boundaries: E-014 counter «J 3 · D 3»; an overtime cell's label uses «PR1».
    - Outside the rules: not applicable.
    - Odd data: very long name → ellipsis; empty call-up → no rows; E-020 order; a name with accents in the label.
    - Sequences: re-render after a change shows the new state and the new label.
    - Interruptions: not applicable.
    - Mistakes: a cell is never shown with two states, and its label always matches the state shown.
  - Pending: nothing.

- [ ] **T055** · UI: match screen with tap, undo, overtimes, save error and the Undo history across the match's own screens (RF-044, RF-049, RF-056, RF-057, RF-058, RF-059, RF-085, E-025)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx`, `src/i18n/es.json` (`grid.undo`, `grid.addOvertime`, `grid.removeOvertime`, `confirm.removeOvertime.*`), tests in `tests/app/` (with `renderRouter` from `expo-router/testing-library` for the navigation scenarios).
  - Done when: tapping cells calls the store; «Deshacer» is disabled with nothing to undo; «Añadir prórroga» adds a column; «Quitar prórroga» only for the last one, with a confirmation that closes only with its buttons when it has marks; a failed save shows `error.saveFailed`; `closeMatch` runs only when the match route is popped (going back to the team or a match list), never when the call-up or new-player route is pushed on top (D48).
  - Scenarios:
    - Happy path: mark five starters in P1.
    - Boundaries: «Quitar prórroga» without marks → no dialog.
    - Outside the rules: not applicable.
    - Odd data: match with 13 players → banner.
    - Sequences: mark, add overtime, undo, undo.
    - Interruptions: mark a cell, push the call-up route and go back → «Deshacer» removes that mark; the same through the new-player route; mark a cell, go back to the team screen and open the match again → «Deshacer» is disabled (RF-057).
    - Mistakes: cancel removing an overtime with marks → stays with its marks; tapping outside that dialog, or pressing Android Back (`onRequestClose`) while it is open, does nothing and leaves the overtime with its marks (RF-059).
  - Pending: nothing.

- [ ] **T056** · Maestro US3 journeys and match interruption (RF-042, RF-057, RF-058, RF-059, RF-082, E-019)
  - Layer and files: e2e · `e2e/us3-planning.yaml`, `e2e/us3-interruption.yaml` (`stopApp`, `launchApp`).
  - Done when: both flows pass on both platforms; output in `review.md`.
  - Scenarios: US3 acceptance criteria 1–5 and 7: mark, remove and undo; add and remove overtimes; mark a cell, open the call-up screen, go back to the grid and press «Deshacer» → the mark is gone; mark a cell, go back to the team, open the match again → «Deshacer» has nothing to undo; E-019 close and reopen. Criterion 6 (save failure) is covered by T051 and T055, and criterion 8 by T053 and T057.
  - Pending: nothing.

- [ ] **T057** · Device check of the grid layout on phone and tablet (RF-076, RF-077, RF-078, RF-079, RF-080, RF-081)
  - Layer and files: `review.md` (device check with screenshots).
  - Done when: Fernando checks the grid on an iPhone, the 5th-gen iPad and an Android phone, in portrait and landscape, against RF-076–RF-081, including 12 players with every banner and the legend on the iPad in landscape, and 13 players on the iPad (every period across, vertical scroll in landscape).
  - Scenarios: 4, 6 and 8 periods, 0 and 2 overtimes, 9, 12 and 13 players, each device and orientation.
  - Pending: nothing.

**US3 checkpoint:** Fernando plans a match: marks and removes X, undoes several times, also after opening the call-up and coming back, adds and removes overtimes, closes the app and finds everything as it was, on phone and tablet in both orientations.

## US4 · See the rule warnings

- [ ] **T058** · State: warnings and legend in the match view (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-072, RF-087, E-001, E-027)
  - Layer and files: state · `src/state/match-view.ts` (`isLightRed`, `isInRed`, `headerMark`, `ruleImpossible`, `legend`), tests.
  - Done when: the view takes every colour and mark from `Warnings` and the legend from `legendItems`; a grid with no warning has nothing set.
  - Scenarios:
    - Happy path: E-001 → Juan's P4 and P5 cells `isLightRed`.
    - Boundaries: E-027 → legend light red, «!», «≠», not player in red.
    - Outside the rules: E-003 → Juan `isInRed`, `ruleImpossible`.
    - Odd data: free periods and overtimes never coloured (RF-006).
    - Sequences: after each tap the view matches the new warnings (RF-060).
    - Interruptions: reopening rebuilds the same view.
    - Mistakes: a header both incomplete and inconsistent gives only «≠».
  - Pending: nothing.

- [ ] **T059** · UI: warnings on the grid, colours and legend (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-072, RF-087, E-001, E-002, E-003, E-004, E-007, E-027)
  - Layer and files: UI · `src/ui/theme/warning-colors.ts`, `src/ui/grid/*` (colours and header marks), `src/ui/warnings/rule-impossible-banner.tsx`, `src/ui/warnings/warning-legend.tsx`, `src/i18n/es.json` (`warning.*`, `grid.header.incompleteMark`, `grid.header.inconsistentMark`), tests.
  - Done when: light red cells, players in red, «!» and «≠» in headers, the general warning above the grid and the legend under it render only from `MatchView`; nothing is coloured by default.
  - Scenarios:
    - Happy path: E-001 → P4 and P5 light red, «!» on P1–P5.
    - Boundaries: E-003 → red player, P5 light red and the general warning.
    - Outside the rules: E-004 → red and general warning.
    - Odd data: E-007 (no subs, P5 and P6 empty) → only «!» on P5, no legend item other than «!».
    - Sequences: the last light red cell disappears → its legend line disappears.
    - Interruptions: warnings shown again after reopening.
    - Mistakes: E-002 → «≠» on P3, not «!»; E-027 legend without the player in red.
  - Pending: nothing.

- [ ] **T060** · Maestro US4 journey and performance on the 5th-gen iPad (RF-060, RF-062, RF-063, RF-064, RF-065, RF-067, RF-087, E-001, E-003, E-005, E-006, E-007, E-008, E-009, E-027)
  - Layer and files: e2e · `e2e/us4-warnings.yaml`; measurement in `review.md`.
  - Done when: the flow reproduces the US4 acceptance criteria and E-001, E-003, E-005–E-009 and E-027 on both platforms; on the iPad, a release build repaints under 100 ms after a tap with 12 players and 8 periods.
  - Scenarios: the five US4 acceptance criteria.
  - Pending: nothing.

**US4 checkpoint:** Fernando sees light red cells, players in red, the period marks, the general warning and the legend appear and disappear as he taps, with no lag on the iPad.

- [ ] **T061** · D2 close: verification, Codex and Security review, D2 section of `summary.md`, PR
  - Layer and files: `review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with the mutation run time recorded, Maestro output recorded, no blocking finding, the PR "001 D2: teams, matches, grid, warnings" is merged by Fernando after using the app in a match.
  - Pending: the Planner reviews D3 with the lessons of D2 before it starts.

# D3 · Rest of v1 (US5–US7)

## US5 · Record subs during the match

- [ ] **T062** · State: questions and answers in the session (RF-045, RF-046, RF-047, RF-050, RF-051, RF-054, RF-057, E-011, E-013)
  - Layer and files: state · `src/state/match-session-store.ts` (`pending`, `answerSub`, `answerStarter`, `chooseReplaced`, `confirmRemove`, `cancelQuestion`), `src/state/match-view.ts` (`replaceableStarters`), tests.
  - Done when: each domain question is stored as `pending`; each answer saves and publishes; `cancelQuestion` (the one action behind «Cancelar», tapping outside and Android Back) leaves the grid as it was at any step; a replacement is one undo entry.
  - Scenarios:
    - Happy path: E-011 → question → sub → circled X saved.
    - Boundaries: starter → choose Eva → both cells saved together.
    - Outside the rules: not applicable.
    - Odd data: a tap on another cell while a question is pending is ignored.
    - Sequences: replacement then undo → both cells restored in one press.
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

- [ ] **T066** · Maestro US5 journey, E-026 through the call-up screen, and device check on phone and tablet (RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, RF-052, RF-053, RF-054, RF-055, RF-057, RF-066, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081, RF-086, E-011, E-012, E-013, E-026)
  - Layer and files: e2e · `e2e/us5-subs.yaml`, `e2e/us5-undo-after-call-up.yaml`; device check in `review.md`.
  - Done when: the flows cover the US5 acceptance criteria 1–6 on both platforms, and E-026 as written: starter replacement of Eva by Ana in P2, Eva removed in the call-up screen, back to the grid, «Deshacer» → Ana's P2 empty, P2 with 4 X, Eva not back; Fernando checks the dialogs and menu on phone and tablet in both orientations.
  - Scenarios: the six US5 acceptance criteria, E-011–E-013 and E-026.
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

- [ ] **T075** · State: edit, deactivate and reactivate players, delete a team (RF-015, RF-018, RF-019, RF-021, RF-022, RF-023, RF-024, RF-085, E-018)
  - Layer and files: state · `src/state/squad-store.ts` (`updatePlayer`, `setPlayerActive`, `teamContents`, `deleteTeam`), tests.
  - Done when: editing validates like RF-016 and republishes the team; deactivating and reactivating save and republish; deactivated players leave the duplicate warning and `playersToAdd`; `teamContents` gives the counts; `deleteTeam` removes the team from every store; a failed save changes nothing.
  - Scenarios:
    - Happy path: rename and renumber Juan.
    - Boundaries: reactivate → selected in the next new-match draft.
    - Outside the rules: not applicable.
    - Odd data: deactivated player still shown with marks in a saved match.
    - Sequences: change Juan 7 → 9, add him to an older match → shows 9 there (RF-019).
    - Interruptions: a new store sees the deactivation.
    - Mistakes: "07" → `numberInvalid`, nothing saved.
  - Pending: nothing.

- [ ] **T076** · UI: edit, deactivate and reactivate a player (RF-018, RF-021, RF-022, RF-023, RF-024, E-018)
  - Layer and files: app and UI · `src/app/teams/[teamId]/players/[playerId].tsx`, `src/ui/player-form.tsx`, `src/i18n/es.json` (`player.*`, `confirm.deactivatePlayer.*`), tests.
  - Done when: editing updates the team; deactivating asks with a confirmation that closes only with its buttons and shows «Desactivado»; reactivating asks nothing; no delete action exists; an unknown `playerId` shows `notFound.message`.
  - Scenarios:
    - Happy path: rename Juan.
    - Boundaries: name of 40 characters.
    - Outside the rules: not applicable.
    - Odd data: a deactivated player is listed with «Desactivado»; unknown `playerId` → not-found message.
    - Sequences: deactivate, reactivate.
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
