# Plan · 001 Period planner v1

- **Spec:** [spec.md](spec.md)
- **Level:** Large
- **Status:** Draft <!-- Draft | Approved -->
- **Approved by:** — <!-- name and date -->
- **ADR:** [ADR-004](../../docs/decisions/ADR-004-global-ids-and-deliveries.md) (Proposed)

## Explanation before running

- **What:** we build the whole of v1 of the app in three deliveries. **D1** is the "rules engine": the code that knows the regulations (which cells turn light red, which player is in red, when a sixth X is not allowed, what a tap does). It has no screens, only functions and tests. **D2** turns it into an app you can use in a match: teams, players, matches, call-up, the grid with undo and overtimes, and every warning, all saved on the device at each tap. **D3** adds substitutions and the long-press menu, the match lists, editing and deleting matches, changing the format, and keeping the squad up to date, and then closes the spec.
- **How:**
  1. A documentation-only PR puts the spec, this plan, `tasks.md`, the phase 4 review and ADR-004 on `main`.
  2. **D1** (branch `001-planificador-v1-d1`, T001–T017): first the traceability script learns three-digit global IDs, then the rules in `src/domain/`, one file per rule, with the spec examples as test tables, random-data properties and mutation testing.
  3. **D2** (branch `001-planificador-v1-d2`, T018–T043): the database (`src/data/`), the session of the open match and undo (`src/state/`), and the screens (`src/app/`, `src/ui/`) for US1–US4, with Maestro journeys on the simulator.
  4. **D3** (branch `001-planificador-v1-d3`, T044–T059): US5–US7 in the same layers, and the closing task.
  5. Before D2 and D3 start, this plan is reviewed with what we learned, and you approve it again.
- **Why:**
  - The rules go first and on their own because they are the heart of the app and the hardest part to get right (above all "rule impossible to meet"). With no screens in the way, every example of the spec becomes a test that a machine checks.
  - Three PRs instead of one: each one is small enough for Codex to review well, and after D2 you already have an app you can try in a real match.
  - "Rule impossible to meet" is solved as a flow problem (like water through pipes with minimum and maximum widths) instead of trying every combination: trying them all can mean 2⁷² cases, while the flow answers in microseconds and is exact.
  - Discarded: one branch for the whole spec (too big), one branch per story (seven PRs, and US1–US4 are not usable separately), saving the grid with a "Save" button (it breaks principle 4).
- **To learn:**
  - **TypeScript:** union types with a `kind` field (a tap returns "changed", "ask sub or starter" or "confirm removal"), `readonly` types, template literal types for keys such as `P3`, type guards, and `import type`.
  - **Tests:** `it.each` tables, fast-check properties, Stryker mutants and coverage, React Native Testing Library, Maestro flows.
  - **Algorithms:** maximum flow with lower and upper bounds, for "rule impossible to meet".
  - **Data:** SQLite tables, foreign keys with cascade delete, transactions, Drizzle schemas and generated migrations.
  - **State:** a Zustand store, actions and selectors, and an undo stack.
  - **Expo and React Native:** Expo Router dynamic routes (`[teamId]`) and `useLocalSearchParams`, Stack screens and modals, `useWindowDimensions` for phone and tablet in both orientations, horizontal `ScrollView` with a fixed column, `Modal`, long press with react-native-gesture-handler 3, and native date pickers from `@expo/ui`.
- **To check it:**
  - **D1:** `npm run verify` green, including mutation testing; read `src/domain/spec-examples.test.ts`, where each example of the spec is one row of a table.
  - **D2:** on iPhone, iPad and Android, in portrait and landscape: create a team with players, create a match, plan the periods, see the warnings, close the app halfway and reopen it. Maestro journeys green.
  - **D3:** record substitutions, use the long press, change the format, edit and delete matches, deactivate players and delete a team; finally, a whole match with airplane mode on.
- **Pending:** none. Fernando accepted the proposals of all nine questions below on 2026-11-11 («Aceptar 1–5 (Rec.)» and «Aceptar 6–9 (Rec.)»); they are decisions now.
  1. **Order of "0" and "00", and numbers like "07".** Players are sorted by number (RF-016), and "0" and "00" are different numbers. Proposal: sort by numeric value, "0" before "00", then by name. RF-016 allows "0–99, plus 00", so the proposal is that "07" is not a valid number (it would be confused with 7).
  2. **Input length limits** ("a sensible limit", RF-013, RF-016, RF-025). Proposal: 40 characters for team, category, player, home and away names; 500 for notes; scores from 0 to 999.
  3. **Date and time input** (RF-025, RF-026). Proposal: the native pickers of `@expo/ui`, which is already installed (no new dependency), with the date shown as «11/11/2026». The alternative is free text, which needs new validation texts.
  4. **Format in the new-match form.** Proposal: the form shows the format, filled with the team default (RF-036), and you can change it before creating the match, with no confirmation because nothing exists yet. Changing it afterwards follows RF-039 (D3).
  5. **When a save fails** (for example, a full device). The spec does not say. Decision: the change is not applied and a message appears: «No se ha podido guardar el cambio. Inténtalo de nuevo.» (new key `error.saveFailed`, approved).
  6. **iPhone and iPad backups.** The constitution disables Android automatic backup, but says nothing about iCloud or computer backups on iOS, which by default include the app's database. Proposal: ask the Security role in D2 (T018) and decide then; it does not change any requirement.
  7. **Undo after a structural change.** If you undo a mark whose column or player no longer exists (overtime removed, format changed, player removed from the call-up), that cell is skipped and the rest of the action is undone. Proposal: accept it.
  8. **How the warning meanings are shown** (`warning.*` texts of the spec). Proposal: a legend under the general warning that lists, in Spanish, only the warnings visible at that moment; the inconsistent-period header uses the symbol «≠» next to the period name, and the incomplete one «!».
  9. **Drizzle version.** Drizzle's Expo guide installs the 1.0 release candidate; the stable release is 0.45.4. Proposal: the stable one.

## Constitution check

