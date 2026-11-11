# Tasks · 001 Period planner v1

Legend: `[ ]` pending · `[x]` done. Each task is one commit, `T0NN RF-0NN: description`.

<!-- The RF and E IDs go on the same line as the checkbox: scripts/check-traceability.mjs reads them. -->

Three deliveries (ADR-004, `plan.md` "Deliveries"): **D1** T001–T017 on `001-planificador-v1-d1`, **D2** T018–T043 on `001-planificador-v1-d2`, **D3** T044–T059 on `001-planificador-v1-d3`. Before D2 and D3 start, the Planner reviews their tasks and Fernando approves again. Every task is at most three hours of work.

# D1 · Rules engine (`src/domain/`)

## Setup

- [ ] **T001** · Three-digit global IDs in the traceability check, with duplicate IDs across specs detected
  - Layer and files: tooling and docs · `scripts/check-traceability.mjs`, `tests/scripts/check-traceability.test.ts`, `docs/architecture.md` (Tests "Name", Traceability table), `.agents/templates/spec.md`, `.agents/templates/tasks.md`, `.agents/roles/specifier.md`, `.agents/roles/test-designer.md`.
  - Done when: the script reads `RF-\d{3}` and `E-\d{3}`, fails with a clear message when one ID is defined in two `spec.md` files, still ignores "retired" lines for coverage but counts them for duplicates; every `E-01` example in docs, templates and roles reads `E-001`; the test runs the script against fixtures created at run time and `verify.sh` is green.
  - Scenarios:
    - Happy path: one spec with a ticked task whose IDs all have tests passes.
    - Boundaries: `E-001` and `E-019` are recognised; `E-01` and `E-0001` are not; `RF-082` at the end of a line.
    - Outside the rules: the same `RF-001` defined in two specs fails and names both folders.
    - Odd data: a spec folder without `spec.md` (like 000) is skipped; a retired ID reused in another spec fails.
    - Sequences: a closed spec requires all its IDs; an "In progress" one only those of ticked tasks.
    - Interruptions: not applicable.
    - Mistakes: an ID only in a comment or a `describe` does not count; fixture file contents never count, because the fixtures live in a temporary folder and the test names carry no IDs.
  - Pending: nothing.

## Formats (US4 base)

- [ ] **T002** · Glossary terms, formats as data, columns and rule window (RF-001, RF-002, RF-003, RF-004, RF-005, RF-006)
  - Layer and files: domain and docs · `docs/architecture.md` (glossary, table in `plan.md`), `src/domain/format.ts`, `src/domain/column.ts`, tests next to them.
  - Done when: `FORMATS` holds the table of RF-002–RF-005 as data, `FORMAT_IDS` is exactly `[4, 6, 8]`, `gridColumns` gives periods then overtimes, `isRuleWindowColumn` is true only for P1–P3, P1–P5 and P1–P6 respectively; tests green.
  - Scenarios:
    - Happy path: 6 periods → window P1–P5, minimums 2 and 2, call-up 9–12.
    - Boundaries: last window period (P3, P5, P6) is in the window; the next one is not.
    - Outside the rules: `isFormatId(5)` and `isFormatId(0)` are false.
    - Odd data: 0 overtimes; 3 overtimes give `OT1`–`OT3` after the last period.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: an overtime is never a window column, in any format (RF-006).
  - Pending: nothing.

## US3 · Plan the periods (domain)

- [ ] **T003** · Grid model, cell states and player order (RF-016, RF-042, RF-043)
  - Layer and files: domain · `src/domain/player-order.ts`, `src/domain/grid.ts`, tests.
  - Done when: `comparePlayers` sorts by numeric value, then "0" before "00", then by name in Spanish order; `cellState` always returns exactly one of three states; `starterCount` and `hasSub` count per column.
  - Scenarios:
    - Happy path: 9, 4, 7 → 4, 7, 9; Luis 7 and Ana 7 → Ana, Luis.
    - Boundaries: "0", "00", "9", "10", "99".
    - Outside the rules: two players with the same name and number keep a stable order.
    - Odd data: names with accents and capitals («Álvaro», «alba»); a grid with no players.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: "07" is not a valid number, but sorting never throws.
  - Pending: answer to pending question 1 ("0" and "00").

- [ ] **T004** · Tap on a cell (RF-044, RF-045, RF-048, RF-049, RF-050, RF-051, RF-055, E-011, E-012, E-013)
  - Layer and files: domain · `src/domain/marking.ts` (`tapCell`), test.
  - Done when: every row of the RF-044–RF-051 table returns the expected `MarkingResult`, and no tap returns a grid with 6 X in a column.
  - Scenarios:
    - Happy path: empty cell in a column with 3 X → X.
    - Boundaries: 4 X → X (5 X); 5 X in P5 of 6 periods → question; 5 X in P6 → circled X (E-012); 5 X in overtime → circled X.
    - Outside the rules: a tap that breaks a rest minimum is still marked.
    - Odd data: tap on a player not in the call-up or a column that does not exist → `unchanged`.
    - Sequences: X, then tap again → empty; circled X, tap → empty.
    - Interruptions: not applicable.
    - Mistakes: tap Eva's X in P3 with a sub (E-013) → `confirmRemoveStarter`, grid untouched.
  - Pending: nothing.

- [ ] **T005** · Player counter (RF-007, RF-008, RF-009, RF-070, RF-071, RF-072, E-014)
  - Layer and files: domain · `src/domain/counter.ts`, test.
  - Done when: `playerCounter` counts X as played and empty as rested over every column, overtimes included, and circled X as neither.
  - Scenarios:
    - Happy path: E-014 → played 3, rested 3.
    - Boundaries: all empty → rested = number of columns; all X → played = number of columns.
    - Outside the rules: a player with X in every period still gets a counter.
    - Odd data: player not in the call-up → 0 and 0.
    - Sequences: adding an overtime adds one rested.
    - Interruptions: not applicable.
    - Mistakes: one circled X in 6 periods → played + rested = 5 (RF-071).
  - Pending: nothing.

- [ ] **T006** · Overtimes: add, remove the last one, detect its marks (RF-058, RF-059)
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