| Principle                              | Met? | How                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inform, never block                 | Yes  | Every domain function returns a result instead of refusing. The only refusal is the sixth X, enforced in `src/domain/marking.ts` and checked by a fast-check property over any sequence of actions (RF-055). Call-up outside the range, broken rules and duplicate numbers only produce warnings. |
| 2. Nothing changes by itself           | Yes  | Domain functions only touch the cells the coach acted on; a property test checks that no other cell changes (RF-054). Removing marks (format change, call-up removal, overtime with marks, team or match deletion) always goes through a confirmation in the interface.                           |
| 3. Offline and no data leaving         | Yes  | SQLite on the device. No new dependency makes network calls; ESLint already forbids `fetch` and friends. RF-011 is checked with airplane mode in the closing task.                                                                                                                                |
| 4. Every tap is saved at once          | Yes  | Each state action writes to SQLite synchronously, in a transaction, before publishing the new state (RF-082). Maestro closes and reopens the app in the middle of a match (E-019).                                                                                                                |
| 5. Children's data                     | Yes  | Names only in the device database; no `console` in `src/`; `android.allowBackup: false` is kept. iOS backups are pending question 6 for Security.                                                                                                                                                 |
| 6. Simple                              | Yes  | Five tables, no versions of the plan, undo only in memory. Nothing is generalised beyond the three formats, which are data in one table.                                                                                                                                                          |
| 7. In Spanish                          | Yes  | Every text from the approved table of the spec goes to `src/i18n/es.json`; ESLint forbids loose text in JSX.                                                                                                                                                                                      |
| 8. The repository is the source        | Yes  | Spec, plan, tasks, ADR-004, reviews and summaries are versioned; the documentation PR puts them on `main` before any code.                                                                                                                                                                        |
| 9. A single rules file                 | Yes  | No rule is added outside `AGENTS.md`; ADR-004 changes its branch rule there.                                                                                                                                                                                                                      |
| 10. Machines check and people decide   | Yes  | Traceability is extended to three-digit global IDs and duplicate IDs (T001); `drizzle-kit check`, coverage and Stryker run in `verify.sh`. Fernando approves the plan before each delivery.                                                                                                       |
| 11. Whoever writes does not review     | Yes  | Codex reviews each delivery with `scripts/review.sh`; Security audits D2 (dependencies, data, navigation) and D3.                                                                                                                                                                                 |
| 12. Nothing is invented                | Yes  | Every gap found while planning is a pending question above, with a proposal, not a decision.                                                                                                                                                                                                      |
| 13. Process proportional to the change | Yes  | Large level, full flow, split into three deliveries (ADR-004).                                                                                                                                                                                                                                    |
| 14. Small, checkable steps             | Yes  | 59 tasks of at most three hours, one commit each, `verify.sh` green after each.                                                                                                                                                                                                                   |
| 15. Nothing is coded without approval  | Yes  | The plan is Draft; D1 starts only after approval, and D2 and D3 after a new approval.                                                                                                                                                                                                             |
| 16. Rules only in `src/domain/`        | Yes  | All regulation rules, warnings, the counter, marking and format change are domain functions. `src/ui/grid/grid-layout.ts` only computes sizes, not rules. State asks the domain and the interface only renders.                                                                                   |
| 17. A single code style                | Yes  | The existing layers, ESLint boundaries and glossary. New terms are added to the glossary in T002 before they are used. Generated migrations are excluded from lint and formatting.                                                                                                                |
| 18. Tests look for bugs                | Yes  | Scenarios of every kind per task; spec examples as tables; brute-force oracle against the flow algorithm; 90 % coverage and 80 % of mutants in `src/domain/`; Maestro for full journeys.                                                                                                          |
| 19. Explain before and after           | Yes  | This section, and a `summary.md` section after each delivery.                                                                                                                                                                                                                                     |

## Deliveries

| Delivery          | Branch                     | PR                                       | Tasks     | Checkpoint                                                                                                                                                                                                                                                                                                                          |
| ----------------- | -------------------------- | ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation     | `001-planificador-v1-spec` | "001: specification, plan and ADR-004"   | —         | Spec and plan "Approved", ADR-004 "Accepted", `AGENTS.md` branch rule updated, `review.md` with the phase 4 analysis. No code.                                                                                                                                                                                                      |
| D1 · Rules engine | `001-planificador-v1-d1`   | "001 D1: rules engine"                   | T001–T017 | `verify.sh` green with mutation testing (≥ 80 % mutants, ≥ 90 % coverage of `src/domain/`); every domain example green; Codex without blocking findings. The app looks the same.                                                                                                                                                    |
| D2 · Match-ready  | `001-planificador-v1-d2`   | "001 D2: teams, matches, grid, warnings" | T018–T043 | US1–US4 checkpoints met; Maestro flows green; Fernando plans a real match on iPhone, iPad and Android; Codex and Security without blocking findings. Known limit until D3: in a rule-window period with 5 X, a tap on an empty cell, and a tap on an X when the period has a sub, do nothing yet (their questions arrive with US5). |
| D3 · Rest of v1   | `001-planificador-v1-d3`   | "001 D3: subs, matches, squad"           | T044–T059 | US5–US7 checkpoints met; closing task done; spec "Closed"; Fernando accepts the result.                                                                                                                                                                                                                                             |

- Each delivery runs phases 5 to 8 for its own tasks: the Test designer writes scenarios and red tests task by task, the Implementer makes them pass, the Verifier records the output, and Codex and Security review the delivery's PR.
- **When D2 and D3 start,** the Planner reviews that delivery's part of this plan and of `tasks.md` with the lessons of the previous one (what took longer, what the reviews found, answers to the pending questions), records the changes in "Deviations", and Fernando approves again. That approval is recorded in "Approved by" with the delivery.
- `summary.md` gets one section per delivery; the closing task T059 completes it.
- The traceability check only requires tests for the IDs of ticked tasks while the spec is "In progress", so each delivery's PR is green with its own tasks.

## Design

### D1 · Rules engine (`src/domain/`)

**First task (T001).** `scripts/check-traceability.mjs` changes to three-digit global IDs (`RF-\d{3}`, `E-\d{3}`) and fails when the same ID is defined in two `spec.md` files (ADR-004). Today its pattern `\bE-\d{2}\b` does not match `E-001` at all, so without this task no example of spec 001 would be checked. Its test lives in `tests/scripts/check-traceability.test.ts` (Jest), which runs the script with `child_process` against fixture folders created at run time in a temporary directory. The fixtures are written at run time, and the test names carry no IDs, because the script reads every test name under `tests/`: a fixture file or a test name containing `RF-001` would count as a real test. `docs/architecture.md` (conventions, traceability table, `E-01` examples), the spec and tasks templates, and the specifier and test-designer roles are updated to `E-001`.

**Files.** One responsibility per file, all pure, no imports from outside `src/domain/`.

| File                        | Contents                                                                  | Requirements                   |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| `format.ts`                 | Formats as data, the 5-X limit                                            | RF-001–RF-006                  |
| `column.ts`                 | Periods and overtimes as columns; rule window                             | RF-002, RF-006, RF-042         |
| `player-order.ts`           | Sorting by number and name                                                | RF-016, RF-042                 |
| `grid.ts`                   | The grid, cells and marks; read helpers                                   | RF-043                         |
| `marking.ts`                | Tap, sub, starter replacement, removal                                    | RF-044–RF-051, RF-054, RF-055  |
| `cell-menu.ts`              | Long-press menu                                                           | RF-052, RF-053                 |
| `counter.ts`                | Played and rested over the match                                          | RF-007–RF-009, RF-070, RF-071  |
| `rule-window.ts`            | Window statistics, light red cells, player in red                         | RF-062–RF-064, RF-072          |
| `rule-feasibility.ts`       | "Rule impossible to meet"                                                 | RF-067                         |
| `bounded-flow.ts`           | Maximum flow with lower bounds, used only by `rule-feasibility.ts`        | RF-067                         |
| `period-warnings.ts`        | Incomplete and inconsistent periods                                       | RF-065, RF-066                 |
| `call-up-range.ts`          | Call-up outside the range                                                 | RF-005, RF-010, RF-068         |
| `warnings.ts`               | All warnings of a grid in one result                                      | RF-060, RF-061                 |
| `overtime.ts`               | Add and remove overtimes                                                  | RF-058, RF-059                 |
| `format-change.ts`          | Effect of changing the format                                             | RF-038, RF-040, RF-041         |
| `call-up.ts`                | Initial call-up, snapshot of name and number, adding and removing players | RF-019, RF-023, RF-030–RF-034  |
| `duplicate-numbers.ts`      | Duplicate-number warning                                                  | RF-017, RF-069                 |
| `spec-examples.test.ts`     | E-001–E-018 as one `it.each` table                                        | All examples except E-019      |
| `domain.properties.test.ts` | fast-check properties                                                     | RF-054, RF-055, RF-060, RF-067 |

**Types.** Signatures are the contract; names follow the glossary (new terms added in T002).

```ts
// format.ts
export type FormatId = 4 | 6 | 8;
export interface FormatConfig {
  readonly id: FormatId;
  readonly periodCount: number; //      4 | 6 | 8
  readonly ruleWindowLength: number; // 3 | 5 | 6  (RF-002)
  readonly minPlayed: number; //        1 | 2 | 2  (RF-003)
  readonly minRested: number; //        1 | 2 | 2  (RF-004)
  readonly callUpMin: number; //        8 | 9 | 8  (RF-005)
  readonly callUpMax: number; //        12         (RF-005)
}
export const FORMATS: Readonly<Record<FormatId, FormatConfig>>;
export const FORMAT_IDS: readonly FormatId[]; // [4, 6, 8] (RF-001)
export const MAX_STARTERS_PER_PERIOD = 5; // RF-055
export function isFormatId(value: number): value is FormatId;

// column.ts
export type Column =
  | { readonly kind: "period"; readonly number: number }
  | { readonly kind: "overtime"; readonly number: number };
export type ColumnKey = `P${number}` | `OT${number}`;
export function columnKey(column: Column): ColumnKey;
export function gridColumns(
  format: FormatId,
  overtimeCount: number,
): readonly Column[]; // periods, then overtimes
export function ruleWindowColumns(format: FormatId): readonly Column[];
export function isRuleWindowColumn(format: FormatId, column: Column): boolean; // false = free period (RF-006)

// player-order.ts
export type ShirtNumber = string; // "0"–"99" and "00"; "0" !== "00" (RF-016)
export type PlayerId = number;
export interface CallUpEntry {
  readonly playerId: PlayerId;
  readonly name: string; //   as when the player entered the call-up (RF-019)
  readonly number: ShirtNumber;
}
export function comparePlayers(
  a: { readonly name: string; readonly number: ShirtNumber },
  b: { readonly name: string; readonly number: ShirtNumber },
): number; // numeric value, then "0" before "00" (pending question 1), then name

// grid.ts
export type Mark = "starter" | "sub"; // X and circled X
export type CellState = Mark | "empty";
export interface Cell {
  readonly playerId: PlayerId;
  readonly column: Column;
}
export type CellKey = `${PlayerId}:${ColumnKey}`;
export interface MatchGrid {
  readonly format: FormatId;
  readonly overtimeCount: number;
  readonly callUp: readonly CallUpEntry[]; // rows, sorted with comparePlayers (RF-042)
  readonly marks: Readonly<Partial<Record<CellKey, Mark>>>; // a missing key is an empty cell
}
export function cellKey(cell: Cell): CellKey;
export function cellState(grid: MatchGrid, cell: Cell): CellState;
export function starterCount(grid: MatchGrid, column: Column): number;
export function hasSub(grid: MatchGrid, column: Column): boolean;
```

**Marking.** Every function returns a new grid or a question; none throws for an expected case. A question never changes the grid, so "cancel" (RF-045) is simply not calling anything else: the state layer drops the question.

```ts
// marking.ts
export type MarkingResult =
  | { readonly kind: "changed"; readonly grid: MatchGrid }
  | { readonly kind: "unchanged" }
  | { readonly kind: "askSubOrStarter" } //       RF-045
  | { readonly kind: "chooseReplacedStarter" } // RF-047 after "starter", RF-053
  | { readonly kind: "confirmRemoveStarter" }; // RF-050 reminder

export function tapCell(grid: MatchGrid, cell: Cell): MarkingResult;
// empty + < 5 X              → changed: X                    (RF-044)
// empty + 5 X + rule window  → askSubOrStarter               (RF-045)
// empty + 5 X + free/overtime → changed: circled X           (RF-048)
// X + no sub in the column   → changed: empty                (RF-049)
// X + some sub               → confirmRemoveStarter          (RF-050)
// circled X                  → changed: empty                (RF-051)

export function markSub(grid: MatchGrid, cell: Cell): MatchGrid; // answer "sub" (RF-046)
export function replaceableStarters(
  grid: MatchGrid,
  column: Column,
): readonly PlayerId[];
export function replaceStarter(
  grid: MatchGrid,
  cell: Cell,
  replaced: PlayerId,
): MatchGrid;
// tapped cell → X, replaced cell → empty, in one step; unchanged grid if `replaced` has no X there (RF-047, RF-053)
export function removeMark(grid: MatchGrid, cell: Cell): MatchGrid; // "remove anyway" and plain removals (RF-050, RF-054)

// cell-menu.ts
export type CellMenuChoice = "starter" | "sub" | "remove";
export function canOpenCellMenu(grid: MatchGrid, cell: Cell): boolean; // false on an empty cell (RF-052)
export function chooseCellMenuOption(
  grid: MatchGrid,
  cell: Cell,
  choice: CellMenuChoice,
): MarkingResult;
// same state as now → unchanged; "starter" with 5 X → chooseReplacedStarter (RF-053);
// "remove" on an X with a sub in the column → confirmRemoveStarter (RF-052)
```

**Counter, warnings and the rule window.**