- [ ] **T007** · Answers: sub, starter replacement, remove anyway (RF-046, RF-047, RF-054, RF-055, E-013)
  - Layer and files: domain · `src/domain/marking.ts` (`markSub`, `replaceableStarters`, `replaceStarter`, `removeMark`), test.
  - Done when: "sub" marks a circled X and keeps 5 X; "starter" puts an X in the tapped cell and empties the chosen X in one step; "remove anyway" empties the X and leaves every circled X as it is.
  - Scenarios:
    - Happy path: choose Eva → tapped cell X, Eva empty, 5 X.
    - Boundaries: `replaceableStarters` lists exactly the 5 players with X in that column.
    - Outside the rules: replacing creates a rest breach; it is done anyway.
    - Odd data: replaced player without an X in that column → unchanged grid.
    - Sequences: E-013, remove anyway → 4 X, the sub still circled (RF-054).
    - Interruptions: not applicable.
    - Mistakes: the replaced cell becomes empty, never a circled X.
  - Pending: nothing.

- [ ] **T008** · Long-press menu (RF-052, RF-053, RF-054)
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

- [ ] **T009** · Rule window: possible rests, light red cells, player in red (RF-002, RF-003, RF-004, RF-007, RF-008, RF-009, RF-062, RF-063, RF-064, RF-072, E-001, E-002, E-003, E-004, E-005, E-008, E-009, E-010)
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

- [ ] **T010** · Rule impossible to meet, by bounded flow (RF-003, RF-004, RF-067, E-003, E-004, E-006, E-007)
  - Layer and files: domain · `src/domain/bounded-flow.ts`, `src/domain/rule-feasibility.ts`, tests.
  - Done when: `isRuleImpossible` is true for E-003, E-004 and E-006 and false for E-007; `bounded-flow.ts` passes its own tests on small networks with lower bounds; the algorithm follows `plan.md`.
  - Scenarios:
    - Happy path: E-007 → possible.
    - Boundaries: exactly as many free slots as players who need them → possible; one fewer → impossible (E-006).
    - Outside the rules: 13 players in the call-up (RF-010) still evaluated.
    - Odd data: empty call-up or fewer than 5 players → impossible; every window cell already circled.
    - Sequences: complete window with one player short → impossible (E-004).
    - Interruptions: not applicable.
    - Mistakes: circled X cells are never used as free cells.
  - Pending: nothing.

- [ ] **T011** · Incomplete and inconsistent periods (RF-065, RF-066, E-007, E-013)
  - Layer and files: domain · `src/domain/period-warnings.ts`, test.
  - Done when: `periodWarning` returns "inconsistent" for any column with a circled X and fewer than 5 X, otherwise "incomplete" for window columns with fewer than 5 X, otherwise `null`.
  - Scenarios:
    - Happy path: P5 empty in E-007 → incomplete.
    - Boundaries: 4 X → incomplete; 5 X → none.
    - Outside the rules: P6 with 4 X and a sub → inconsistent.
    - Odd data: empty free period or overtime → none.
    - Sequences: E-013 remove anyway → P3 inconsistent, not incomplete.
    - Interruptions: not applicable.
    - Mistakes: 5 X and a sub → none.
  - Pending: nothing.

- [ ] **T012** · All warnings in one result, call-up range and performance budget (RF-005, RF-010, RF-060, RF-061, RF-068, RF-072, E-015)
  - Layer and files: domain · `src/domain/call-up-range.ts`, `src/domain/warnings.ts`, tests (including the budget test).
  - Done when: `evaluateWarnings` combines T009–T011 and the call-up range; an empty grid with a valid call-up has no colour other than the incomplete marks; 1,000 calls on the worst planned grid take under 2 s.
  - Scenarios:
    - Happy path: E-015 → warning with minimum 9 and count 8.
    - Boundaries: 6 periods with 9 and 12 → none; 8 and 13 → warning; 4 periods with 8 → none.
    - Outside the rules: 13 players still give every other warning (RF-010).
    - Odd data: 0 players → call-up warning and rule impossible.
    - Sequences: two evaluations of the same grid are equal.
    - Interruptions: not applicable.
    - Mistakes: marks in free periods never add light red cells or players in red (RF-072).
  - Pending: nothing.

## US2, US6 and US7 · Call-up, format and squad rules (domain)

- [ ] **T013** · Call-up rules: initial call-up, players to add, name and number snapshot, removal with marks (RF-019, RF-023, RF-030, RF-032, RF-033, RF-034, RF-042, E-017, E-018)
  - Layer and files: domain · `src/domain/call-up.ts`, test.
  - Done when: `initialCallUp` takes only active players, sorted; `playersToAdd` offers only active players not in the call-up; `callUpEntryFor` copies name and number; `removeFromCallUp` removes the row and its marks; `playerHasMarks` decides the confirmation.
  - Scenarios:
    - Happy path: 12 active and 1 deactivated → 12 entries.
    - Boundaries: a player with only a circled X has marks.
    - Outside the rules: adding a 13th player is allowed.
    - Odd data: no active players → empty call-up.
    - Sequences: snapshot Juan 7, then Juan becomes 9 in the squad → the entry still says 7 (E-018).
    - Interruptions: not applicable.
    - Mistakes: removing Ana with marks (E-017) → `playerHasMarks` true; after removal no cell of Ana remains.
  - Pending: nothing.

- [ ] **T014** · Format change (RF-038, RF-040, RF-041, RF-055, E-016)
  - Layer and files: domain · `src/domain/format-change.ts`, test.
  - Done when: `changeFormat` keeps marks of the periods that still exist, drops the rest, keeps overtimes with their marks after the new last period, in any direction.
  - Scenarios:
    - Happy path: 8 → 4 with marks in P5–P8 → only P1–P4 marks remain (E-016).
    - Boundaries: 4 → 8 keeps everything and adds empty P5–P8.
    - Outside the rules: not applicable.
    - Odd data: same format → same grid; 6 periods with 1 overtime → 4 periods shows P1–P4 then OT1 with its marks.
    - Sequences: 8 → 4 → 8 → P5–P8 empty.
    - Interruptions: not applicable.
    - Mistakes: overtime marks never lost on a format change.
  - Pending: nothing.

- [ ] **T015** · Duplicate-number warning (RF-017, RF-069)
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