```ts
// counter.ts
export interface PlayerCounter {
  readonly played: number; // X in every column, overtimes included (RF-070)
  readonly rested: number; // empty cells in every column; circled X adds to neither (RF-071)
}
export function playerCounter(
  grid: MatchGrid,
  playerId: PlayerId,
): PlayerCounter;

// rule-window.ts — only rule-window columns (RF-072)
export interface WindowStats {
  readonly played: number; //        X in the window
  readonly possibleRests: number; // empty cells in the window (RF-062)
}
export function windowStats(grid: MatchGrid, playerId: PlayerId): WindowStats;
export function isRuleWindowComplete(grid: MatchGrid): boolean; // every window column has 5 X
export function lightRedCells(grid: MatchGrid): readonly Cell[]; // empty window cells of players with possibleRests ≤ minRested
export function playersInRed(grid: MatchGrid): readonly PlayerId[];
// possibleRests < minRested (RF-063), or played < minPlayed when the window is complete (RF-064)

// rule-feasibility.ts
export function isRuleImpossible(grid: MatchGrid): boolean; // RF-067

// period-warnings.ts
export type PeriodWarning = "incomplete" | "inconsistent";
export function periodWarning(
  grid: MatchGrid,
  column: Column,
): PeriodWarning | null;
// inconsistent: any column, ≥ 1 circled X and < 5 X (RF-066); otherwise
// incomplete: rule-window column with < 5 X (RF-065); free periods and overtimes: never incomplete

// call-up-range.ts
export interface CallUpRangeWarning {
  readonly format: FormatId;
  readonly min: number;
  readonly max: number;
  readonly count: number;
}
export function callUpRangeWarning(
  format: FormatId,
  count: number,
): CallUpRangeWarning | null; // RF-068

// warnings.ts — recomputed by the state layer after every change (RF-060)
export interface GridWarnings {
  readonly lightRedCells: ReadonlySet<CellKey>;
  readonly playersInRed: ReadonlySet<PlayerId>;
  readonly periodWarnings: Readonly<Partial<Record<ColumnKey, PeriodWarning>>>;
  readonly ruleImpossible: boolean;
  readonly callUpRange: CallUpRangeWarning | null;
}
export function evaluateWarnings(grid: MatchGrid): GridWarnings; // nothing set = everything white (RF-061)
```

**Overtimes, format change and call-up.**

```ts
// overtime.ts
export function addOvertime(grid: MatchGrid): MatchGrid; // RF-058
export function lastOvertimeHasMarks(grid: MatchGrid): boolean; // decides the confirmation (RF-059)
export function removeLastOvertime(grid: MatchGrid): MatchGrid; // removes its marks; no-op without overtimes

// format-change.ts
export function changeFormat(grid: MatchGrid, format: FormatId): MatchGrid;
// keeps marks in periods that still exist, drops the rest; overtimes and their marks kept (RF-040, RF-041).
// The confirmation is always asked by the interface (RF-039), so the domain does not decide it.

// call-up.ts
export interface SquadPlayer {
  readonly id: PlayerId;
  readonly name: string;
  readonly number: ShirtNumber;
  readonly isActive: boolean;
}
export function callUpEntryFor(player: SquadPlayer): CallUpEntry; // snapshot of name and number (RF-019, E-018)
export function initialCallUp(
  players: readonly SquadPlayer[],
): readonly CallUpEntry[]; // active only, sorted (RF-030)
export function playersToAdd(
  players: readonly SquadPlayer[],
  callUp: readonly CallUpEntry[],
): readonly SquadPlayer[]; // active and not yet in (RF-023, RF-032)
export function addToCallUp(grid: MatchGrid, entry: CallUpEntry): MatchGrid; // new empty row, order kept (RF-042)
export function playerHasMarks(grid: MatchGrid, playerId: PlayerId): boolean; // decides the confirmation (RF-033, RF-034)
export function removeFromCallUp(
  grid: MatchGrid,
  playerId: PlayerId,
): MatchGrid; // row and marks gone (RF-034, E-017)

// duplicate-numbers.ts
export function duplicateNumbers(
  players: readonly SquadPlayer[],
): readonly ShirtNumber[]; // active only (RF-069)
```

**"Rule impossible to meet" (RF-067).** The definition asks whether the empty cells of the rule window can be filled with X, keeping every existing X and circled X, so that every window period ends with exactly 5 X and every player in the call-up reaches both minimums.

- For each window period `p`, the X still missing are `d(p) = 5 − X(p)`.
- For each player `i` with `a(i)` X and `e(i)` empty cells in the window, if `k(i)` X are added, they end with `a(i) + k(i)` played and `e(i) − k(i)` rested. Both minimums hold exactly when `L(i) = max(0, minPlayed − a(i)) ≤ k(i) ≤ U(i) = e(i) − minRested`.
- That is a bipartite flow with bounds: source → player `i` with bounds `[L(i), U(i)]`; player `i` → period `p` with capacity 1 when the cell is empty; period `p` → sink with bounds `[d(p), d(p)]`. A filling exists exactly when this network has a feasible flow.
- `bounded-flow.ts` solves it with the standard reduction: subtract the lower bounds, add a super-source and super-sink with the resulting excesses and a return edge sink → source, and run augmenting paths (Edmonds–Karp, breadth-first search). The rule is impossible when the maximum flow does not saturate the super-source. If some `U(i) < L(i)`, it is impossible straight away.
- **Why this algorithm.** It is exact for this definition and its cost does not depend on the number of combinations. The largest case planned (12 players × 6 window periods, and more players if the call-up exceeds 12, RF-010) has at most about 22 nodes, about 100 edges and a total flow of at most 30 (6 periods × 5 X), so the work is a few thousand steps. A search over fillings with pruning was discarded: the number of fillings grows as `C(12,5)⁶ ≈ 10¹⁷` in the worst case, and good pruning is harder to prove correct than the flow. A closed formula (Gale–Ryser style) was discarded because the bounds on both sides and the unavailable cells make it easy to get wrong.
- **How we know it is right.** E-003, E-004, E-006 and E-007 as examples, and a fast-check property that compares it with a brute-force search over every filling on small grids (up to 5 players × 3 window periods), which is slow but obviously correct.
- Checked against the spec: E-003 (Juan has 1 empty cell, `U = 1 − 2 < 0`), E-004 (window complete, Pedro needs `L = 1` and no X is missing), E-006 (one X missing for two players with `L = 1`) and E-007 (5 X missing, ten players with `U = 1`, feasible).

**Performance target.** Warnings are recomputed after every tap, and the slowest device is a 5th-generation iPad (A9, iPadOS 16.7; SDK 58 needs iOS 16.4 or later, so it is supported).

- **Domain budget, checked in CI (T012):** 1,000 calls of `evaluateWarnings` on the worst planned grid (8 periods, 3 overtimes, 12 players, random marks) take less than 2 seconds in Jest on Node, that is, under 2 ms per call. The expected value is well under 0.5 ms; the margin keeps the test stable on a busy CI runner.
- **Device budget, checked by hand at the US4 checkpoint (T042):** on the 5th-gen iPad with a release build, from a tap to the repainted grid and warnings, under 100 ms (no visible lag), with 12 players and 8 periods, measured with the React profiler and 20 fast taps.

**Tests of D1.** `spec-examples.test.ts` has E-001–E-018 as one `it.each` table, each row named with its example and requirements (`'E-003 RF-004 RF-062 RF-063 RF-067: …'`). E-019 is about saving and reopening, so it is tested in D2 (T036 in state, T040 with Maestro); D1 has no persistence. Each file also has its own requirement tests with boundaries. Properties with fast-check (T016) over random grids and random sequences of taps, menu choices, answers, overtimes, format changes and call-up changes:

- no column ever has more than 5 X (RF-055);
- a tap or menu choice changes only the tapped cell, or exactly the two cells of a starter replacement (RF-054);
- `evaluateWarnings` is deterministic and white on an empty, complete and valid grid (RF-060, RF-061);
- `isRuleImpossible` agrees with the brute-force oracle (RF-067);
- played + rested + circled X = number of columns, for every player (RF-070, RF-071).

Stryker runs on `src/domain/**` with the existing thresholds (break at 80 %), and Jest enforces 90 % coverage of `src/domain/`.

### D2 · US1–US4: data, state and interface

#### Domain additions (D2 and D3)

Small pure functions that the stories need and that are not regulation rules, still in `src/domain/` so that state and interface compute nothing.

```ts
// squad-validation.ts (T020)
export type ValidationError =
  "nameRequired" | "numberInvalid" | "scoreIncomplete";
export function validateTeamInput(input: {
  readonly name: string;
  readonly category: string | null;
}): readonly ValidationError[];
export function validatePlayerInput(input: {
  readonly name: string;
  readonly number: string;
}): readonly ValidationError[];
// name: not blank after trimming (RF-013, RF-016); number: /^(\d|\d\d)$/ without a leading zero except "00" (pending question 1)

// team-order.ts (T020)
export function compareTeams(
  a: { readonly name: string },
  b: { readonly name: string },
): number; // Spanish alphabetical (RF-073)

// match-input.ts (T026)
export function newMatchDefaults(
  defaultFormat: FormatId,
  today: string,
): { readonly format: FormatId; readonly date: string }; // RF-026, RF-036
export function validateMatchInput(input: {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}): readonly ValidationError[]; // both or none (RF-025)

// grid-diff.ts (T033)
export interface CellChange {
  readonly cell: Cell;
  readonly state: CellState; // the state to write
}
export function cellChanges(
  before: MatchGrid,
  after: MatchGrid,
): readonly CellChange[]; // what to save
export function revertCellChanges(
  grid: MatchGrid,
  previous: readonly CellChange[],
): MatchGrid; // undo; skips missing cells, never a sixth X

// match-order.ts (T049, D3)
export function compareMatches(
  a: { readonly date: string; readonly time: string | null },
  b: { readonly date: string; readonly time: string | null },
): number; // date and time descending, no time last (RF-074, RF-075)
```

- "Today" is passed in by the state layer, so the domain never reads the clock.
- Input length limits (pending question 2) are a property of the text fields, so they live in `src/ui/`, not in the domain.

#### Data (`src/data/`)

Tables, with Drizzle `sqlite-core` in `src/data/schema.ts`. Integer IDs generated by SQLite, so no ID library is needed.

| Table             | Columns                                                                                                                                                                                                                                                                                                                           | Notes                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `teams`           | `id` integer PK; `name` text not null; `category` text null; `default_format` integer not null, check in (4, 6, 8)                                                                                                                                                                                                                | RF-013, RF-014                                                                                |
| `players`         | `id` PK; `team_id` → `teams.id` on delete cascade; `name` text not null; `number` text not null; `is_active` integer (boolean) not null default true                                                                                                                                                                              | Number as text, so "0" and "00" differ (RF-016); no unique index, duplicates allowed (RF-017) |
| `matches`         | `id` PK; `team_id` → `teams.id` on delete cascade; `format` integer not null, check in (4, 6, 8); `date` text not null (`YYYY-MM-DD`); `time` text null (`HH:MM`); `home_name`, `away_name`, `notes` text null; `home_score`, `away_score` integer null, check both null or both set; `overtime_count` integer not null default 0 | RF-025, RF-058; index on (`team_id`) and (`date`, `time`)                                     |
| `call_up_entries` | `id` PK; `match_id` → `matches.id` on delete cascade; `player_id` → `players.id` on delete cascade; `player_name` text not null; `player_number` text not null; unique (`match_id`, `player_id`)                                                                                                                                  | Keeps the name and number the player had when entering the call-up (RF-019, E-018)            |
| `marks`           | `call_up_entry_id` → `call_up_entries.id` on delete cascade; `column_kind` text check in ('period', 'overtime'); `column_number` integer; `mark` text check in ('starter', 'sub'); PK (`call_up_entry_id`, `column_kind`, `column_number`)                                                                                        | An empty cell has no row. Overtimes keep their number on a format change (RF-041)             |

- **Cascades** delete a team's players and matches (RF-015), a match's call-up and marks (RF-029), and a call-up entry's marks (RF-034). `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` are set when the database opens; neither takes user input.
- **Migrations:** `drizzle-kit generate` writes SQL files and `migrations.js` into `src/data/migrations/` (generated, excluded from ESLint and Prettier). `drizzle.config.ts` uses `dialect: "sqlite"` and `driver: "expo"`; Metro gets `sql` in `resolver.sourceExts` and Babel the `inline-import` plugin for `.sql`, as Drizzle's Expo guide says. `babel.config.js` and `metro.config.js` are created with `npx expo customize`. `verify.sh` already runs `drizzle-kit check` once `drizzle.config.ts` exists.
- **Opening and migrating:** `src/data/database.ts` opens the database with `openDatabaseSync` from `expo-sqlite`, wraps it with `drizzle()` from `drizzle-orm/expo-sqlite`, and runs `migrate()` from `drizzle-orm/expo-sqlite/migrator` once at start-up. The root layout keeps the splash screen until the migration ends.
- **Synchronous writes.** Repositories use Drizzle's synchronous API (`.run()`, `.all()`, `.get()`) on the expo-sqlite synchronous connection, inside `transaction()` when several rows change. A tap is on disk before the store publishes it (RF-082). The writes are one or two rows, so blocking the JavaScript thread for them is shorter than a frame; the US4 checkpoint measures it.
- **Repositories** (one file each; queries only through Drizzle with parameters):

| File                    | Functions (D2)                                                                                         | Added in D3                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `team-repository.ts`    | `createTeam`, `updateTeam`, `listTeams`, `getTeam`                                                     | `deleteTeam`, `countTeamContents`                                                             |
| `player-repository.ts`  | `createPlayer`, `listPlayers`                                                                          | `updatePlayer`, `setPlayerActive`                                                             |
| `match-repository.ts`   | `createMatch` (match and call-up snapshot in one transaction), `getMatch`                              | `listAllMatches`, `listTeamMatches`, `updateMatchDetails`, `deleteMatch`, `changeMatchFormat` |
| `call-up-repository.ts` | `addToCallUp`, `removeFromCallUp`, `createPlayerInMatch` (player and call-up entry in one transaction) | —                                                                                             |
| `grid-repository.ts`    | `loadGrid` (returns a domain `MatchGrid`), `saveCellChanges`, `addOvertime`, `removeLastOvertime`      | —                                                                                             |