## Properties and delivery close

- [ ] **T016** · Domain properties with fast-check and the spec examples table (RF-054, RF-055, RF-060, RF-067, RF-070, RF-071, E-001, E-002, E-003, E-004, E-005, E-006, E-007, E-008, E-009, E-010, E-011, E-012, E-013, E-014, E-015, E-016, E-017, E-018)
  - Layer and files: domain tests · `src/domain/domain.properties.test.ts`; `src/domain/spec-examples.test.ts` with E-001–E-018 as one `it.each` table that goes through the public domain functions, so the examples of the spec can be read in one place (the per-file tests of T004–T015 stay).
  - Done when: the five properties of `plan.md` hold for at least 1,000 random cases each, with the brute-force oracle for RF-067 on grids up to 5 players × 3 window periods; every row of the examples table passes.
  - Scenarios:
    - Happy path: random sequences never reach 6 X.
    - Boundaries: grids at exactly 5 X per column.
    - Outside the rules: grids that break every rule still evaluate without throwing.
    - Odd data: 0, 1 and 15 players; 0 to 3 overtimes.
    - Sequences: random taps, menu choices, answers, overtimes, format changes and call-up removals.
    - Interruptions: not applicable.
    - Mistakes: a tap never changes any cell other than the tapped one, or the two of a replacement.
  - Pending: nothing.

- [ ] **T017** · D1 close: verification with mutation testing, Codex and Security review, D1 section of `summary.md`, PR
  - Layer and files: `specs/001-planificador-v1/review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with Stryker ≥ 80 % and domain coverage ≥ 90 %, no blocking finding, the D1 summary explains the engine with real code, and the PR "001 D1: rules engine" is merged by Fernando.
  - Pending: the Planner reviews D2 with the lessons of D1 before it starts.

**D1 checkpoint:** every rule of the regulations exists as a pure, tested function; every domain example of the spec passes; the app looks the same as before.

# D2 · Usable in a match (US1–US4)

## Setup

- [ ] **T018** · Data stack: install and configure expo-sqlite, Drizzle and the test driver (RF-011)
  - Layer and files: configuration · `package.json`, `package-lock.json`, `babel.config.js`, `metro.config.js` (both with `npx expo customize`), `drizzle.config.ts`, `eslint.config.js` and `.prettierignore` (ignore `src/data/migrations/`), `plan.md` "New dependencies" (exact versions).
  - Done when: the packages of the D2 dependency table are installed, Security has reviewed them (including pending question 6, iOS backups), the dev build starts on iOS and Android, and `verify.sh` is green with `drizzle-kit check`.
  - Scenarios:
    - Happy path: dev build opens the app with the new configuration.
    - Boundaries: not applicable.
    - Outside the rules: no new permission in the generated manifests.
    - Odd data: not applicable.
    - Sequences: `npx expo-doctor` and `npm audit` green after installing.
    - Interruptions: not applicable.
    - Mistakes: `better-sqlite3` is a development dependency and is not bundled.
  - Pending: pending questions 6 and 9.

- [ ] **T019** · Schema, first migration, opening the database and migrating at start-up (RF-011, RF-082)
  - Layer and files: data and app · `src/data/schema.ts`, `src/data/migrations/` (generated), `src/data/database.ts`, `src/data/test-database.ts` (test helper on `better-sqlite3`), `src/state/database-ready.ts`, `src/app/_layout.tsx`.
  - Done when: the five tables of `plan.md` exist with their checks and cascades; foreign keys and WAL are on; the splash screen stays until migrations end; tests prove each cascade and each check.
  - Scenarios:
    - Happy path: a fresh database migrates and has the five tables.
    - Boundaries: format 4 and 8 accepted, 5 rejected by the check.
    - Outside the rules: only one score set → rejected by the check.
    - Odd data: two players with the same number in one team are accepted.
    - Sequences: migrating twice does nothing the second time.
    - Interruptions: a transaction that fails halfway leaves nothing written.
    - Mistakes: deleting a team removes its players, matches, call-up entries and marks.
  - Pending: nothing.

## US1 · Create teams and players

- [ ] **T020** · Domain: team and player validation, team order (RF-013, RF-016, RF-073)
  - Layer and files: domain · `src/domain/squad-validation.ts`, `src/domain/team-order.ts`, tests.
  - Done when: a blank or spaces-only name gives `nameRequired`; numbers other than one or two digits give `numberInvalid`; category is optional; teams sort alphabetically in Spanish.
  - Scenarios:
    - Happy path: «Cadete B» and «Alevín A» → «Alevín A» first.
    - Boundaries: "0", "00", "99" valid; "100", "" and "7a" invalid.
    - Outside the rules: not applicable.
    - Odd data: names with spaces around are trimmed; accents and capitals sorted naturally.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: "07" is invalid; a name of only spaces is blank.
  - Pending: pending question 2 (length limits, applied by the interface).

- [ ] **T021** · Data: team and player repositories (RF-013, RF-014, RF-016, RF-017)
  - Layer and files: data · `src/data/team-repository.ts`, `src/data/player-repository.ts`, tests on `better-sqlite3`.
  - Done when: teams are created, edited, listed and read; players are created and listed for one team only; duplicates are saved.
  - Scenarios:
    - Happy path: create two teams → both listed.
    - Boundaries: "0" and "00" stored and read back distinct.
    - Outside the rules: a second player 7 is saved.
    - Odd data: a category of null and an empty list of players.
    - Sequences: create, edit name and category, read back.
    - Interruptions: not applicable.
    - Mistakes: a name with quotes or `'; DROP TABLE` is stored as text (parameterised queries).
  - Pending: nothing.

- [ ] **T022** · State: squad store for teams and players (RF-013, RF-014, RF-016, RF-017, RF-069, RF-073)
  - Layer and files: state · install `zustand`; `src/state/squad-store.ts`, `src/state/route-params.ts`, tests.
  - Done when: actions validate with the domain, save through the repositories and publish teams sorted, players sorted and duplicate numbers; invalid input returns its errors and saves nothing.
  - Scenarios:
    - Happy path: create team → appears in the sorted list.
    - Boundaries: adding the second 7 publishes the duplicate warning.
    - Outside the rules: not applicable.
    - Odd data: route parameter "abc", "0" or "-1" → `null`.
    - Sequences: create team, add three players, list in number order.
    - Interruptions: a new store reads the same data from the database.
    - Mistakes: blank team name → error, nothing saved.
  - Pending: nothing.

- [ ] **T023** · UI: navigation, teams list, team form and format picker (RF-001, RF-012, RF-013, RF-014, RF-073)
  - Layer and files: app and UI · `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/teams/new.tsx`, `src/app/teams/[teamId]/edit.tsx`, `src/ui/team-form.tsx`, `src/ui/format-picker.tsx`, `src/i18n/es.json`, tests in `tests/app/` and next to the components.
  - Done when: the app opens on the teams list; a team can be created and edited with name, category and default format; the empty list shows its text; every text comes from `es.json`.
  - Scenarios:
    - Happy path: create «Alevín A», 6 periods → listed.
    - Boundaries: the format picker shows exactly three options.
    - Outside the rules: not applicable.
    - Odd data: name at the length limit; empty category.
    - Sequences: create, edit, list updated.
    - Interruptions: not applicable.
    - Mistakes: save with a blank name → «Escribe un nombre.», nothing saved.
  - Pending: nothing.

- [ ] **T024** · UI: team screen with sorted players, new player form and duplicate-number warning (RF-016, RF-017, RF-069)
  - Layer and files: app and UI · `src/app/teams/[teamId]/index.tsx`, `src/app/teams/[teamId]/players/new.tsx`, `src/ui/player-form.tsx`, `src/ui/warnings/duplicate-number-banner.tsx`, `src/i18n/es.json`, tests.
  - Done when: the team shows its players sorted; a player is added with name and number; the duplicate-number banner lists the numbers.
  - Scenarios:
    - Happy path: add 9, 4, 7 → 4, 7, 9.
    - Boundaries: number field accepts at most two digits.
    - Outside the rules: second 7 saved and the banner appears.
    - Odd data: unknown `teamId` → not-found state.
    - Sequences: add players one after another without leaving the screen.
    - Interruptions: not applicable.
    - Mistakes: missing number → «El dorsal debe tener uno o dos dígitos (0–99 o 00).»
  - Pending: nothing.

- [ ] **T025** · Maestro set-up and US1 journey (RF-011, RF-013, RF-014, RF-016, RF-017, RF-069, RF-073)
  - Layer and files: e2e · install the Maestro CLI on the Mac (not npm); `e2e/us1-teams-and-players.yaml`; how to run it in `summary.md`.
  - Done when: the flow creates two teams and players including a duplicate number, checks order and warning, and passes on the iOS simulator and the Android emulator; output in `review.md`.
  - Scenarios: the US1 acceptance criteria 1–3, with no network.
  - Pending: nothing.

**US1 checkpoint:** Fernando creates teams with name, category and default format, adds players, sees them sorted by number and sees the duplicate-number warning, on iPhone and Android.

## US2 · Create a match and its call-up

- [ ] **T026** · Domain: match input validation and defaults (RF-025, RF-026, RF-027, RF-036)
  - Layer and files: domain · `src/domain/match-input.ts`, test.
  - Done when: `newMatchDefaults(team, today)` gives the team's default format and today's date; one score without the other gives `scoreIncomplete`; the quick home/away option writes only the team name.
  - Scenarios:
    - Happy path: team with 6 periods, today 2026-11-11 → 6 periods, 2026-11-11.
    - Boundaries: score 0–0 valid; both empty valid.
    - Outside the rules: not applicable.
    - Odd data: no time, no names, no notes → valid.
    - Sequences: quick home then edit the text → edited text kept.
    - Interruptions: not applicable.
    - Mistakes: only the home score → `scoreIncomplete`; team category never copied to home or away.
  - Pending: pending questions 2 and 3.

- [ ] **T027** · Data: match repository, create with call-up snapshot and read (RF-025, RF-026, RF-030, RF-036, RF-037)
  - Layer and files: data · `src/data/match-repository.ts` (`createMatch`, `getMatch`), tests.
  - Done when: a match and its call-up entries (with name and number) are created in one transaction and read back unchanged; changing the team default does not change existing matches.
  - Scenarios:
    - Happy path: create with 12 players → 12 entries.
    - Boundaries: match with only format and date.
    - Outside the rules: 13 entries saved.
    - Odd data: free text with emojis and quotes.
    - Sequences: change default 6 → 8, existing match still 6, new one 8.
    - Interruptions: failure halfway → no match and no entries.
    - Mistakes: deselected players are not in the call-up.
  - Pending: nothing.

- [ ] **T028** · Data: call-up repository, add, remove with marks, create a player from the match (RF-019, RF-032, RF-033, RF-034, RF-035, E-017)
  - Layer and files: data · `src/data/call-up-repository.ts`, tests.
  - Done when: adding stores the snapshot; removing deletes the entry and its marks; `createPlayerInMatch` creates the player in the team and in the call-up in one transaction.
  - Scenarios:
    - Happy path: add a player → entry with current name and number.
    - Boundaries: remove the last player of the call-up.
    - Outside the rules: not applicable.
    - Odd data: adding the same player twice is rejected by the unique index and reported, not thrown to the user.
    - Sequences: remove Ana with marks (E-017), add her again → empty row.
    - Interruptions: failure creating the entry → no player created either.
    - Mistakes: removing from one match leaves her in other matches.
  - Pending: nothing.

- [ ] **T029** · State: new-match draft and call-up actions (RF-030, RF-031, RF-032, RF-033, RF-034, RF-035, RF-068, E-015)
  - Layer and files: state · `src/state/new-match-draft.ts`, call-up actions in `src/state/match-session-store.ts`, tests.
  - Done when: the draft starts with every active player selected; deselecting updates the range warning; creating saves; removing a player with marks needs a confirmation step, without marks it does not.
  - Scenarios:
    - Happy path: 12 active → 12 selected, no warning in 6 periods.
    - Boundaries: deselect to 9 → none; to 8 → warning (E-015).
    - Outside the rules: create with 8 players → created, warning stays.
    - Odd data: team without players → empty call-up and warning.
    - Sequences: deselect in one match, next new match has everyone selected again.
    - Interruptions: draft discarded when leaving without creating.
    - Mistakes: cancelling the removal leaves the player and marks.
  - Pending: pending question 4.