- **Data tests** run in Jest on an in-memory SQLite database through `better-sqlite3` and `drizzle-orm/better-sqlite3`, applying the same generated SQL migrations. The repositories are typed against Drizzle's common synchronous SQLite database type, so the same code runs on both drivers. Each repository test covers its happy path, cascades, the "0"/"00" distinction, the snapshot of E-018, and a transaction rolled back halfway.

#### State (`src/state/`)

- **`database-ready.ts`** · `initializeDatabase(): Promise<void>`, called by the root layout.
- **`squad-store.ts`** (Zustand) · teams, the open team's players and matches; actions `createTeam`, `updateTeam`, `addPlayer`; derived duplicate numbers from the domain (RF-069).
- **`new-match-draft.ts`** · the form of a new match: fields, the selected players (all active ones at first, RF-030, RF-031) and the call-up range warning from the domain (RF-068); `createMatch()` saves it.
- **`match-session-store.ts`** (Zustand) · the open match:

```ts
interface MatchSession {
  readonly matchId: number | null;
  readonly grid: MatchGrid | null;
  readonly warnings: GridWarnings | null; // evaluateWarnings(grid), after every change (RF-060)
  readonly pending: PendingQuestion | null; // question waiting for the coach (D3 fills it)
  readonly undoStack: readonly UndoEntry[]; // memory only (RF-057, RF-082)
}
// actions: openMatch(id), closeMatch(), tapCell(cell), undo(),
//          addOvertime(), removeLastOvertime(), addToCallUp(playerId), removeFromCallUp(playerId)
```

- **Every action** follows the data flow of `docs/architecture.md`: ask the domain for the new grid, compute the cell changes (`cellChanges`, T033), write them with `saveCellChanges` in one transaction, then publish the grid and the new warnings. If the write throws, nothing is published (pending question 5).
- **Undo (RF-057).** Only mark changes push an entry: taps, menu choices, "remove anyway" and the starter replacement (one entry with its two cells). An entry holds the previous state of the changed cells, not a copy of the whole grid, so undo never brings back an overtime, a format or a call-up change. `revertCellChanges` (domain, T033) restores them, skipping cells whose column or player no longer exists (pending question 7) and never creating a sixth X. The stack belongs to the open match: `closeMatch()` empties it, and after a restart the store starts empty (E-019).
- **In D2, the questions** (`askSubOrStarter`, `chooseReplacedStarter`, `confirmRemoveStarter`) leave the grid unchanged, which is the same as "cancel". D3 (US5) adds the dialogs. Taps that do not need a question, including the circled X of RF-048 and RF-051, already work in D2.
- **Route parameters:** `src/state/route-params.ts` turns `teamId` and `matchId` into positive integers or `null`; an unknown ID shows the "not found" state and goes back, and no route parameter triggers a destructive action (`docs/security.md`).

#### Interface and navigation (`src/app/`, `src/ui/`)

**Screens (Expo Router, `Stack` in `src/app/_layout.tsx`).**

```text
/                                     index.tsx                 Teams list (RF-073) · new team · all matches (D3)
├─ /teams/new                         teams/new.tsx             Team form, modal (RF-013)
├─ /teams/[teamId]                    teams/[teamId]/index.tsx  Team: players sorted (RF-016), duplicate warning (RF-069), matches (D3, RF-075)
│  ├─ /teams/[teamId]/edit            .../edit.tsx              Edit team (RF-013); delete team (D3, RF-015)
│  ├─ /teams/[teamId]/players/new     .../players/new.tsx       New player, modal (RF-016)
│  ├─ /teams/[teamId]/players/[playerId]  .../[playerId].tsx    Edit, deactivate, reactivate (D3, RF-018, RF-022, RF-024)
│  └─ /teams/[teamId]/matches/new     .../matches/new.tsx       New match and call-up selection (RF-025–RF-027, RF-030, RF-031, RF-068)
├─ /matches                           matches/index.tsx         All matches (D3, RF-074)
└─ /matches/[matchId]                 matches/[matchId]/index.tsx    Grid, undo, overtimes, warnings
   ├─ /matches/[matchId]/call-up      .../call-up.tsx           Add and remove players (RF-032–RF-034)
   ├─ /matches/[matchId]/new-player   .../new-player.tsx        Player created from the match, modal (RF-035)
   └─ /matches/[matchId]/edit         .../edit.tsx              Details, format change, delete (D3, RF-028, RF-029, RF-038, RF-039)
```

- Modals use `Stack.Screen` with `presentation: "modal"`.
- The root layout loads `@/i18n`, keeps the splash screen with `expo-splash-screen` until `initializeDatabase()` ends, and in D3 wraps the app in `GestureHandlerRootView` if react-native-gesture-handler 3 still requires it (checked in its docs at T047).

**Components (`src/ui/`).** Typed props, no business logic, texts from `es.json`.

- `choice-dialog.tsx` · one dialog built on React Native `Modal` for every question and confirmation: title, message, options and «Cancelar». React Native's `Alert` is not used because on Android it allows at most three buttons, and the long-press menu and the replaced-X choice need more.
- `format-picker.tsx` · the three formats, «4 periodos», «6 periodos», «8 periodos» (RF-001).
- `team-form.tsx`, `player-form.tsx`, `match-form.tsx`, `call-up-selector.tsx`, `date-time-field.tsx` (pending question 3).
- `grid/grid-layout.ts` · pure size calculations, tested with the reference widths, not rules: cell width `max(44, ⌊(available width − player column) / period columns⌋)` and whether horizontal scroll is needed.
- `grid/match-grid.tsx`, `grid/player-column.tsx`, `grid/column-header.tsx`, `grid/grid-cell.tsx`.
- `warnings/*.tsx` · rule-impossible banner, call-up range banner, duplicate-number banner, legend (pending question 8).
- `theme/warning-colors.ts` · the light red and red, the minimal colour file of `docs/architecture.md`.

**Grid layout rules.**

- **Fixed player column (RF-077):** a vertical `ScrollView` holds a row with the player column (number, name and the counter «J 3 · D 3» below it) and a horizontal `ScrollView` with the header row and the cells. The header row scrolls with the cells; the player column never scrolls horizontally.
- **Cells ≥ 44 pt (RF-078):** the width comes from `grid-layout.ts`; when the columns do not fit at 44 pt, the horizontal `ScrollView` scrolls. Rows are at least 44 pt high.
- **375 pt reference (RF-079):** at 375 pt in portrait, 6 periods need 264 pt, which leaves about 100 pt for the player column after margins; long names are cut with an ellipsis. 4 and 6 periods fit; 8 periods and any overtime that does not fit scroll.
- **Landscape phone (RF-080):** 8 periods fit across from 667 pt; more players than fit scroll vertically.
- **Tablet (RF-081):** at 768 pt and above, every period fits; row height is computed so that 12 players fit without vertical scroll in both orientations; overtimes that do not fit scroll.
- `useWindowDimensions` recomputes the layout on rotation; `app.json` already has `orientation: "default"` and `supportsTablet: true`.

**Full journeys (Maestro, in `e2e/`).** One flow per story, plus one for the interruption of E-019 (`stopApp` and `launchApp`). Flows select elements by their Spanish text or by `testID`. The IDs they cover go in the flow's `name` (the traceability script reads YAML files and ignores `#` comments). Maestro is installed as a CLI tool on the Mac, not through npm, and is run by hand at each story checkpoint against a development build on the iOS simulator and the Android emulator; its output goes to `review.md`. It is not in `verify.sh`, because it needs a simulator.

### D3 · US5–US7 and closing

- **US5 (T044–T048):** the session store fills `pending` with the domain's questions and offers `answerSub()`, `answerStarter()`, `chooseReplaced(playerId)`, `confirmRemove()`, `cancelQuestion()` and `chooseCellMenuOption(choice)`. Cancelling leaves the grid as it was (RF-045). The starter replacement is one undo entry. The interface shows them with `choice-dialog.tsx`; the long press uses the long-press gesture of react-native-gesture-handler 3 (`useLongPressGesture` and `GestureDetector`, to be confirmed in its v3 docs at T047), and a long press on an empty cell does nothing (RF-052).
- **US6 (T049–T054):** `compareMatches` in the domain (date, then time, latest first, matches without a time last; RF-074). Repositories list all matches with the team name and category, and a team's matches. Editing details reuses `match-form.tsx`. A format change always shows `confirm.formatChange.*` (RF-039); on confirming, `changeFormat` from the domain and `changeMatchFormat` in one transaction (RF-040, RF-041). Deleting a match asks with `confirm.deleteMatch.*` (RF-029).
- **US7 (T055–T058):** edit a player's name and number (the snapshot keeps old matches unchanged, RF-019, E-018); deactivate with `confirm.deactivatePlayer.*` (RF-022), reactivate without asking (RF-024); a deactivated player shows «Desactivado» and is not offered in call-ups (RF-023). There is no action to delete a player (RF-021). Deleting a team shows `confirm.deleteTeam.*` with the numbers of players and matches that will be deleted (RF-015).
- **Closing (T059):** full verification, Codex and Security review of D3, a whole match on a device in airplane mode (RF-011), spec "Closed" (the traceability check then requires every RF and E of the spec), `summary.md` finished.

## New dependencies

Checked on 2026-11-11 in `package.json` and `package-lock.json`: `react-native-gesture-handler` 3.3.0 and `@expo/ui` 58.0.27 are already installed (from the template, deviation T004 of phase 0); `expo-sqlite`, `drizzle-orm`, `drizzle-kit`, `zustand` and `better-sqlite3` are not. D1 adds none. Versions are the ones Expo's SDK 58 docs recommend, or the npm `latest` when Expo does not manage the package; each is installed with `npx expo install` and the exact version is recorded in `package-lock.json`.

| Package                        | Delivery | Version                       | Type                     | Reason                                                                          | Alternative without dependency                                                                                                                    | Licence and maintenance                                     | Security review                                       |
| ------------------------------ | -------- | ----------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `expo-sqlite`                  | D2       | `~58.0.15` (Expo SDK 58 docs) | App                      | Store teams, players and matches on the device (ADR-001)                        | None that keeps queries and migrations; AsyncStorage was discarded in ADR-001                                                                     | MIT; maintained by Expo with each SDK                       | Yes: stores children's data                           |
| `drizzle-orm`                  | D2       | `0.45.4` (npm `latest`)       | App                      | Typed schema and parameterised queries, Expo migrator (ADR-001)                 | Hand-written SQL with `expo-sqlite` prepared statements and `PRAGMA user_version` migrations                                                      | Apache-2.0; active; peer `expo-sqlite >= 14`                | Yes                                                   |
| `drizzle-kit`                  | D2       | `0.31.11` (npm `latest`)      | Development              | Generate the SQL migrations from the schema; `drizzle-kit check` in `verify.sh` | Write each migration by hand                                                                                                                      | MIT; active                                                 | Yes                                                   |
| `babel-plugin-inline-import`   | D2       | `3.0.0` (npm `latest`)        | Development              | Bundle the `.sql` migrations into the app, as Drizzle's Expo guide requires     | A small script that turns each `.sql` file into a TypeScript string module after `drizzle-kit generate`                                           | MIT; last release 2018, very small, build time only         | Yes: unmaintained                                     |
| `zustand`                      | D2       | `5.1.0` (npm `latest`)        | App                      | Session of the open match and undo (ADR-001)                                    | `useReducer` with React context, discarded in ADR-001 because it makes undo and recalculation harder                                              | MIT; pmndrs, active                                         | Yes                                                   |
| `better-sqlite3`               | D2       | `13.0.3` (npm `latest`)       | Development              | Run repository and migration tests in Jest on a real SQLite database            | Node's built-in `node:sqlite` (experimental in Node 22), if the installed Drizzle has a driver for it; or test repositories only on the simulator | MIT; active; native addon with prebuilt binaries; Node ≥ 22 | Yes: native code                                      |
| `@types/better-sqlite3`        | D2       | npm `latest`                  | Development              | Types for the above                                                             | —                                                                                                                                                 | MIT; DefinitelyTyped                                        | Yes                                                   |
| `react-native-gesture-handler` | D3       | `~3.3.0`, already installed   | App                      | Long press on the cells (RF-052, ADR-001)                                       | React Native `Pressable` with `onLongPress`                                                                                                       | MIT; Software Mansion; Expo docs recommend `~3.3.0`         | No (already installed and audited in phase 0)         |
| `@expo/ui`                     | D2       | `~58.0.27`, already installed | App                      | Native date and time pickers, if pending question 3 is accepted                 | Text fields with validation                                                                                                                       | MIT; Expo                                                   | No (already installed)                                |
| Maestro                        | D2       | latest CLI                    | Tool on the Mac, not npm | Full journeys on the simulator (ADR-001)                                        | Only component tests                                                                                                                              | Apache-2.0; mobile.dev, active; needs Java 17               | Yes: tool installed with `brew` or its install script |

- `babel-preset-expo` is referenced by the new `babel.config.js`; it comes with `expo`, and if it does not resolve it is installed with `npx expo install babel-preset-expo -- --save-dev` (checked in T018).
- The ESLint boundaries already allow `expo-sqlite` and `drizzle-orm` only in `src/data/`; `better-sqlite3` is only imported by tests.

## Risks