- [ ] **T030** · UI: new match screen with call-up selection and range warning (RF-005, RF-010, RF-025, RF-026, RF-027, RF-030, RF-031, RF-036, RF-068, E-015)
  - Layer and files: app and UI · `src/app/teams/[teamId]/matches/new.tsx`, `src/ui/match-form.tsx`, `src/ui/date-time-field.tsx`, `src/ui/call-up-selector.tsx`, `src/ui/warnings/call-up-range-banner.tsx`, `src/i18n/es.json`, tests.
  - Done when: the form shows every field of RF-025 with its defaults, the quick home/away buttons, the call-up selector with the count and range warning, and creating opens the match screen.
  - Scenarios:
    - Happy path: create with defaults and 12 players.
    - Boundaries: 8 players in 6 periods → warning visible, button still enabled.
    - Outside the rules: 13 players → warning, created.
    - Odd data: very long notes; no time.
    - Sequences: change date, toggle players, create.
    - Interruptions: not applicable.
    - Mistakes: one score only → «Escribe los dos resultados o ninguno.»
  - Pending: pending questions 3 and 4.

- [ ] **T031** · UI: call-up screen of a match with confirmation dialog and player creation (RF-032, RF-033, RF-034, RF-035, E-017)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx` (first version: call-up list and range warning), `src/app/matches/[matchId]/call-up.tsx`, `src/app/matches/[matchId]/new-player.tsx`, `src/ui/choice-dialog.tsx`, `src/i18n/es.json`, tests.
  - Done when: only active players not in the call-up are offered; removing a player with marks asks `confirm.removeFromCallUp.*`; a new player created here appears in the team and the call-up.
  - Scenarios:
    - Happy path: add two players.
    - Boundaries: a player without marks is removed without a dialog.
    - Outside the rules: not applicable.
    - Odd data: no players left to add → empty list.
    - Sequences: create player from the match, then remove him.
    - Interruptions: not applicable.
    - Mistakes: cancel the confirmation → player and marks stay.
  - Pending: nothing.

- [ ] **T032** · Maestro US2 journey (RF-030, RF-031, RF-035, RF-036, RF-037, RF-068, E-015, E-017)
  - Layer and files: e2e · `e2e/us2-match-and-call-up.yaml`.
  - Done when: the flow covers the US2 acceptance criteria 1–4 and passes on both platforms; output in `review.md`.
  - Scenarios: default format and date, everyone selected, 8 players warning, player created from the match.
  - Pending: nothing.

**US2 checkpoint:** Fernando creates a match with today's date and the team's format, picks the call-up, sees the range warning when it applies and edits the call-up afterwards.

## US3 · Plan the periods

- [ ] **T033** · Domain: cell changes between two grids and safe revert (RF-055, RF-056, RF-057)
  - Layer and files: domain · `src/domain/grid-diff.ts` (`cellChanges(before, after)`, `revertCellChanges(grid, changes)`), tests and a fast-check property.
  - Done when: `cellChanges` lists exactly the cells whose state differs; `revertCellChanges` restores them, skips cells whose column or player no longer exists and never produces 6 X.
  - Scenarios:
    - Happy path: one tap → one change; one replacement → two changes.
    - Boundaries: reverting into a column that now has 5 X never makes 6.
    - Outside the rules: not applicable.
    - Odd data: same grid → no changes.
    - Sequences: random marks and structural changes, then revert in reverse order → property holds.
    - Interruptions: not applicable.
    - Mistakes: revert after the overtime was removed → the overtime cell is skipped.
  - Pending: pending question 7.

- [ ] **T034** · Data: grid repository, load, save cell changes, overtimes (RF-056, RF-058, RF-059, RF-082)
  - Layer and files: data · `src/data/grid-repository.ts`, tests.
  - Done when: `loadGrid` returns a domain `MatchGrid` with the call-up sorted; `saveCellChanges` upserts or deletes marks in one transaction; adding and removing the last overtime update `overtime_count` and delete its marks.
  - Scenarios:
    - Happy path: save three marks, load → same grid.
    - Boundaries: removing an overtime with marks deletes only its marks.
    - Outside the rules: not applicable.
    - Odd data: match with no marks and no overtimes.
    - Sequences: X → circled X → empty on the same cell.
    - Interruptions: failure in the second change of a replacement → neither saved.
    - Mistakes: a mark of a player not in the call-up is rejected.
  - Pending: nothing.

- [ ] **T035** · State: match session, open, tap, save at once, overtimes (RF-044, RF-049, RF-056, RF-058, RF-059, RF-060, RF-082)
  - Layer and files: state · `src/state/match-session-store.ts`, tests with the in-memory database.
  - Done when: `openMatch` loads grid and warnings; `tapCell` saves before publishing and publishes new warnings; questions leave the grid unchanged in D2; overtimes are added and removed (the confirmation decision comes from `lastOvertimeHasMarks`).
  - Scenarios:
    - Happy path: tap empty with 4 X → X saved and published.
    - Boundaries: tap with 5 X in the window → no change (question, D3).
    - Outside the rules: a tap breaking a rule is saved and warned.
    - Odd data: `openMatch` with an unknown ID → not-found state.
    - Sequences: many taps in a row → database equals store after each.
    - Interruptions: save throws → store unchanged (pending question 5).
    - Mistakes: removing an overtime with marks without confirming → nothing removed.
  - Pending: pending question 5.

- [ ] **T036** · State: undo of mark changes (RF-057, RF-082, E-019)
  - Layer and files: state · `src/state/match-session-store.ts` (`undo`, undo stack), tests.
  - Done when: each mark change pushes one entry; undo reverts and saves it; overtimes, call-up and format changes never push; `closeMatch` and a new store start with an empty stack.
  - Scenarios:
    - Happy path: three marks, three undos → grid as before.
    - Boundaries: undo with an empty stack does nothing.
    - Outside the rules: not applicable.
    - Odd data: undo after removing a player who had the undone mark.
    - Sequences: mark, add overtime, undo → overtime still there, mark gone.
    - Interruptions: E-019: marks in P1–P3, new store on the same database → same marks, nothing to undo.
    - Mistakes: undo pressed more times than actions.
  - Pending: pending question 7.

- [ ] **T037** · UI: grid layout as pure size functions (RF-076, RF-078, RF-079, RF-080, RF-081)
  - Layer and files: UI · `src/ui/grid/grid-layout.ts`, test.
  - Done when: for each width and height (375 × 667, 667 × 375, 768 × 1024, 1024 × 768) the cell width is ≥ 44 pt, 4 and 6 periods fit at 375 pt, 8 periods fit in landscape and on tablet, 12 rows fit on tablet, and overtimes that do not fit set horizontal scroll.
  - Scenarios:
    - Happy path: 6 periods at 375 pt → no horizontal scroll.
    - Boundaries: 8 periods at 375 pt → scroll with 44 pt cells.
    - Outside the rules: not applicable.
    - Odd data: 3 overtimes on a tablet → scroll; 15 players on a phone in landscape → vertical scroll.
    - Sequences: rotate → recomputed.
    - Interruptions: not applicable.
    - Mistakes: the cell width is never below 44.
  - Pending: nothing.

- [ ] **T038** · UI: grid component with fixed player column, headers, cells and counter (RF-042, RF-043, RF-070, RF-071, RF-077, E-014)
  - Layer and files: UI · `src/ui/grid/match-grid.tsx`, `player-column.tsx`, `column-header.tsx`, `grid-cell.tsx`, `src/i18n/es.json` (`grid.header.*`, `grid.counter`), tests.
  - Done when: one row per call-up entry with number, name and «J n · D n»; headers «P1»… and «PR1»…; three distinct cell states with accessible labels; the player column does not scroll horizontally.
  - Scenarios:
    - Happy path: 6 periods + 1 overtime, 10 players → 10 rows, 7 columns.
    - Boundaries: E-014 counter «J 3 · D 3».
    - Outside the rules: not applicable.
    - Odd data: very long name → ellipsis; empty call-up → no rows.
    - Sequences: re-render after a change shows the new state.
    - Interruptions: not applicable.
    - Mistakes: a cell is never shown with two states.
  - Pending: nothing.

- [ ] **T039** · UI: match screen with tap, undo, overtimes and call-up range banner (RF-044, RF-049, RF-056, RF-057, RF-058, RF-059, RF-068)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx`, `src/i18n/es.json` (`grid.undo`, `grid.addOvertime`, `grid.removeOvertime`, `confirm.removeOvertime.*`), tests in `tests/app/`.
  - Done when: tapping cells calls the store; «Deshacer» is disabled with nothing to undo; «Añadir prórroga» adds a column; «Quitar prórroga» only on the last one, with confirmation when it has marks; the call-up range banner shows when it applies.
  - Scenarios:
    - Happy path: mark five starters in P1.
    - Boundaries: «Quitar prórroga» without marks → no dialog.
    - Outside the rules: not applicable.
    - Odd data: match with 13 players → banner.
    - Sequences: mark, add overtime, undo, undo.
    - Interruptions: leaving the screen empties the undo stack.
    - Mistakes: cancel removing an overtime with marks → stays with its marks.
  - Pending: nothing.

- [ ] **T040** · Maestro US3 journeys, interruption, and layout on devices (RF-042, RF-057, RF-058, RF-059, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081, RF-082, E-019)
  - Layer and files: e2e · `e2e/us3-planning.yaml`, `e2e/us3-interruption.yaml` (`stopApp`, `launchApp`); device check recorded in `review.md`.
  - Done when: both flows pass on both platforms; Fernando checks the grid on an iPhone, the 5th-gen iPad and an Android phone in portrait and landscape against RF-076–RF-081.
  - Scenarios: US3 acceptance criteria 1–4; E-019 close and reopen.
  - Pending: nothing.

**US3 checkpoint:** Fernando plans a match: marks and removes X, undoes several times, adds and removes overtimes, closes the app and finds everything as it was, on phone and tablet in both orientations.

## US4 · See the rule warnings

- [ ] **T041** · UI: warnings on the grid, colours and legend (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064, RF-065, RF-066, RF-067, RF-072, E-001, E-003, E-004, E-007)
  - Layer and files: UI · `src/ui/theme/warning-colors.ts`, `src/ui/grid/*` (colours and header marks), `src/ui/warnings/rule-impossible-banner.tsx`, `src/ui/warnings/warning-legend.tsx`, `src/i18n/es.json` (`warning.*`), tests.
  - Done when: light red cells, players in red, «!» and the inconsistent mark in headers, and the general warning render only from `GridWarnings`; nothing is coloured by default.
  - Scenarios:
    - Happy path: E-001 → P4 and P5 light red.
    - Boundaries: E-003 → red player, P5 light red and the general warning.
    - Outside the rules: E-004 → red and general warning.
    - Odd data: free periods and overtimes never coloured (RF-006).
    - Sequences: each tap updates the warnings.
    - Interruptions: warnings shown again after reopening.
    - Mistakes: a header both incomplete and inconsistent shows only the inconsistent mark.
  - Pending: pending question 8.

- [ ] **T042** · Maestro US4 journey and performance on the 5th-gen iPad (RF-060, RF-062, RF-063, RF-064, RF-065, RF-067, E-001, E-003, E-005, E-006, E-007, E-008, E-009)
  - Layer and files: e2e · `e2e/us4-warnings.yaml`; measurement in `review.md`.
  - Done when: the flow reproduces the US4 acceptance criteria and E-001, E-003, E-005–E-009 on both platforms; on the iPad, a release build repaints under 100 ms after a tap with 12 players and 8 periods.
  - Scenarios: the four US4 acceptance criteria.
  - Pending: nothing.

**US4 checkpoint:** Fernando sees light red cells, players in red, the period marks and the general warning appear and disappear as he taps, with no lag on the iPad.