| Risk                                                                                                 | Likelihood | Mitigation                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The "rule impossible" algorithm has a subtle bug in the lower-bound reduction                        | Medium     | Brute-force oracle with fast-check on small grids (T016); the four spec examples; mutation testing                                |
| Warnings plus a synchronous SQLite write are too slow on the 5th-gen iPad                            | Low        | Domain budget test in CI (T012); device measurement at T042; if needed, memoise warnings per grid or move writes off the tap path |
| Drizzle's Expo setup (inline-import plugin, Metro `sql`, RC versus stable) does not work with SDK 58 | Medium     | T018 is a short trial first; fallback: hand-written SQL migrations with `PRAGMA user_version`, recorded as a deviation            |
| `better-sqlite3` does not build on the Mac or in CI, or Drizzle types differ between drivers         | Medium     | Prebuilt binaries for Node 22; fallback `node:sqlite`; type repositories against the common synchronous SQLite type               |
| `babel-plugin-inline-import` is unmaintained                                                         | Medium     | Build-time only and tiny; Security reviews it; the fallback script is small                                                       |
| Codex flags requirements of later deliveries as missing                                              | High       | The delivery table states the scope; the reviewer notes those as out of the delivery in `review.md`                               |
| The traceability test counts fixture IDs as real tests                                               | Medium     | Fixtures created at run time in a temporary folder, test names without IDs (T001)                                                 |
| Spanish sorting differs between Node (Jest) and Hermes (device)                                      | Low        | `localeCompare` with `"es"`; tests with accents («Alevín A», «Cadete B»); check on the device                                     |
| The player column is too narrow at 375 pt with 6 periods                                             | Medium     | Ellipsis for long names; layout tests at 375, 667, 768 and 1024 pt; device check at T040                                          |
| The gesture-handler 3 API differs from what is known                                                 | Medium     | Read its v3 docs and types before T047; fallback `Pressable` `onLongPress`                                                        |
| Undo interacts badly with call-up, overtime and format changes                                       | Medium     | Undo stores cell changes, not snapshots; `revertCellChanges` skips missing cells and never makes a sixth X; property test in T033 |
| iOS backups include the children's names                                                             | Medium     | Pending question 6; Security decides in T018                                                                                      |
| SDK 58 needs iOS 16.4 and the 5th-gen iPad tops out at iPadOS 16.7                                   | Low        | Supported today; a future SDK may drop it, to be checked at each SDK update                                                       |
| Maestro needs Java and simulators and does not run in CI                                             | High       | Run by hand at each story checkpoint, with the output in `review.md`                                                              |

## Test strategy

- **Order in each task:** the Test designer writes the tests from the task's scenarios, sees them fail for the right reason, and only then the Implementer writes code (AGENTS.md, phase 6).
- **Names:** each test starts with the IDs it covers (`'RF-062 E-001: …'`), so the traceability script can follow them.
- **Domain (D1, and the domain tasks of D2 and D3):** Jest with `it.each` tables for requirements and boundaries; `spec-examples.test.ts` with E-001–E-018; fast-check properties; Stryker ≥ 80 % mutants killed and 90 % coverage, enforced by `verify.sh`.
- **Data:** Jest against in-memory SQLite (`better-sqlite3`) with the real migrations: cascades, transactions, snapshots, sort order, checks.
- **State:** Jest with the stores and an in-memory database: each action saves before publishing; undo scope; a new store after "restart" has the same grid and an empty undo stack (E-019).
- **Interface:** React Native Testing Library for components and screens (screens in `tests/app/`): what the user sees and taps, dialogs, cancel paths, warnings rendering, sizes from `grid-layout.ts` at 375, 667, 768 and 1024 pt.
- **Journeys:** Maestro flows per story and the interruption flow, at each checkpoint, on the iOS simulator and the Android emulator.
- **Device checks:** iPhone, 5th-gen iPad and Android, in portrait and landscape, at the US3, US4, US5 and closing checkpoints, recorded in `review.md`.
- **Scenarios** in every task cover happy path, boundaries, outside the rules, odd data, sequences, interruptions and mistakes (`docs/architecture.md`).

## Glossary additions (T002)

Added to `docs/architecture.md` before the code uses them (spec, "Terms").

| In the app (Spanish)       | Meaning                                                         | In the code                                    |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| Periodo libre              | A period after the rule window, or an overtime                  | `isRuleWindowColumn(...) === false`            |
| Cuadrícula                 | Players in rows, periods and overtimes in columns               | `MatchGrid`                                    |
| —                          | A period or overtime column of the grid                         | `Column`, `ColumnKey`                          |
| Casilla, casillas vacías   | One player in one column; a cell with no mark                   | `Cell`, `CellState` `"empty"`                  |
| Casilla en rojo claro      | Cell that should not be marked                                  | `lightRedCells`                                |
| Jugador en rojo            | Player breaking a minimum of the rule window                    | `playersInRed`                                 |
| Contador                   | Played and rested over the whole match                          | `PlayerCounter`                                |
| Categoría                  | Free-text category of a team                                    | `category`                                     |
| Variante por defecto       | Format of a team's new matches                                  | `defaultFormat`                                |
| Local, visitante           | Names of the two sides                                          | `homeName`, `awayName`                         |
| Resultado final            | Optional points of each side                                    | `homeScore`, `awayScore`                       |
| Notas                      | Free text of a match                                            | `notes`                                        |
| Desactivado                | Player not offered in new call-ups                              | `isActive: false`                              |
| Periodo incompleto         | Rule-window period with fewer than 5 X                          | `PeriodWarning` `"incomplete"`                 |
| Periodo incoherente        | Period with a sub and fewer than 5 X                            | `PeriodWarning` `"inconsistent"`               |
| Regla imposible de cumplir | No filling of the rule window meets everyone's minimums         | `isRuleImpossible`, `ruleImpossible`           |
| Rango de convocatoria      | Allowed number of players in the call-up                        | `callUpMin`, `callUpMax`, `CallUpRangeWarning` |
| Dorsal repetido            | Two active players of a team with the same number               | `duplicateNumbers`                             |
| Descansos posibles         | A player's empty cells in the rule window                       | `possibleRests`                                |
| —                          | A player's line in a match's call-up, with name and number kept | `CallUpEntry`                                  |
| Titular en lugar de otro   | Starter replacing someone else's X                              | `replaceStarter`                               |

## ADR

- **[ADR-004](../../docs/decisions/ADR-004-global-ids-and-deliveries.md) (Proposed):** three-digit, globally unique and never reused `RF` and `E` IDs, resolving pending finding C-10 of phase 0; spec 001 delivered in three deliveries (D1, D2, D3) with their own branches and PRs, after a documentation-only PR. It is accepted together with this plan.
- No other ADR is needed: expo-sqlite, Drizzle, Zustand, gesture-handler and Maestro are already in ADR-001 and the architecture stack. `better-sqlite3` and `babel-plugin-inline-import` are test and build tooling, recorded above with their reasons (rule 10).

## Deviations

| Date | What changes from the plan | Reason | Approved by |
| ---- | -------------------------- | ------ | ----------- |
| —    | None yet                   | —      | —           |