- [ ] **T043** · D2 close: verification, Codex and Security review, D2 section of `summary.md`, PR
  - Layer and files: `review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green, Maestro output recorded, no blocking finding, the PR "001 D2: teams, matches, grid, warnings" is merged by Fernando after using the app in a match.
  - Pending: the Planner reviews D3 with the lessons of D2 before it starts.

# D3 · Rest of v1 (US5–US7)

## US5 · Record subs during the match

- [ ] **T044** · State: questions and answers in the session (RF-045, RF-046, RF-047, RF-050, RF-051, RF-054, RF-057, E-011, E-013)
  - Layer and files: state · `src/state/match-session-store.ts` (`pending`, `answerSub`, `answerStarter`, `chooseReplaced`, `confirmRemove`, `cancelQuestion`), tests.
  - Done when: each domain question is stored as `pending`; each answer saves and publishes; cancelling at any step leaves the grid as it was; a replacement is one undo entry.
  - Scenarios:
    - Happy path: E-011 → question → sub → circled X saved.
    - Boundaries: starter → choose Eva → both cells saved together.
    - Outside the rules: not applicable.
    - Odd data: a tap on another cell while a question is pending is ignored.
    - Sequences: replacement then undo → both cells restored in one press.
    - Interruptions: closing with a pending question → nothing saved for it.
    - Mistakes: cancel while choosing the replaced X → no change (RF-045).
  - Pending: nothing.

- [ ] **T045** · State: long-press menu actions (RF-052, RF-053, RF-057)
  - Layer and files: state · `src/state/match-session-store.ts` (`openCellMenu`, `chooseCellMenuOption`), tests.
  - Done when: the menu opens only on marked cells; each choice goes through the domain; «Titular» with 5 X asks which X; «Quitar» on an X with a sub shows the reminder; each change is one undo entry.
  - Scenarios:
    - Happy path: circled X → «Titular» with 4 X.
    - Boundaries: same state chosen → nothing saved, no undo entry.
    - Outside the rules: not applicable.
    - Odd data: long press on an empty cell → no menu.
    - Sequences: menu change then undo.
    - Interruptions: not applicable.
    - Mistakes: «Quitar» with a sub, then cancel → X stays.
  - Pending: nothing.

- [ ] **T046** · UI: sub-or-starter question, replaced-X choice and removal reminder (RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, E-011, E-012, E-013)
  - Layer and files: app and UI · `src/app/matches/[matchId]/index.tsx`, `src/ui/choice-dialog.tsx`, `src/i18n/es.json` (`grid.subOrStarter.*`, `grid.chooseReplaced.title`, `grid.removeXReminder.*`), tests.
  - Done when: the three dialogs show the approved texts, every one can be cancelled, and the replaced-X choice lists the five starters by number and name.
  - Scenarios:
    - Happy path: E-011 question, answer sub.
    - Boundaries: E-012 in P6 → circled X without a dialog.
    - Outside the rules: not applicable.
    - Odd data: two starters with the same number are told apart by name.
    - Sequences: E-013 → reminder → remove anyway → inconsistent mark in P3.
    - Interruptions: rotating the device with a dialog open keeps it.
    - Mistakes: tapping outside the dialog cancels it.
  - Pending: nothing.

- [ ] **T047** · UI: long press on cells with gesture handler and the cell menu (RF-052, RF-053, RF-076)
  - Layer and files: UI and app · `src/ui/grid/grid-cell.tsx`, `src/app/_layout.tsx` (root view if v3 requires it), `src/i18n/es.json` (`grid.cellMenu.*`), tests.
  - Done when: a long press on a marked cell opens «Titular», «Entró de cambio», «Quitar» and «Cancelar»; on an empty cell nothing happens; a short tap still works; the v3 API used is the one in the installed version's docs.
  - Scenarios:
    - Happy path: long press on a circled X → «Titular».
    - Boundaries: «Titular» with 5 X → replaced-X choice.
    - Outside the rules: not applicable.
    - Odd data: long press while scrolling the grid does not open the menu.
    - Sequences: long press then tap on another cell.
    - Interruptions: not applicable.
    - Mistakes: long press on an empty cell → no mark, no menu.
  - Pending: nothing.

- [ ] **T048** · Maestro US5 journey on phone and tablet (RF-045, RF-046, RF-047, RF-048, RF-050, RF-051, RF-052, RF-053, RF-054, RF-055, RF-066, RF-076, RF-077, RF-078, RF-079, RF-080, RF-081, E-011, E-012, E-013)
  - Layer and files: e2e · `e2e/us5-subs.yaml`; device check in `review.md`.
  - Done when: the flow covers the US5 acceptance criteria 1–5 on both platforms; Fernando checks the dialogs and menu on phone and tablet in both orientations.
  - Scenarios: the five US5 acceptance criteria and E-011–E-013.
  - Pending: nothing.

**US5 checkpoint:** Fernando records subs and starter replacements during a period, uses the long-press menu and never reaches a sixth X.

## US6 · View, edit and delete matches

- [ ] **T049** · Domain: match list order (RF-074, RF-075)
  - Layer and files: domain · `src/domain/match-order.ts`, test.
  - Done when: `compareMatches` orders by date descending, then time descending, with matches without a time after those with one.
  - Scenarios:
    - Happy path: 2026-11-01, 2026-11-08, 2026-11-15 → 15, 8, 1.
    - Boundaries: same date 10:00 and 12:00 → 12:00 first.
    - Outside the rules: not applicable.
    - Odd data: same date, one without time → the one with time first; identical date and time → stable.
    - Sequences: not applicable.
    - Interruptions: not applicable.
    - Mistakes: "9:00" versus "10:00" compared as times, not text.
  - Pending: nothing.

- [ ] **T050** · Data: match lists, edit details, delete match, change format (RF-028, RF-029, RF-038, RF-040, RF-041, RF-074, RF-075, E-016)
  - Layer and files: data · `src/data/match-repository.ts`, tests.
  - Done when: all matches are listed with team name and category, and a team's matches alone; details update; delete removes the match, call-up and marks; `changeMatchFormat` updates the format and deletes marks of vanished periods in one transaction.
  - Scenarios:
    - Happy path: list matches of two teams.
    - Boundaries: format 8 → 4 deletes P5–P8 marks, keeps overtime marks.
    - Outside the rules: not applicable.
    - Odd data: no matches → empty list.
    - Sequences: edit details twice, read back.
    - Interruptions: failure halfway through a format change → nothing changed.
    - Mistakes: deleting one match leaves the team's other matches.
  - Pending: nothing.

- [ ] **T051** · State: match lists, editing, deleting and format change (RF-028, RF-029, RF-038, RF-039, RF-040, RF-041, RF-056, RF-082, E-016)
  - Layer and files: state · `src/state/matches-store.ts`, `src/state/match-session-store.ts` (`changeFormat`), tests.
  - Done when: lists are published sorted with the domain; a format change is applied only after a confirm step, through the domain and the repository, and does not push an undo entry.
  - Scenarios:
    - Happy path: E-016 confirmed → marks P5–P8 gone.
    - Boundaries: change to the same format → still asks (RF-039) and changes nothing.
    - Outside the rules: not applicable.
    - Odd data: format change with no marks still asks.
    - Sequences: change format, undo → the format stays.
    - Interruptions: reopen after a format change → new format saved.
    - Mistakes: cancel → nothing changes.
  - Pending: nothing.

- [ ] **T052** · UI: list of every match and a team's matches (RF-074, RF-075)
  - Layer and files: app and UI · `src/app/matches/index.tsx`, `src/app/teams/[teamId]/index.tsx` (matches section), `src/app/index.tsx` (link), `src/ui/match-list-item.tsx`, `src/i18n/es.json`, tests.
  - Done when: each item shows date, time, home, away, score if any and format; the global list also shows team and category; empty lists show their text.
  - Scenarios:
    - Happy path: three matches in order 15, 8, 1.
    - Boundaries: match without score or time.
    - Outside the rules: not applicable.
    - Odd data: long team names.
    - Sequences: create a match, back to the list → it appears.
    - Interruptions: not applicable.
    - Mistakes: the team list never shows other teams' matches.
  - Pending: nothing.

- [ ] **T053** · UI: edit match details, format change with confirmation, delete match (RF-001, RF-025, RF-028, RF-029, RF-038, RF-039, RF-040, RF-041, E-016)
  - Layer and files: app and UI · `src/app/matches/[matchId]/edit.tsx`, `src/ui/match-form.tsx`, `src/i18n/es.json` (`confirm.formatChange.*`, `confirm.deleteMatch.*`), tests.
  - Done when: every detail can be edited and is shown unchanged on reopening; every format change shows the general warning; deleting asks first.
  - Scenarios:
    - Happy path: edit home, away and score.
    - Boundaries: format change with no marks still asks.
    - Outside the rules: not applicable.
    - Odd data: clear every optional field.
    - Sequences: E-016 then reopen → P1–P4 only.
    - Interruptions: not applicable.
    - Mistakes: cancel the deletion → match stays.
  - Pending: nothing.

- [ ] **T054** · Maestro US6 journey (RF-028, RF-029, RF-039, RF-074, RF-082, E-016)
  - Layer and files: e2e · `e2e/us6-matches.yaml`.
  - Done when: the flow covers the US6 acceptance criteria 1–4 on both platforms.
  - Scenarios: the four US6 acceptance criteria.
  - Pending: nothing.

**US6 checkpoint:** Fernando browses every match and each team's matches, edits a saved match, changes its format with the warning and deletes a match after confirming.

## US7 · Keep the squad up to date

- [ ] **T055** · Data: edit player, deactivate and reactivate, delete team with counts (RF-015, RF-018, RF-019, RF-020, RF-021, RF-022, RF-024, E-018)
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

- [ ] **T056** · State and UI: edit, deactivate and reactivate a player (RF-018, RF-019, RF-021, RF-022, RF-023, RF-024, E-018)
  - Layer and files: state, app and UI · `src/state/squad-store.ts`, `src/app/teams/[teamId]/players/[playerId].tsx`, `src/ui/player-form.tsx`, `src/i18n/es.json` (`player.*`, `confirm.deactivatePlayer.*`), tests.
  - Done when: editing updates the team; deactivating asks and shows «Desactivado»; reactivating asks nothing; deactivated players are not offered in new call-ups; no delete action exists.
  - Scenarios:
    - Happy path: rename and renumber Juan.
    - Boundaries: reactivate → selected in the next new match.
    - Outside the rules: not applicable.
    - Odd data: deactivated player still shown with marks in a saved match.
    - Sequences: change Juan 7 → 9, add him to an older match → shows 9 there.
    - Interruptions: not applicable.
    - Mistakes: cancel deactivation → stays active.
  - Pending: nothing.

- [ ] **T057** · State and UI: delete a team with confirmation (RF-015)
  - Layer and files: state, app and UI · `src/state/squad-store.ts`, `src/app/teams/[teamId]/edit.tsx`, `src/i18n/es.json` (`confirm.deleteTeam.*`), tests.
  - Done when: the confirmation states the numbers of players and matches; on confirming, the team disappears from every list and the app returns to the teams list.
  - Scenarios:
    - Happy path: delete a team with 10 players and 3 matches.
    - Boundaries: team with no players and no matches.
    - Outside the rules: not applicable.
    - Odd data: plural forms «1 jugador» and «3 jugadores».
    - Sequences: delete, then the all-matches list no longer shows its matches.
    - Interruptions: not applicable.
    - Mistakes: cancel → nothing changes.
  - Pending: nothing.

- [ ] **T058** · Maestro US7 journey (RF-015, RF-018, RF-019, RF-020, RF-022, RF-023, RF-024, E-018)
  - Layer and files: e2e · `e2e/us7-squad.yaml`.
  - Done when: the flow covers the US7 acceptance criteria 1–3 and E-018 on both platforms.
  - Scenarios: the three US7 acceptance criteria and E-018.
  - Pending: nothing.

**US7 checkpoint:** Fernando edits, deactivates and reactivates players and deletes a team, and saved matches keep the data they had.

## Closing

- [ ] **T059** · Full verification, Codex and Security review, `summary.md` and status "Closed" (RF-011, RF-012)
  - Layer and files: `spec.md` (status "Closed"), `review.md`, `codex-review.md`, `summary.md`.
  - Done when: `verify.sh` green with the spec "Closed" (every RF and E has a test); every Maestro flow green; a whole match played on a device in airplane mode with every text in Spanish; no blocking finding; Fernando accepts and merges the PR "001 D3: subs, matches, squad".
  - Pending: nothing.
