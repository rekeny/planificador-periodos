# Plan · 001 Period planner v1

- **Spec:** [spec.md](spec.md) (RF-001–RF-088, E-001–E-032)
- **Level:** Large
- **Status:** Draft <!-- Draft | Approved -->
- **Approved by:** — <!-- name and date -->
- **ADR:** [ADR-004](../../docs/decisions/ADR-004-global-ids-and-deliveries.md) (Proposed)

## Explanation before running

- **What:** we build the whole of v1 of the app in three deliveries. **D1** is the "rules engine": the code that knows the regulations (which cells turn light red, which player is in red, when a sixth X is not allowed, what a tap does, what Undo reverts). It has no screens, only functions and tests. **D2** turns it into an app you can use in a match: teams, players, matches, call-up, the grid with undo and overtimes, every warning and its legend, all saved on the device at each tap and kept out of device backups. **D3** adds substitutions and the long-press menu, the match lists, editing and deleting matches, changing the format, and keeping the squad up to date, and then closes the spec.
- **How:**
  1. A documentation-only PR, from branch `001-planificador-v1-spec`, puts the spec, this plan, `tasks.md`, the phase 4 review and ADR-004 on `main`.
  2. **D1** (branch `001-planificador-v1-d1`, T001–T023): first the traceability script learns three-digit global IDs and the glossary gets the new terms, then the rules in `src/domain/`, one file per rule, with the spec examples as test tables, random-data properties and mutation testing.
  3. **D2** (branch `001-planificador-v1-d2`, T024–T061): the backup exclusion, the database (`src/data/`), the stores and the view model of the open match (`src/state/`), and the screens (`src/app/`, `src/ui/`) for US1–US4, with Maestro journeys on the simulator.
  4. **D3** (branch `001-planificador-v1-d3`, T062–T079): US5–US7 in the same layers, and the closing task.
  5. Before D2 and D3 start, this plan is reviewed with what we learned, and you approve it again.
- **Why:**
  - The rules go first and on their own because they are the heart of the app and the hardest part to get right (above all "rule impossible to meet" and Undo after the grid changes shape). With no screens in the way, every example of the spec becomes a test that a machine checks.
  - Three PRs instead of one: each one is small enough for Codex to review well, and after D2 you already have an app you can try in a real match.
  - "Rule impossible to meet" is solved as a flow problem (like water through pipes with minimum and maximum widths) instead of trying every combination: trying them all can mean 2⁷² cases, while the flow answers in microseconds and is exact.
  - The state layer publishes a ready-made "view" of the match (columns, cells, colours, counters, sorted players, legend), so the screens only draw it and never call a rule.
  - The Undo history lives as long as the match screen does. Opening the match's call-up, a new player or its details puts a screen on top of the grid, and the grid stays underneath, so Undo still works when you come back; only going back out of the match removes the grid screen and empties the history (D48). Emptying it whenever the grid is hidden was discarded, because it would break E-026.
  - Discarded: one branch for the whole spec (too big), one branch per story (seven PRs, and US1–US4 are not usable separately), saving the grid with a "Save" button (it breaks principle 4), a Babel plugin to bundle the migrations (unmaintained since 2018; a small script of our own does the same job).
- **To learn:**
  - **TypeScript:** union types with a `kind` field (a tap returns "changed", "ask sub or starter" or "confirm removal"), `readonly` types, template literal types for keys such as `P3`, type guards, and `import type`.
  - **Tests:** `it.each` tables, fast-check properties and a brute-force oracle, Stryker mutants and coverage, React Native Testing Library, Maestro flows.
  - **Algorithms:** maximum flow with lower and upper bounds, for "rule impossible to meet".
  - **Data:** SQLite tables, foreign keys with cascade delete, transactions, Drizzle schemas and generated migrations.
  - **State:** a Zustand store, actions, a view model, and an undo history.
  - **Expo and React Native:** Expo Router dynamic routes (`[teamId]`) and `useLocalSearchParams`, Stack screens and modals, what happens to a screen when another is pushed on top (it stays mounted) and when it is popped (it unmounts, and the cleanup of its `useEffect` runs), screen tests with `renderRouter` from `expo-router/testing-library`, `Modal` and its `onRequestClose` for the Android Back button, `useWindowDimensions` for phone and tablet in both orientations, horizontal `ScrollView` with a fixed column, long press with react-native-gesture-handler 3, native date and time pickers from `@expo/ui`, and a config plugin that writes native settings (Android backup rules, iOS backup exclusion).
- **To check it:**
  - **D1:** `npm run verify` green, including mutation testing; read `src/domain/spec-examples.test.ts`, where each domain example of the spec is one row of a table.
  - **D2:** on iPhone, iPad and Android, in portrait and landscape: create a team with players, create a match, plan the periods, open the call-up and come back to check that Undo still reverts your last mark, see the warnings and the legend, close the app halfway and reopen it. Maestro journeys green. On the simulator, the database folder carries the "excluded from backup" mark.
  - **D3:** record substitutions, use the long press (and its «Cancelar»), press the Android Back button with a question open, change the format in the match details and leave without «Guardar» to see that the new format stays, edit and delete matches, deactivate players and delete a team; finally, a whole match with airplane mode on.
- **Pending:** one approval. The five texts that review P-23 added to the spec (the accessible labels of the three cell states `grid.cell.*`, the empty list of players to add `callUp.addEmpty` and the missing-route message `notFound.message`) are a proposal that you approve together with this plan. Every doubt is answered: confirmations close only with their buttons, the Android Back button, legend visibility and a new match without a time (D44–D47); what "leaving the match" means for Undo, vertical scroll on a tablet with more than 12 players, and the format change saved at once in the match details (D48–D50).

### Decisions taken while planning

All of them are recorded in the spec; the plan only follows them.

1. **Number order and "07":** sorted by numeric value, "0" before "00", then by name; "07" is not valid (RF-016, RF-042, E-020, E-021).
2. **Input limits:** 40 characters for names and category, 500 for notes, scores 0–999; a field at its limit stops accepting text with no message (RF-013, RF-016, RF-025, E-022).
3. **Date and time:** native pickers of `@expo/ui`, date «01/03/2026», time «18:30», «Quitar hora» (RF-083, E-023, E-032).
4. **Format in the new-match form:** filled with the team default and changeable without confirmation (RF-084, E-024).
5. **Save failure:** the change is not applied and `error.saveFailed` is shown (RF-085, E-025).
6. **Backups:** the data is kept out of iOS backups and out of Android backup and device-to-device transfer, decided now and configured in D2 (RF-088, E-028; see "Backup exclusion").
7. **Undo after a structural change:** missing cells are skipped; an action with no cell left is discarded and the same press goes on (RF-057, RF-086, E-026, E-031).
8. **Warning marks:** «!» and «≠» in the headers, and a legend of the visible marks (RF-065, RF-066, RF-087, E-027).
9. **Drizzle:** the stable 0.45 line, not the 1.0 release candidate; accepted by Fernando on 2026-11-11.
10. **Confirmations:** only explicit buttons close them; tapping outside and the Android Back button do nothing (RF-015, RF-022, RF-029, RF-034, RF-039, RF-059; D44, D46).
11. **A new match starts with no time** (RF-025: only the format and the date have a default).
12. **Leaving the match:** only going back out of it empties the Undo history; its call-up, new-player and details screens keep it (RF-057, D48; see "Leaving the match").
13. **Tablet with more than 12 players:** every period still fits across and the grid scrolls vertically (RF-081, D49).
14. **Format change in the match details:** saved at once when confirmed, outside «Guardar» (RF-039, RF-082, D50; see "US6").

## Constitution check

| Principle                              | Met? | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inform, never block                 | Yes  | Every domain function returns a result instead of refusing. The only refusal is the sixth X, enforced in `src/domain/marking.ts` and `src/domain/undo.ts` and checked by a fast-check property over any sequence of actions (RF-055). Call-up outside the range, broken rules and duplicate numbers only produce warnings. **Known D2 gap, on purpose:** in D2 a tap on an empty cell of a full rule-window period, and a tap on an X in a period with a sub, do nothing yet, because their question and reminder arrive with US5 in D3; nothing is blocked for good, and D2's checkpoint states it. |
| 2. Nothing changes by itself           | Yes  | Domain functions only touch the cells the coach acted on; a property test checks that no other cell changes (RF-054). Removing marks (format change, call-up removal, overtime with marks, team or match deletion) always goes through a confirmation that closes only with its buttons.                                                                                                                                                                                                                                                                                                             |
| 3. Offline and no data leaving         | Yes  | SQLite on the device. No new dependency makes network calls; ESLint already forbids `fetch` and friends. RF-011 is checked with airplane mode in the closing task.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4. Every tap is saved at once          | Yes  | Each state action writes to SQLite synchronously, in a transaction, before publishing the new state; forms are saved with «Guardar» (RF-082), except the confirmed format change in the match details, which is saved at once (D50). A failed write publishes nothing (RF-085). Maestro closes and reopens the app in the middle of a match (E-019) and of a form (E-029).                                                                                                                                                                                                                           |
| 5. Children's data                     | Yes  | Names only in the device database; no `console` in `src/`. Backups decided now (RF-088): `android.allowBackup: false` is kept, and a versioned config plugin (`plugins/with-backup-exclusion.js`) adds Android data extraction rules that exclude every domain from cloud backup and device-to-device transfer, plus full-backup rules for Android 11 and lower, and marks the iOS database folder as excluded from iCloud and computer backups at launch. Security audits it in T026 and `docs/security.md` records it (T025 and T026).                                                             |
| 6. Simple                              | Yes  | Five tables, no versions of the plan, undo only in memory. Nothing is generalised beyond the three formats, which are data in one table. The dialog gets its "tap outside cancels" mode only in D3, when the first question needs it.                                                                                                                                                                                                                                                                                                                                                                |
| 7. In Spanish                          | Yes  | Every text from the approved table of the spec goes to `src/i18n/es.json`; ESLint forbids loose text in JSX. The save-failure message uses an inline banner, so no new text is needed. The texts the screens need beyond the first approved set (the accessible labels `grid.cell.*`, the empty list `callUp.addEmpty` and the missing-route `notFound.message`, review P-23) are in the spec's table, proposed and approved together with this plan.                                                                                                                                                |
| 8. The repository is the source        | Yes  | Spec, plan, tasks, ADR-004, reviews and summaries are versioned; the documentation PR puts them on `main` before any code. The native backup settings live in the versioned config plugin, not in `ios/` or `android/`.                                                                                                                                                                                                                                                                                                                                                                              |
| 9. A single rules file                 | Yes  | No rule is added outside `AGENTS.md`; ADR-004 changes its branch rule there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10. Machines check and people decide   | Yes  | Traceability is extended to three-digit global IDs and duplicate IDs (T001, T002); `drizzle-kit check`, the bundled-migrations check, coverage and Stryker run in `verify.sh`. The few IDs that only a device can prove are listed in "Test strategy". Fernando approves the plan before each delivery.                                                                                                                                                                                                                                                                                              |
| 11. Whoever writes does not review     | Yes  | Codex reviews each delivery with `scripts/review.sh`; Security audits D2 (dependencies, backups, data, navigation) and D3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 12. Nothing is invented                | Yes  | The planning decisions 1–8 are recorded in the spec (RF-083–RF-088, E-020–E-032, clarifications up to D50, and the P-23 texts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 13. Process proportional to the change | Yes  | Large level, full flow, split into three deliveries (ADR-004).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 14. Small, checkable steps             | Yes  | 79 tasks of at most three hours, one commit each, `verify.sh` green after each.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 15. Nothing is coded without approval  | Yes  | The plan is Draft; D1 starts only after approval, and D2 and D3 after a new approval.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 16. Rules only in `src/domain/`        | Yes  | All regulation rules, warnings, the legend items, the counter, marking, undo and format change are domain functions. `src/state/` assembles them into a view model; `src/ui/grid/grid-layout.ts` only computes sizes. `src/ui/` and `src/app/` import only types from the domain.                                                                                                                                                                                                                                                                                                                    |
| 17. A single code style                | Yes  | The existing layers, ESLint boundaries and glossary. Code names follow the glossary (`Player`, `Team`, `Match`, `CallUp`, `Format`, `Period`, `Overtime`, `RuleWindow`, `Mark`, `Warning`); new terms are added to the glossary in T003 before they are used. The folders the plan adds outside `src/` are listed in the "Structure" of `docs/architecture.md` (review P-28, ADR-004). Generated migrations are excluded from lint and formatting.                                                                                                                                                   |
| 18. Tests look for bugs                | Yes  | Scenarios of every kind per task; spec examples as tables; a brute-force oracle against the flow algorithm on realistic grids of the three formats; 90 % coverage and 80 % of mutants in `src/domain/`; Maestro for full journeys.                                                                                                                                                                                                                                                                                                                                                                   |
| 19. Explain before and after           | Yes  | This section, and a `summary.md` section after each delivery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Deliveries

| Delivery          | Branch                     | PR                                       | Tasks     | Checkpoint                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | -------------------------- | ---------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation     | `001-planificador-v1-spec` | "001: specification, plan and ADR-004"   | —         | Spec and plan "Approved", ADR-004 "Accepted", `AGENTS.md` branch rule updated, `review.md` with the phase 4 analysis. No code.                                                                                                                                                                                                                                                        |
| D1 · Rules engine | `001-planificador-v1-d1`   | "001 D1: rules engine"                   | T001–T023 | Spec "In progress" (T001); `verify.sh` green with mutation testing (≥ 80 % mutants, ≥ 90 % coverage of `src/domain/`) and the mutation run time recorded; every domain example green; Codex without blocking findings. The app looks the same.                                                                                                                                        |
| D2 · Match-ready  | `001-planificador-v1-d2`   | "001 D2: teams, matches, grid, warnings" | T024–T061 | US1–US4 checkpoints met; backup exclusion audited by Security; Maestro flows green; Fernando plans a real match on iPhone, iPad and Android; Codex and Security without blocking findings. Known limit until D3: in a rule-window period with 5 X, a tap on an empty cell, and a tap on an X when the period has a sub, do nothing yet (their question and reminder arrive with US5). |
| D3 · Rest of v1   | `001-planificador-v1-d3`   | "001 D3: subs, matches, squad"           | T062–T079 | US5–US7 checkpoints met; closing task done; spec "Closed"; Fernando accepts the result.                                                                                                                                                                                                                                                                                               |

- Each delivery runs phases 5 to 8 for its own tasks: the Test designer writes scenarios and red tests task by task, the Implementer makes them pass, the Verifier records the output, and Codex and Security review the delivery's PR.
- **When D2 and D3 start,** the Planner reviews that delivery's part of this plan and of `tasks.md` with the lessons of the previous one (what took longer, what the reviews found), records the changes in "Deviations", and Fernando approves again. That approval is recorded in "Approved by" with the delivery.
- `summary.md` gets one section per delivery; the closing task T079 completes it.
- The traceability check only requires tests for the IDs of ticked tasks while the spec is "In progress", so each delivery's PR is green with its own tasks.

## Design

### D1 · Rules engine (`src/domain/`)

**First tasks (T001 and T002).** In T001, `scripts/check-traceability.mjs` changes to three-digit global IDs (`RF-\d{3}`, `E-\d{3}`) and fails when the same ID is defined in two `spec.md` files (ADR-004). Today its pattern `\bE-\d{2}\b` does not match `E-001` at all, so without this task no example of spec 001 would be checked. Its test lives in `tests/scripts/check-traceability.test.ts` (Jest), which runs the script with `child_process` against fixture folders created at run time in a temporary directory. The fixtures are written at run time, and the test names carry no IDs, because the script reads every test name under `tests/`: a fixture file or a test name containing `RF-001` would count as a real test. T001 also sets the spec status to "In progress". In T002, `docs/architecture.md` (conventions, traceability table, `E-01` examples), the spec and tasks templates, and the specifier and test-designer roles are updated to `E-001`; the specifier role also gets the rule "look up the highest `RF` and `E` used in `specs/` before numbering". The two were one task before review P-27 split them to keep each within three hours.

**Glossary (T003).** The terms of "Glossary additions" below go into `docs/architecture.md` before any code uses them. This is the only documentation change of D1 besides T001's and T002's.

**Files.** One responsibility per file, all pure, no imports from outside `src/domain/`.

| File                              | Contents                                                                  | Requirements                                   |
| --------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `format.ts`                       | Formats and their rule windows as data, the 5-X limit                     | RF-001–RF-006                                  |
| `column.ts`                       | Periods and overtimes as columns; rule window                             | RF-002, RF-006, RF-042                         |
| `squad.ts`                        | `Team`, `Player`, `Match` types and their IDs                             | RF-013, RF-016, RF-025                         |
| `player-order.ts`                 | Sorting by number and name                                                | RF-016, RF-042                                 |
| `grid.ts`                         | Call-up entries, the grid, cells and marks; read helpers                  | RF-019, RF-042, RF-043                         |
| `marking.ts`                      | Tap, sub, starter replacement, removal                                    | RF-044–RF-051, RF-054, RF-055                  |
| `cell-menu.ts`                    | Long-press menu                                                           | RF-052, RF-053                                 |
| `counter.ts`                      | Played and rested over the match                                          | RF-007–RF-009, RF-070, RF-071                  |
| `rule-window.ts`                  | Window statistics, light red cells, player in red                         | RF-062–RF-064, RF-072                          |
| `rule-feasibility.ts`             | "Rule impossible to meet"                                                 | RF-067                                         |
| `bounded-flow.ts`                 | Maximum flow with lower bounds, used only by `rule-feasibility.ts`        | RF-067                                         |
| `period-warnings.ts`              | Incomplete and inconsistent periods                                       | RF-065, RF-066                                 |
| `call-up-range.ts`                | Call-up outside the range                                                 | RF-005, RF-010, RF-068                         |
| `warnings.ts`                     | All warnings of a grid in one result                                      | RF-060, RF-061                                 |
| `legend.ts`                       | Which legend items are shown                                              | RF-087                                         |
| `overtime.ts`                     | Add and remove overtimes                                                  | RF-058, RF-059                                 |
| `format-change.ts`                | Effect of changing the format                                             | RF-038, RF-040, RF-041                         |
| `call-up.ts`                      | Initial call-up, snapshot of name and number, adding and removing players | RF-019, RF-023, RF-030–RF-034                  |
| `duplicate-numbers.ts`            | Duplicate-number warning                                                  | RF-017, RF-069                                 |
| `undo.ts`                         | Cell changes, undo history, revert with skipped cells                     | RF-055, RF-057, RF-086                         |
| `spec-examples.test.ts`           | Every domain example as one `it.each` table                               | E-001–E-018, E-020, E-026, E-027, E-030, E-031 |
| `grid.properties.test.ts`         | fast-check properties on random grids                                     | RF-060, RF-061, RF-070–RF-072                  |
| `actions.properties.test.ts`      | fast-check properties on random sequences of actions                      | RF-054, RF-055, RF-057, RF-086                 |
| `rule-feasibility.oracle.test.ts` | Flow algorithm against brute force                                        | RF-003, RF-004, RF-067                         |
| `warnings.budget.test.ts`         | Performance budget, kept out of mutation runs                             | RF-060                                         |

**Types.** Signatures are the contract; names follow the glossary (new terms added in T003).

```ts
// format.ts
export type Format = 4 | 6 | 8;
export interface RuleWindow {
  readonly periodCount: number; // 3 | 5 | 6  (RF-002)
  readonly minPlayed: number; //   1 | 2 | 2  (RF-003)
  readonly minRested: number; //   1 | 2 | 2  (RF-004)
}
export interface FormatRules {
  readonly periodCount: number; // 4 | 6 | 8
  readonly ruleWindow: RuleWindow;
  readonly callUpMin: number; //   8 | 9 | 8  (RF-005)
  readonly callUpMax: number; //   12         (RF-005)
}
export const FORMATS: readonly Format[]; // [4, 6, 8] (RF-001)
export const FORMAT_RULES: Readonly<Record<Format, FormatRules>>;
export const MAX_STARTERS_PER_PERIOD = 5; // RF-055
export function isFormat(value: number): value is Format;

// column.ts
export interface Period {
  readonly kind: "period";
  readonly number: number;
}
export interface Overtime {
  readonly kind: "overtime";
  readonly number: number;
}
export type Column = Period | Overtime;
export type ColumnKey = `P${number}` | `OT${number}`;
export function columnKey(column: Column): ColumnKey;
export function gridColumns(
  format: Format,
  overtimeCount: number,
): readonly Column[]; // periods, then overtimes
export function ruleWindowColumns(format: Format): readonly Period[];
export function isRuleWindowColumn(format: Format, column: Column): boolean; // false = free period (RF-006)

// squad.ts
export type TeamId = number;
export type PlayerId = number;
export type MatchId = number;
export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: Format;
}
export interface Player {
  readonly id: PlayerId;
  readonly teamId: TeamId;
  readonly name: string;
  readonly number: string; // "0"–"99" and "00"; "0" !== "00" (RF-016)
  readonly isActive: boolean;
}
export interface Match {
  readonly id: MatchId;
  readonly teamId: TeamId;
  readonly format: Format;
  readonly date: string; //          YYYY-MM-DD
  readonly time: string | null; //   HH:MM, 24 hours; a new match has none
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly notes: string | null;
  readonly overtimeCount: number;
}

// player-order.ts
export function comparePlayers(
  a: Pick<Player, "name" | "number">,
  b: Pick<Player, "name" | "number">,
): number; // numeric value, then "0" before "00", then name in Spanish order (RF-016, E-020)

// grid.ts
export type CallUpEntryId = number;
export interface CallUpEntry {
  readonly id: CallUpEntryId; // one per stay in the call-up: a re-added player gets a new one
  readonly playerId: PlayerId;
  readonly name: string; //   as when the player entered the call-up (RF-019)
  readonly number: string;
}
export type CallUp = readonly CallUpEntry[];
export type Mark = "starter" | "sub"; // X and circled X
export type CellState = Mark | "empty";
export interface Cell {
  readonly entryId: CallUpEntryId;
  readonly column: Column;
}
export type CellKey = `${CallUpEntryId}:${ColumnKey}`;
export interface MatchGrid {
  readonly format: Format;
  readonly overtimeCount: number;
  readonly callUp: CallUp; // rows, sorted with comparePlayers (RF-042)
  readonly marks: Readonly<Partial<Record<CellKey, Mark>>>; // a missing key is an empty cell
}
export function cellKey(cell: Cell): CellKey;
export function cellExists(grid: MatchGrid, cell: Cell): boolean;
export function cellState(grid: MatchGrid, cell: Cell): CellState;
export function starterCount(grid: MatchGrid, column: Column): number;
export function hasSub(grid: MatchGrid, column: Column): boolean;
```

- **Rows are keyed by call-up entry, not by player (review P-18).** A player removed from the call-up and added again gets a new `CallUpEntry` with a new `id`, so an old undo entry can never put marks on the new row: its cells point to the old entry, which no longer exists, and RF-086 skips them. The alternative, clearing the undo history when a player is removed, was discarded because it breaks E-026: after removing Eva, Undo must still revert Ana's cell. The `marks` table already hangs from `call_up_entries`, so data and domain use the same key.

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
// empty + < 5 X               → changed: X                    (RF-044)
// empty + 5 X + rule window   → askSubOrStarter               (RF-045)
// empty + 5 X + free/overtime → changed: circled X           (RF-048)
// X + no sub in the column    → changed: empty                (RF-049)
// X + some sub                → confirmRemoveStarter          (RF-050)
// circled X                   → changed: empty                (RF-051)
// cell not in the grid        → unchanged

export function markSub(grid: MatchGrid, cell: Cell): MatchGrid; // answer "sub" (RF-046)
export function replaceableStarters(
  grid: MatchGrid,
  column: Column,
): readonly CallUpEntryId[];
export function replaceStarter(
  grid: MatchGrid,
  cell: Cell,
  replaced: CallUpEntryId,
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

**Counter, warnings, the rule window and the legend.**

```ts
// counter.ts
export interface PlayerCounter {
  readonly played: number; // X in every column, overtimes included (RF-070)
  readonly rested: number; // empty cells in every column; circled X adds to neither (RF-071)
}
export function playerCounter(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): PlayerCounter;

// rule-window.ts — only rule-window columns (RF-072)
export interface WindowStats {
  readonly played: number; //        X in the window
  readonly possibleRests: number; // empty cells in the window (RF-062)
}
export function windowStats(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): WindowStats;
export function isRuleWindowComplete(grid: MatchGrid): boolean; // every window column has 5 X
export function lightRedCells(grid: MatchGrid): readonly Cell[]; // empty window cells of players with possibleRests ≤ minRested
export function playersInRed(grid: MatchGrid): readonly CallUpEntryId[];
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
  readonly format: Format;
  readonly min: number;
  readonly max: number;
  readonly count: number;
}
export function callUpRangeWarning(
  format: Format,
  count: number,
): CallUpRangeWarning | null; // RF-068

// warnings.ts — recomputed by the state layer after every change (RF-060)
export interface Warnings {
  readonly lightRedCells: ReadonlySet<CellKey>;
  readonly playersInRed: ReadonlySet<CallUpEntryId>;
  readonly periodWarnings: Readonly<Partial<Record<ColumnKey, PeriodWarning>>>;
  readonly ruleImpossible: boolean;
  readonly callUpRange: CallUpRangeWarning | null;
}
export function evaluateWarnings(grid: MatchGrid): Warnings; // nothing set = everything white (RF-061)

// legend.ts
export type LegendItem =
  "lightRedCell" | "playerInRed" | "incompletePeriod" | "inconsistentPeriod";
export function legendItems(warnings: Warnings): readonly LegendItem[];
// only the marks present in the grid, in this fixed order; empty = no legend (RF-087, E-027)
```

**Overtimes, format change, call-up and undo.**

```ts
// overtime.ts
export function addOvertime(grid: MatchGrid): MatchGrid; // RF-058
export function lastOvertimeHasMarks(grid: MatchGrid): boolean; // decides the confirmation (RF-059)
export function removeLastOvertime(grid: MatchGrid): MatchGrid; // removes its marks; no-op without overtimes

// format-change.ts
export function changeFormat(grid: MatchGrid, format: Format): MatchGrid;
// keeps marks in periods that still exist, drops the rest; overtimes and their marks kept (RF-040, RF-041);
// the same format returns the same grid. Whether to ask is decided by state (RF-039).

// call-up.ts
export type NewCallUpEntry = Omit<CallUpEntry, "id">; // the id comes from the database
export function callUpEntryFor(player: Player): NewCallUpEntry; // snapshot of name and number (RF-019, E-018)
export function initialCallUp(players: readonly Player[]): readonly Player[]; // active only, sorted (RF-030)
export function playersToAdd(
  players: readonly Player[],
  callUp: CallUp,
): readonly Player[]; // active and not yet in, sorted (RF-023, RF-032)
export function addToCallUp(grid: MatchGrid, entry: CallUpEntry): MatchGrid; // new empty row, order kept (RF-042)
export function entryHasMarks(grid: MatchGrid, entryId: CallUpEntryId): boolean; // decides the confirmation (RF-033, RF-034)
export function removeFromCallUp(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): MatchGrid; // row and marks gone (RF-034, E-017)

// duplicate-numbers.ts
export function duplicateNumbers(players: readonly Player[]): readonly string[]; // active only (RF-069)

// undo.ts
export interface CellChange {
  readonly cell: Cell;
  readonly state: CellState; // the state to write
}
export type UndoEntry = readonly CellChange[]; // the previous states of the cells one action changed
export function cellChanges(
  before: MatchGrid,
  after: MatchGrid,
): readonly CellChange[]; // the new states, what to save
export function undoEntryFor(before: MatchGrid, after: MatchGrid): UndoEntry; // the old states, what Undo restores
export function pruneHistory(
  history: readonly UndoEntry[],
  grid: MatchGrid,
): readonly UndoEntry[]; // drops cells that no longer exist, then empty entries (RF-086)
export interface UndoResult {
  readonly grid: MatchGrid;
  readonly history: readonly UndoEntry[];
  readonly changes: readonly CellChange[]; // what to save; empty when nothing was left to undo
}
export function undoLast(
  grid: MatchGrid,
  history: readonly UndoEntry[],
): UndoResult;
// pops entries until one still has a cell in the grid, reverts its surviving cells, never makes a sixth X (RF-057, RF-086, E-026, E-031)
```

- **Why prune the history.** `pruneHistory` runs right after every change that removes rows or columns (call-up removal, overtime removal, format change), so a column that disappears and later comes back (an overtime removed and added again, or a format changed 8 → 4 → 8) is a new column for Undo, exactly as a re-added player is a new row. `undoLast` also skips missing cells, so both paths give the RF-086 behaviour, and E-026 and E-031 hold.

**"Rule impossible to meet" (RF-067).** The definition asks whether the empty cells of the rule window can be filled with X, keeping every existing X and circled X, so that every window period ends with exactly 5 X and every player in the call-up reaches both minimums.

- For each window period `p`, the X still missing are `d(p) = 5 − X(p)`.
- For each player `i` with `a(i)` X and `e(i)` empty cells in the window, if `k(i)` X are added, they end with `a(i) + k(i)` played and `e(i) − k(i)` rested. Both minimums hold exactly when `L(i) = max(0, minPlayed − a(i)) ≤ k(i) ≤ U(i) = e(i) − minRested`.
- That is a bipartite flow with bounds: source → player `i` with bounds `[L(i), U(i)]`; player `i` → period `p` with capacity 1 when the cell is empty; period `p` → sink with bounds `[d(p), d(p)]`. A filling exists exactly when this network has a feasible flow.
- `bounded-flow.ts` solves it with the standard reduction: subtract the lower bounds, add a super-source and super-sink with the resulting excesses and a return edge sink → source, and run augmenting paths (Edmonds–Karp, breadth-first search). The rule is impossible when the maximum flow does not saturate the super-source. If some `U(i) < L(i)`, it is impossible straight away.
- **Why this algorithm.** It is exact for this definition and its cost does not depend on the number of combinations. The largest case planned (12 players × 6 window periods, and more players if the call-up exceeds 12, RF-010) has at most about 22 nodes, about 100 edges and a total flow of at most 30 (6 periods × 5 X), so the work is a few thousand steps. A search over fillings with pruning was discarded: the number of fillings grows as `C(12,5)⁶ ≈ 10¹⁷` in the worst case, and good pruning is harder to prove correct than the flow. A closed formula (Gale–Ryser style) was discarded because the bounds on both sides and the unavailable cells make it easy to get wrong.
- **How we know it is right (review P-06).** The examples E-003, E-004, E-006, E-007, E-015 and E-030, and a brute-force oracle in `rule-feasibility.oracle.test.ts` that enumerates every filling and must agree with the flow. Small grids would prove nothing (with 5 players or fewer the rule is always impossible), so the oracle uses realistic grids:
  - all three formats, with call-ups from the format minimum to 13 players (4 periods: 8–13; 6 periods: 9–13; 8 periods: 8–13), so that the minimums of 2 are exercised;
  - mostly pre-filled windows: each window period has 5 X minus 0, 1 or 2, with at most 4 X missing in the whole window, plus random circled X in the empty cells, so that brute force only chooses where the few missing X go (a few thousand fillings at most);
  - two generators: a **mixed** one (random players for each X), whose outcomes must include both "possible" and "impossible" (a fixed-seed test asserts at least 20 % of each); and a **possible by construction** one, which starts from a complete valid window (X assigned in cyclic order, which always meets both minimums for in-range call-ups), removes up to 4 X and adds circled X only in cells that were empty in that valid window, so the flow must answer "possible".
- Checked against the spec: E-003 (Juan has 1 empty cell, `U = 1 − 2 < 0`), E-004 (window complete, Pedro needs `L = 1` and no X is missing), E-006 (one X missing for two players with `L = 1`), E-007 (5 X missing, ten players with `U = 1`, feasible), E-015 (8 players give at most 24 of the 25 X) and E-030 (13 players need at least 26 played).

**Performance target.** Warnings are recomputed after every tap, and the slowest device is a 5th-generation iPad (A9, iPadOS 16.7; SDK 58 needs iOS 16.4 or later, so it is supported).

- **Domain budget, checked in CI (T014):** in `warnings.budget.test.ts`, 500 calls of `evaluateWarnings` on the worst planned grid (8 periods, 3 overtimes, 13 players, random marks) take less than 2.5 seconds in Jest with coverage instrumentation, that is, under 5 ms per call. The expected value without instrumentation is well under 0.5 ms; the wide margin keeps the test stable on a busy runner with coverage on, and it still catches any algorithm that grows with the number of combinations.
- **Device budget, checked by hand at the US4 checkpoint (T060):** on the 5th-gen iPad with a release build, from a tap to the repainted grid and warnings, under 100 ms (no visible lag), with 12 players and 8 periods, measured with the React profiler and 20 fast taps.

**Tests of D1.** `spec-examples.test.ts` has every domain example (E-001–E-018, E-020, E-026, E-027, E-030 and E-031) as one `it.each` table, each row named with its example and requirements (`'E-003 RF-004 RF-062 RF-063 RF-067: …'`); for the examples that state the whole grid, the row asserts that no other warning is shown. E-019, E-021–E-025, E-028, E-029 and E-032 belong to the D2 and D3 stories (input validation, date display, forms, the database or a device), so they are tested in the tasks of those stories. Each file also has its own requirement tests with boundaries. Properties with fast-check, in three tasks (review P-27 split the old single task). The random-grid and random-action generators are shared by T020 and T021, so they live in `tests/support/grid-arbitraries.ts`: files in `src/domain/` that are not tests may not import fast-check, and `tests/` counts as test code for ESLint and stays out of coverage.

- **On random grids (T020, `grid.properties.test.ts`):**
  - `evaluateWarnings` is deterministic, and every warning it reports is justified: each light red cell is an empty rule-window cell of a player whose possible rests are at or below the minimum, each player in red breaks a minimum, and nothing ever points at a free period or an overtime (RF-060, RF-061, RF-072). Separately, an example: a complete 8-period window with 12 players, each with 2 or 3 X, no sub, reports no warning at all (RF-061);
  - played + rested + circled X = number of columns, for every player (RF-070, RF-071).
- **On random sequences of actions (T021, `actions.properties.test.ts`)** (taps, menu choices, answers, undos, overtimes, format changes and call-up changes, from one shared action generator):
  - no column ever has more than 5 X, also after any number of undos (RF-055);
  - a tap or menu choice changes only the tapped cell, or exactly the two cells of a starter replacement (RF-054);
  - Undo never writes into a row or a column that was removed and created again (RF-057, RF-086).
- **Against brute force (T022, `rule-feasibility.oracle.test.ts`):** `isRuleImpossible` agrees with the oracle (RF-067, see above).

**Mutation testing within the CI limit (review P-08).** The CI job has `timeout-minutes: 30`, and with `coverageAnalysis: "perTest"` Stryker reruns every test that covers a mutant. T014 sets up:

- `jest.stryker.config.js`, used only by Stryker: it runs only `src/domain/**/*.test.ts` (no data, state or interface tests in the dry run), ignores `*.budget.test.ts` (timing has no place under mutation), and loads `tests/setup/fast-check-mutation.ts`, which sets `fc.configureGlobal({ numRuns: 100 })`.
- `tests/setup/fast-check.ts`, loaded by `jest.config.js`, sets `numRuns: 1000` for normal runs. Properties never set `numRuns` themselves, so both settings apply.
- `stryker.config.json`: `jest.configFile` pointing to the new file and an explicit `timeoutMS` of 10,000 per mutant on top of the measured baseline.
- The mutation run time is recorded in `review.md` at the D1 close (T023) and again at D2 and D3. If it goes over 20 minutes on CI, the fallback is Stryker's incremental mode with its file cached between CI runs, recorded as a deviation and approved by Fernando.

### D2 · US1–US4: backups, data, state and interface

#### Backup exclusion (RF-088, T025 and T026)

Settled now (review P-04), before D2 stores the first name. Built in two tasks (review P-27): T025 creates the plugin with its Android part, and T026 adds the iOS part, after which Security audits the whole plugin.

- **One config plugin,** `plugins/with-backup-exclusion.js`, listed in `app.json` `plugins`. It uses `expo/config-plugins` (part of `expo`, no new dependency). `docs/architecture.md` already says native settings go "in `app.json` or a config plugin".
- **Android:** `android.allowBackup: false` stays in `app.json`. The plugin also:
  - writes `res/xml/data_extraction_rules.xml` with `<cloud-backup>` and `<device-transfer>` sections that exclude every domain (`root`, `file`, `database`, `sharedpref`, `external`, `device_root`, `device_file`, `device_database`, `device_sharedpref`), and sets `android:dataExtractionRules` on `<application>`. On Android 12 and later, `allowBackup="false"` alone does not stop device-to-device transfer, and a missing `<device-transfer>` section means "transfer everything";
  - writes `res/xml/full_backup_content.xml` with the same exclusions and sets `android:fullBackupContent`, for Android 11 and lower.
- **iOS:** there is no `Info.plist` key for this; the exclusion is a property of the folder. The plugin adds to `AppDelegate.swift` (with `withAppDelegate` and a tagged, idempotent merge) a few lines that, at launch and before the JavaScript opens the database, create the expo-sqlite database folder if missing and set `isExcludedFromBackup = true` on it, so the database and its WAL files are left out of iCloud and computer backups. The plugin throws during `prebuild` if it cannot find its anchor in `AppDelegate.swift`, so a future SDK template change fails the build loudly instead of silently dropping the exclusion. The exact folder is read from the installed expo-sqlite's `defaultDatabaseDirectory` at T026; the Library/Caches folder is discarded because iOS may empty it when space runs low, which would lose the coach's data.
- **Checks:** a Jest test (`tests/plugins/with-backup-exclusion.test.ts`) reads `app.json` and the plugin's exported XML and Swift fragments, so the three settings can be checked by reading versioned files (RF-088 criterion). On devices (E-028): on the iOS simulator, `xattr` on the database folder shows the backup-exclusion attribute; on Android, the prebuilt manifest carries both attributes and `adb shell bmgr backupnow` reports that the app does not take part in backup. Each task adds its platform's controls to `docs/security.md`, and Security audits the plugin in T026.

#### Domain additions (D2 and D3)

Small pure functions that the stories need and that are not regulation rules, still in `src/domain/` so that state and interface compute nothing.

```ts
// squad-validation.ts (T030)
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
// name: not blank after trimming (RF-013, RF-016); number: one digit, "00", or two digits not starting with 0 (RF-016, E-021)

// team-order.ts (T030)
export function compareTeams(
  a: Pick<Team, "name">,
  b: Pick<Team, "name">,
): number; // Spanish alphabetical (RF-073)

// match-input.ts (T037)
export function newMatchDefaults(
  defaultFormat: Format,
  today: string,
): { readonly format: Format; readonly date: string; readonly time: null }; // RF-026, RF-036, RF-084
export function validateMatchInput(input: {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}): readonly ValidationError[]; // both or none (RF-025)

// match-date.ts (T037)
export function isoDate(parts: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}): string; // "2026-03-01"
export function isoTime(parts: {
  readonly hour: number;
  readonly minute: number;
}): string; // "18:30"
export function displayDate(date: string): string; // "2026-03-01" → «01/03/2026» (RF-083, E-023, E-032)
export function displayTime(time: string | null): string | null; // "18:30" → «18:30»; no time → null (RF-083)

// match-order.ts (T067, D3)
export function compareMatches(
  a: Pick<Match, "date" | "time">,
  b: Pick<Match, "date" | "time">,
): number; // date and time descending, no time last (RF-074, RF-075)
```

- "Today" and the picker values are turned into these strings by the state layer, so the domain never reads the clock.
- Input length limits are a property of the text fields (`maxLength`), so they live in `src/ui/input-limits.ts` as constants: 40, 500 and 3 digits (RF-013, RF-016, RF-025, E-022).

#### Data (`src/data/`)

Tables, with Drizzle `sqlite-core` in `src/data/schema.ts`. Integer IDs generated by SQLite, so no ID library is needed.

| Table             | Columns                                                                                                                                                                                                                                                                                                                           | Notes                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teams`           | `id` integer PK; `name` text not null; `category` text null; `default_format` integer not null, check in (4, 6, 8)                                                                                                                                                                                                                | RF-013, RF-014                                                                                                                                         |
| `players`         | `id` PK; `team_id` → `teams.id` on delete cascade; `name` text not null; `number` text not null; `is_active` integer (boolean) not null default true                                                                                                                                                                              | Number as text, so "0" and "00" differ (RF-016); no unique index, duplicates allowed (RF-017)                                                          |
| `matches`         | `id` PK; `team_id` → `teams.id` on delete cascade; `format` integer not null, check in (4, 6, 8); `date` text not null (`YYYY-MM-DD`); `time` text null (`HH:MM`); `home_name`, `away_name`, `notes` text null; `home_score`, `away_score` integer null, check both null or both set; `overtime_count` integer not null default 0 | RF-025, RF-058; index on (`team_id`) and (`date`, `time`)                                                                                              |
| `call_up_entries` | `id` PK; `match_id` → `matches.id` on delete cascade; `player_id` → `players.id` on delete cascade; `player_name` text not null; `player_number` text not null; unique (`match_id`, `player_id`)                                                                                                                                  | Keeps the name and number the player had when entering the call-up (RF-019, E-018). A removed and re-added player gets a new row and a new `id` (P-18) |
| `marks`           | `call_up_entry_id` → `call_up_entries.id` on delete cascade; `column_kind` text check in ('period', 'overtime'); `column_number` integer; `mark` text check in ('starter', 'sub'); PK (`call_up_entry_id`, `column_kind`, `column_number`)                                                                                        | An empty cell has no row. Overtimes keep their number on a format change (RF-041)                                                                      |

- **Cascades** delete a team's players and matches (RF-015), a match's call-up and marks (RF-029), and a call-up entry's marks (RF-034). `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` are set when the database opens; neither takes user input.
- **Migrations without a Babel plugin (review P-07).** `drizzle.config.ts` uses `dialect: "sqlite"` without the `expo` driver, so `drizzle-kit generate` writes only the SQL files and `meta/` into `src/data/migrations/`. A script of our own, `scripts/bundle-migrations.mjs`, then writes `src/data/migrations/bundle.ts`, which exports the journal and every migration as a string, in the shape that `migrate()` from `drizzle-orm/expo-sqlite/migrator` expects (checked against the installed types in T027). The npm script `db:generate` runs both. Metro never imports a `.sql` file, so no `babel.config.js`, `metro.config.js` or `babel-plugin-inline-import` is needed. A test (`tests/scripts/bundle-migrations.test.ts`) fails if `bundle.ts` differs from the SQL files, so a forgotten bundle step turns `verify.sh` red. `src/data/migrations/` is excluded from ESLint and Prettier. `verify.sh` already runs `drizzle-kit check` once `drizzle.config.ts` exists.
- **Opening and migrating:** `src/data/database.ts` opens the database with `openDatabaseSync` from `expo-sqlite`, wraps it with `drizzle()` from `drizzle-orm/expo-sqlite`, and runs `migrate()` with `bundle.ts` once at start-up. The root layout keeps the splash screen until the migration ends.
- **Synchronous writes.** Repositories use Drizzle's synchronous API (`.run()`, `.all()`, `.get()`) on the expo-sqlite synchronous connection, inside `transaction()` when several rows change. A tap is on disk before the store publishes it (RF-082). If a write throws, the transaction is rolled back and the error reaches the state layer, which applies nothing (RF-085).
- **Repositories return records, not sorted domain values (review P-01).** They return rows as plain records (`format` and `defaultFormat` as `number`, lists in database order); `src/state/` narrows the format with `isFormat` and sorts with the domain comparators. `src/data/` imports only types from the domain. One file each; queries only through Drizzle with parameters:

| File                    | Functions (D2)                                                                                                   | Added in D3                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `records.ts`            | `TeamRecord`, `PlayerRecord`, `MatchRecord`, `CallUpEntryRecord`, `MarkRecord` types                             | `MatchListRecord` (with team name and category)                                                                  |
| `team-repository.ts`    | `createTeam`, `updateTeam`, `listTeams`, `getTeam`                                                               | `deleteTeam`, `countTeamContents`                                                                                |
| `player-repository.ts`  | `createPlayer`, `listPlayers`                                                                                    | `updatePlayer`, `setPlayerActive`                                                                                |
| `match-repository.ts`   | `createMatch` (match and call-up snapshot in one transaction), `getMatch`                                        | `listAllMatches`, `listTeamMatches`, `updateMatchDetails` (never the format), `deleteMatch`, `changeMatchFormat` |
| `call-up-repository.ts` | `addToCallUp` (returns the new entry with its `id`), `removeFromCallUp`, `createPlayerInMatch` (one transaction) | —                                                                                                                |
| `grid-repository.ts`    | `loadGridRecords` (match, call-up entries and marks), `saveCellChanges`, `addOvertime`, `removeLastOvertime`     | —                                                                                                                |

- **Data tests (review P-02)** run in Jest on an in-memory SQLite database through `better-sqlite3` and `drizzle-orm/better-sqlite3`, applying the same SQL files with `migrate()` from `drizzle-orm/better-sqlite3/migrator`. The helper that opens it is `tests/support/test-database.ts`: it lives under `tests/`, which ESLint treats as test files, so `better-sqlite3` is never imported from `src/`, and it does not count in coverage. The repositories are typed against Drizzle's common synchronous SQLite database type, so the same code runs on both drivers. Each repository test covers its happy path, cascades, the "0"/"00" distinction, the snapshot of E-018, and a transaction rolled back halfway.

#### State (`src/state/`)

The state layer is the only one that calls domain functions and repositories. It publishes **views**: plain, ready-to-draw data, so `src/ui/` and `src/app/` import only types from the domain (review P-01). Stores are created by factories that receive the database (`createSquadStore(db)`…), so tests pass the in-memory database; `src/state/app-stores.ts` wires them to `src/data/database.ts` for the app.

- **`database-ready.ts`** · `initializeDatabase(): Promise<void>`, called by the root layout.
- **`route-params.ts`** · turns `teamId`, `playerId` and `matchId` into positive integers or `null`. A malformed or unknown ID makes the screen show only `notFound.message` («No se ha encontrado: puede que se haya borrado.», review P-23) through `src/ui/not-found.tsx`, and the coach leaves with the header's back button; the screen does not go back on its own, so the message can be read. No route parameter triggers a destructive action (`docs/security.md`).
- **`format-options.ts`** · `formatOptions: readonly Format[]`, re-exported from the domain for the format picker (RF-001).
- **`save-result.ts`** · `type SaveResult = { kind: "saved" } | { kind: "invalid"; errors: readonly ValidationError[] } | { kind: "saveFailed" }`, returned by every action that writes (RF-085).
- **`squad-store.ts`** (Zustand) · `teams: readonly Team[]` sorted with `compareTeams` (RF-073); for the open team, `players: readonly Player[]` sorted with `comparePlayers` (RF-016, E-020) and `duplicateNumbers: readonly string[]` (RF-069). Actions: `loadTeams()`, `openTeam(id)`, `createTeam(input)`, `updateTeam(id, input)`, `addPlayer(input)`; in D3 `updatePlayer`, `setPlayerActive`, `deleteTeam`, `teamContents(id)`.
- **`new-match-draft.ts`** (Zustand) · the new-match form, reset when the screen opens and dropped when it closes without «Guardar» (RF-082): fields with the defaults of `newMatchDefaults` (no time), `setFormat(format)` without confirmation (RF-084, E-024), `setDate`, `setTime`, `clearTime()` (RF-083), `useMyTeamAs("home" | "away")`, which writes the team name only (RF-027), `toggle(playerId)`, and the view `callUpSelection: readonly { player: Player; selected: boolean }[]` (sorted, active only; RF-030, RF-031) with `callUpRange` (RF-068). `create(): SaveResult & { matchId? }`.
- **`match-session-store.ts`** (Zustand) · the open match; created in US2 with opening and closing (T041) and the call-up actions (T042), completed in US3 and US4:

```ts
interface MatchSessionState {
  readonly status: "closed" | "open" | "notFound";
  readonly grid: MatchGrid | null;
  readonly warnings: Warnings | null; //          evaluateWarnings(grid), after every change (RF-060)
  readonly view: MatchView | null; //             what the interface draws (P-01)
  readonly history: readonly UndoEntry[]; //      memory only (RF-057, RF-082)
  readonly pending: PendingQuestion | null; //    D3: question, choice, reminder or long-press menu
  readonly saveFailed: boolean; //                RF-085: the last change was not saved
}
// D2 actions: openMatch(id), closeMatch(), addToCallUp(playerId), removeFromCallUp(entryId),
//             createPlayerInMatch(input), tapCell(cell), undo(), addOvertime(), removeLastOvertime()
// D3 actions: answerSub(), answerStarter(), chooseReplaced(entryId), confirmRemove(), cancelQuestion(),
//             openCellMenu(cell), chooseCellMenuOption(choice), changeFormat(format)

type PendingQuestion =
  | { readonly kind: "subOrStarter"; readonly cell: Cell } //                         RF-045
  | {
      readonly kind: "chooseReplaced";
      readonly cell: Cell;
      readonly mode: "tap" | "menu";
    } // RF-047, RF-053
  | { readonly kind: "confirmRemoveStarter"; readonly cell: Cell } //                 RF-050, RF-052
  | { readonly kind: "cellMenu"; readonly cell: Cell }; //                            RF-052
```

- **`match-view.ts`** · `buildMatchView(grid, warnings, history): MatchView`, a pure function in state that only puts domain results together:

```ts
export interface ColumnView {
  readonly key: ColumnKey;
  readonly column: Column; //                        kind and number for «P3» / «PR1»
  readonly headerMark: PeriodWarning | null; //      «!» or «≠» (RF-065, RF-066)
}
export interface CellView {
  readonly key: CellKey;
  readonly cell: Cell; //                            passed back to tapCell / openCellMenu
  readonly state: CellState;
  readonly isLightRed: boolean; //                   RF-062
}
export interface RowView {
  readonly entryId: CallUpEntryId;
  readonly number: string;
  readonly name: string;
  readonly counter: PlayerCounter; //                «J 3 · D 3» (RF-070)
  readonly isInRed: boolean; //                      RF-063, RF-064
  readonly hasMarks: boolean; //                     decides the removal confirmation (RF-033, RF-034)
  readonly cells: readonly CellView[];
}
export interface MatchView {
  readonly matchId: MatchId;
  readonly format: Format;
  readonly formatOptions: readonly {
    readonly format: Format;
    readonly isCurrent: boolean;
  }[]; // RF-039
  readonly columns: readonly ColumnView[];
  readonly rows: readonly RowView[]; //               sorted (RF-042, E-020)
  readonly ruleImpossible: boolean; //               RF-067
  readonly legend: readonly LegendItem[]; //         RF-087
  readonly callUpRange: CallUpRangeWarning | null; // RF-068
  readonly playersToAdd: readonly Player[]; //       RF-023, RF-032
  readonly canUndo: boolean;
  readonly canRemoveOvertime: boolean; //            only the last overtime (RF-059)
  readonly lastOvertimeHasMarks: boolean; //         decides the confirmation (RF-059)
  readonly replaceableStarters: readonly RowView[]; // for the pending choice, by number and name (D3)
}
```

- **Every action** follows the data flow of `docs/architecture.md`: ask the domain for the new grid, compute the cell changes (`cellChanges`), write them with `saveCellChanges` in one transaction, then publish the grid, the warnings, the history and the view. If the write throws, nothing is published, the history gets no entry, and `saveFailed` becomes true until the next successful change (RF-085, E-025).
- **Undo (RF-057, RF-086).** Only mark changes push an entry (`undoEntryFor`): taps, menu choices, "remove anyway" and the starter replacement (one entry with its two cells). After a call-up removal, an overtime removal or a format change, the store runs `pruneHistory`. `undo()` calls `undoLast`, saves its `changes` and publishes; if saving fails, the history is kept as it was. `closeMatch()` empties the history and the rest of the session, and after a restart the store starts empty (E-019).
- **Leaving the match (RF-057, D48, review P-21).** `closeMatch()` runs only when the coach leaves the match, which means only that the grid route `/matches/[matchId]` is popped: going back from it to the team screen or to a match list (or, in D3, deleting the match, which also pops it). The match's own routes (`call-up`, `new-player` and, in D3, `edit`) are always opened with `router.push` on top of the grid, never with `replace`, and the native stack keeps the grid screen mounted underneath, so opening them and coming back keeps the session and its history (E-026 through the call-up screen, RF-086 after a format change in the details).
  - **How:** the grid screen calls `openMatch(id)` in a `useEffect` when it mounts and `closeMatch()` in that effect's cleanup, which React runs only when the screen unmounts, that is, when its route is popped. `useFocusEffect` and blur events are not used, because the grid also loses focus when a child route is pushed.
  - **Child routes without the grid below:** they act on the open session, so if it is not open for their `matchId` (for example, a stale link), they show `notFound.message` and change nothing.
  - **Tests:** state tests call the store directly (T052); a screen test with `renderRouter` from `expo-router/testing-library` pushes the call-up route, goes back, and checks that Undo still reverts the last mark, then goes back to the team and opens the match again and checks that Undo has nothing to undo (T055); Maestro repeats both on the simulator (T056), and E-026 through the call-up screen once the starter replacement exists (T066).
- **In D2, the questions** (`askSubOrStarter`, `chooseReplacedStarter`, `confirmRemoveStarter`) leave the grid unchanged, which is the same as "cancel". D3 (US5) fills `pending` and adds the dialogs. Taps that do not need a question, including the circled X of RF-048 and RF-051, already work in D2.
- **`matches-store.ts`** (Zustand, D3) · `allMatches` and `teamMatches` as `MatchListItem` views sorted with `compareMatches`, with the date and time already formatted by `displayDate` and `displayTime` (RF-074, RF-075, RF-083), and the team name and category only in `allMatches`; actions `loadAll()`, `loadTeam(teamId)`, `updateDetails(matchId, input)`, `deleteMatch(matchId)`.

```ts
export interface MatchListItem {
  readonly id: MatchId;
  readonly date: string; //          «01/03/2026»
  readonly time: string | null; //   «18:30»
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly score: { readonly home: number; readonly away: number } | null;
  readonly format: Format;
  readonly team: {
    readonly name: string;
    readonly category: string | null;
  } | null; // only in the list of every match
}
```

#### Interface and navigation (`src/app/`, `src/ui/`)

**Screens (Expo Router, `Stack` in `src/app/_layout.tsx`).**

```text
/                                     index.tsx                 Teams list (RF-073) · new team · all matches (D3)
├─ /teams/new                         teams/new.tsx             Team form, modal (RF-013)
├─ /teams/[teamId]                    teams/[teamId]/index.tsx  Team: players sorted (RF-016), duplicate warning (RF-069), matches (D3, RF-075)
│  ├─ /teams/[teamId]/edit            .../edit.tsx              Edit team (RF-013); delete team (D3, RF-015)
│  ├─ /teams/[teamId]/players/new     .../players/new.tsx       New player, modal (RF-016)
│  ├─ /teams/[teamId]/players/[playerId]  .../[playerId].tsx    Edit, deactivate, reactivate (D3, RF-018, RF-022, RF-024)
│  └─ /teams/[teamId]/matches/new     .../matches/new.tsx       New match and call-up selection (RF-025–RF-027, RF-030, RF-031, RF-068, RF-083, RF-084)
├─ /matches                           matches/index.tsx         All matches (D3, RF-074)
└─ /matches/[matchId]                 matches/[matchId]/index.tsx    Grid, undo, overtimes, warnings, legend
   ├─ /matches/[matchId]/call-up      .../call-up.tsx           Add and remove players (RF-032–RF-034)
   ├─ /matches/[matchId]/new-player   .../new-player.tsx        Player created from the match, modal (RF-035)
   └─ /matches/[matchId]/edit         .../edit.tsx              Details, format change, delete (D3, RF-028, RF-029, RF-038, RF-039)
```

- Modals use `Stack.Screen` with `presentation: "modal"`. Leaving a form without «Guardar» discards it without asking (RF-082).
- The match's child routes are pushed on top of the grid, and only popping the grid closes the session (see "Leaving the match").
- The root layout loads `@/i18n`, keeps the splash screen with `expo-splash-screen` until `initializeDatabase()` ends, and in D3 wraps the app in `GestureHandlerRootView` if react-native-gesture-handler 3 still requires it (checked in its docs at T065).

**Components (`src/ui/`).** Typed props, no business logic, texts from `es.json`, values only from `src/state/`.

- `choice-dialog.tsx` · one dialog built on React Native `Modal` for every confirmation (D2) and question (D3): title, message, options and a «Cancelar» button. It has two modes, and each mode handles the two ways of closing from outside the dialog, tapping outside it and the Android Back button, which `Modal` reports through `onRequestClose` (D46):
  - **Confirmations** (delete a team or a match, deactivate a player, change the format, remove a player with marks, remove an overtime with marks) close only with their buttons: tapping outside does nothing, and `onRequestClose` does nothing, so Back neither closes the dialog nor leaves the screen (planning decision 10; RF-015, RF-022, RF-029, RF-034, RF-039, RF-059).
  - **Questions** (D3: sub or starter, the replaced-X choice, the removal reminder and the long-press menu) are cancelled by «Cancelar», by tapping outside and by Back, all three through the same `onCancel`, with no change (RF-045, RF-050, RF-052).
  - **The long-press menu** shows its three options «Titular», «Entró de cambio» and «Quitar», and below them the «Cancelar» button (`common.cancel`). «Cancelar» is drawn apart from the options and is not a fourth option: it only closes the menu, like tapping outside or Back (RF-052).
  - React Native's `Alert` is not used because on Android it allows at most three buttons and cannot tell the two modes apart.
- `format-picker.tsx` · the options from `formatOptions`, «4 periodos», «6 periodos», «8 periodos» (RF-001).
- `team-form.tsx`, `player-form.tsx`, `match-form.tsx`, `call-up-selector.tsx`, `input-limits.ts`.
- `date-time-field.ios.tsx` and `date-time-field.android.tsx` · the native pickers of `@expo/ui` (`DatePicker` from `@expo/ui/swift-ui` and `DateTimePicker` from `@expo/ui/jetpack-compose`, each inside its `Host`, checked in the SDK 58 docs at T043), showing the strings the state formats, and «Quitar hora» (RF-083).
- `save-error-banner.tsx` · the inline `error.saveFailed` message (RF-085), drawn over the screen so it takes no grid height.
- `not-found.tsx` · the `notFound.message` text, shown by any screen whose route parameter is malformed or no longer exists (review P-23).
- `grid/grid-layout.ts` · pure size calculations, not rules (see below).
- `grid/match-grid.tsx`, `grid/player-column.tsx`, `grid/column-header.tsx`, `grid/grid-cell.tsx`. Each cell has an accessible label from `grid.cell.empty`, `grid.cell.starter` or `grid.cell.sub`, with the player's name and the column header («Ana, P2: X, titular»), so screen readers and Maestro can tell the three states apart (review P-23).
- In the screen `src/app/matches/[matchId]/call-up.tsx`, when no active player is left to add, the list of players to add shows `callUp.addEmpty` («No quedan jugadores activos por añadir. Puedes crear uno nuevo.») next to «Crear jugador nuevo» (review P-23).
- `warnings/*.tsx` · rule-impossible banner, call-up range banner, duplicate-number banner, legend.
- `theme/warning-colors.ts` · the light red and red, the minimal colour file of `docs/architecture.md`.

**Grid layout rules.**

- **Fixed player column (RF-077):** a vertical `ScrollView` holds a row with the player column (number, name and the counter «J 3 · D 3» below it) and a horizontal `ScrollView` with the header row and the cells. The header row scrolls with the cells; the player column never scrolls horizontally.
- **Cells ≥ 44 pt (RF-078):** the width is `max(44, ⌊(available width − player column) / period columns⌋)`; when the columns do not fit at 44 pt, the horizontal `ScrollView` scrolls. Rows are at least 44 pt high.
- **375 pt reference (RF-079):** at 375 pt in portrait, 6 periods need 264 pt, which leaves about 100 pt for the player column after margins; long names are cut with an ellipsis. 4 and 6 periods fit; 8 periods and any overtime that does not fit scroll.
- **Landscape phone (RF-080):** 8 periods fit across from 667 pt; more players than fit scroll vertically.
- **Buttons:** «Deshacer», «Añadir prórroga» and «Quitar prórroga» go in the navigation header on tablets and in a toolbar row under the grid on phones, so that on tablets they take no grid height.
- **Tablet height (RF-081, review P-19).** 12 rows of 44 pt need 528 pt. Worst case on the 5th-gen iPad in landscape (1024 × 768 pt), with every banner and a full legend at once:

| Item                                                   | Height (pt)   |
| ------------------------------------------------------ | ------------- |
| Status bar                                             | 24            |
| Navigation header, with the grid buttons               | 50            |
| General warning (RF-067), one line at 1024 pt          | 36            |
| Legend (RF-087), four items in a wrapping row, 2 lines | 48            |
| Call-up range banner (RF-068), one line                | 36            |
| Column header row                                      | 44            |
| **Total above the rows**                               | **238**       |
| Left for rows: 768 − 238                               | **530 ≥ 528** |

In portrait (768 × 1024) the banners may wrap to two lines (about 300 pt in total), which leaves about 720 pt. `grid-layout.ts` takes the measured heights of the banners, the legend and the header (from `onLayout`) and returns the row height `max(44, min(56, rows space / rows))` and whether vertical scroll is needed; T053 tests it with this worst case at 1024 × 768 and 768 × 1024, and the device check of T057 confirms it. The 2 pt margin is thin, so it is a risk (see "Risks").

- **More than 12 players on a tablet (RF-081, D49, review P-25):** the width rule does not change, so every period of the format still fits across without horizontal scroll; the rows keep the 44 pt minimum and the rows that do not fit are reached with the vertical `ScrollView` that already holds the grid. T053 tests 13 players at 1024 × 768 and 768 × 1024: 8 periods with no horizontal scroll in both, vertical scroll needed in landscape (13 × 44 = 572 > 530 pt) and not in portrait.

- `useWindowDimensions` recomputes the layout on rotation; `app.json` already has `orientation: "default"` and `supportsTablet: true`.

**Full journeys (Maestro, in `e2e/`).** One flow per story, plus the interruption flows of E-019 and E-029 (`stopApp` and `launchApp`). Flows select elements by their Spanish text or by `testID`. The IDs they cover go in the flow's `name` (the traceability script reads YAML files and ignores `#` comments). Maestro is installed as a CLI tool on the Mac, not through npm, and is run by hand at each story checkpoint against a development build on the iOS simulator and the Android emulator; its output goes to `review.md`. It is not in `verify.sh`, because it needs a simulator.

### D3 · US5–US7 and closing

- **US5 (T062–T066):** the session store fills `pending` with the domain's questions and offers `answerSub()`, `answerStarter()`, `chooseReplaced(entryId)`, `confirmRemove()` and `cancelQuestion()`; `openCellMenu(cell)` sets `pending` to the menu only when `canOpenCellMenu` is true, and `chooseCellMenuOption(choice)` goes through the domain. Cancelling, with «Cancelar», by tapping outside or with the Android Back button, calls `cancelQuestion()` and leaves the grid as it was (RF-045, RF-050, RF-052). The starter replacement is one undo entry. The interface shows them with `choice-dialog.tsx` in its question mode; the long-press menu has its three options and, apart from them, the «Cancelar» button, which is not a fourth option (RF-052). The long press uses the long-press gesture of react-native-gesture-handler 3 (`useLongPressGesture` and `GestureDetector`, to be confirmed in its v3 docs at T065), and a long press on an empty cell does nothing (RF-052).
- **US6 (T067–T073):** `compareMatches` in the domain; repositories list all matches with the team name and category, and a team's matches; `matches-store.ts` publishes the sorted, formatted lists. Deleting a match asks with `confirm.deleteMatch.*` (RF-029); on confirming, the app goes back out of the match to the screen it was opened from, which pops the grid and closes the session.
  - **The details screen holds two kinds of change (RF-082, D50, review P-26).** `/matches/[matchId]/edit` reuses `match-form.tsx`, but only the details (date, time, home, away, score, notes) are form fields: the screen keeps them in its own state, initialised from the saved match, and «Guardar» saves them with `matches-store.updateDetails(matchId, input)`, whose input has no format, so «Guardar» never writes the format.
  - **The format picker in that screen acts on its own, outside «Guardar».** `match-form.tsx` receives the format and an `onFormatChange` callback as props: the new-match screen passes the draft's `setFormat` (no confirmation, RF-084), and the details screen passes a handler that works on the open session. There, the picker shows the session's current format (`view.formatOptions` with `isCurrent`). Choosing the current one does nothing (RF-039, D39). Choosing another opens `confirm.formatChange.*`, which closes only with its buttons; on confirming, the session's `changeFormat(format)` runs the domain `changeFormat`, saves with `changeMatchFormat` in one transaction, prunes the history (RF-040, RF-041, RF-086) and publishes, so the picker and, underneath, the grid show the new format at once.
  - **Leaving the details without «Guardar»** discards only the details typed and not saved; a format change confirmed there stays saved (RF-082 criterion: new home name typed, format changed from 6 to 8 and confirmed, back without «Guardar» → 8 periods and the old home name). Pressing «Guardar» after a format change saves the details and leaves the confirmed format as it is.
  - Coming back from the details to the grid keeps the Undo history, pruned of the cells of the periods that disappeared (RF-057, RF-086).
- **US7 (T074–T078):** edit a player's name and number (the snapshot keeps old matches unchanged, RF-019, E-018); deactivate with `confirm.deactivatePlayer.*` (RF-022), reactivate without asking (RF-024); a deactivated player shows «Desactivado» and is not offered in call-ups (RF-023). There is no action to delete a player (RF-021). Deleting a team shows `confirm.deleteTeam.*` with the numbers of players and matches that will be deleted (RF-015).
- **Closing (T079):** full verification, Codex and Security review of D3, a whole match on a device in airplane mode (RF-011), spec "Closed" (the traceability check then requires every RF and E of the spec), `summary.md` finished.

## New dependencies

Checked on 2026-11-11 in `package.json` and `package-lock.json`: `react-native-gesture-handler` 3.3.0 and `@expo/ui` 58.0.27 are already installed (from the template, deviation T004 of phase 0); `expo-sqlite`, `drizzle-orm`, `drizzle-kit`, `zustand` and `better-sqlite3` are not. D1 adds none. Every D2 package is installed once, in T024, with `npx expo install`, and the exact version is recorded in `package-lock.json`. Versions are the ones Expo's SDK 58 docs recommend, or the npm `latest` of the stable line when Expo does not manage the package.

| Package                        | Delivery | Version                                     | Type                     | Reason                                                                          | Alternative without dependency                                                                                                                    | Licence and maintenance                                     | Security review                                       |
| ------------------------------ | -------- | ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `expo-sqlite`                  | D2       | `~58.0.15` (Expo SDK 58 docs)               | App                      | Store teams, players and matches on the device (ADR-001)                        | None that keeps queries and migrations; AsyncStorage was discarded in ADR-001                                                                     | MIT; maintained by Expo with each SDK                       | Yes: stores children's data                           |
| `drizzle-orm`                  | D2       | `0.45.x` stable (decision 9)                | App                      | Typed schema and parameterised queries, Expo migrator (ADR-001)                 | Hand-written SQL with `expo-sqlite` prepared statements and `PRAGMA user_version` migrations                                                      | Apache-2.0; active; peer `expo-sqlite >= 14`                | Yes                                                   |
| `drizzle-kit`                  | D2       | the release that matches `drizzle-orm` 0.45 | Development              | Generate the SQL migrations from the schema; `drizzle-kit check` in `verify.sh` | Write each migration by hand                                                                                                                      | MIT; active                                                 | Yes                                                   |
| `zustand`                      | D2       | `5.x` (npm `latest`)                        | App                      | Stores of the squad, the new-match draft, the open match and undo (ADR-001)     | `useReducer` with React context, discarded in ADR-001 because it makes undo and recalculation harder                                              | MIT; pmndrs, active                                         | Yes                                                   |
| `better-sqlite3`               | D2       | npm `latest`                                | Development              | Run repository and migration tests in Jest on a real SQLite database            | Node's built-in `node:sqlite` (experimental in Node 22), if the installed Drizzle has a driver for it; or test repositories only on the simulator | MIT; active; native addon with prebuilt binaries; Node ≥ 22 | Yes: native code; imported only from `tests/`         |
| `@types/better-sqlite3`        | D2       | npm `latest`                                | Development              | Types for the above                                                             | —                                                                                                                                                 | MIT; DefinitelyTyped                                        | Yes                                                   |
| `react-native-gesture-handler` | D3       | `~3.3.0`, already installed                 | App                      | Long press on the cells (RF-052, ADR-001)                                       | React Native `Pressable` with `onLongPress`                                                                                                       | MIT; Software Mansion; Expo docs recommend `~3.3.0`         | No (already installed and audited in phase 0)         |
| `@expo/ui`                     | D2       | `~58.0.27`, already installed               | App                      | Native date and time pickers (RF-083)                                           | Text fields with validation, which RF-083 rules out                                                                                               | MIT; Expo                                                   | No (already installed)                                |
| Maestro                        | D2       | latest CLI                                  | Tool on the Mac, not npm | Full journeys on the simulator (ADR-001)                                        | Only component tests                                                                                                                              | Apache-2.0; mobile.dev, active; needs Java 17               | Yes: tool installed with `brew` or its install script |

- **Dropped (review P-07):** `babel-plugin-inline-import` (last release 2018). The migrations are bundled by `scripts/bundle-migrations.mjs` instead, so no `babel.config.js` or `metro.config.js` is created either.
- The backup config plugin uses `expo/config-plugins`, which ships with `expo`: no new package.
- The ESLint boundaries already allow `expo-sqlite` and `drizzle-orm` only in `src/data/`; `better-sqlite3` is imported only from `tests/support/test-database.ts`.

## Risks

| Risk                                                                                          | Likelihood | Mitigation                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The "rule impossible" algorithm has a subtle bug in the lower-bound reduction                 | Medium     | Brute-force oracle on realistic grids of the three formats, with both outcomes guaranteed (T022); six spec examples; mutation testing                                                                               |
| Mutation testing exceeds the 30-minute CI limit, above all with the properties and the oracle | Medium     | Stryker runs only domain tests, with 100 fast-check runs instead of 1,000 and without the budget test; explicit `timeoutMS`; time recorded at each delivery close; fallback: incremental mode cached in CI (T014)   |
| The budget test is flaky under coverage instrumentation                                       | Low        | 5 ms per call allowed against an expected 0.5 ms; it lives in its own file, out of mutation runs (T014)                                                                                                             |
| Warnings plus a synchronous SQLite write are too slow on the 5th-gen iPad                     | Low        | Domain budget test in CI (T014); device measurement at T060; if needed, memoise warnings per grid or move writes off the tap path                                                                                   |
| Drizzle's Expo migrator does not accept the bundle written by our script                      | Low        | T027 checks the shape against the installed types and runs the migration on the simulator; fallback: hand-written SQL migrations with `PRAGMA user_version`, recorded as a deviation                                |
| A stale `bundle.ts` ships after a schema change                                               | Medium     | `tests/scripts/bundle-migrations.test.ts` compares it with the SQL files on every `verify.sh`                                                                                                                       |
| `better-sqlite3` does not build on the Mac or in CI, or Drizzle types differ between drivers  | Medium     | Prebuilt binaries for Node 22; fallback `node:sqlite`; repositories typed against the common synchronous SQLite type                                                                                                |
| The iOS backup exclusion stops working after an SDK update changes `AppDelegate.swift`        | Medium     | The plugin throws when its anchor is missing, so `prebuild` fails; Security re-checks it at each SDK update; device check with `xattr`                                                                              |
| Android device-to-device transfer copies the database despite `allowBackup: false`            | Low        | Data extraction rules exclude every domain from `<device-transfer>` and `<cloud-backup>`; full-backup rules for Android 11 and lower; Security audits T025 and T026                                                 |
| 12 rows do not fit on the 5th-gen iPad in landscape with every banner and the legend          | Medium     | Height budget with measured banners (T053); grid buttons in the header on tablets; device check (T057); if it fails, Fernando chooses between a one-line legend and smaller banner padding, recorded as a deviation |
| Codex flags requirements of later deliveries as missing                                       | High       | The delivery table states the scope; the reviewer notes those as out of the delivery in `review.md`                                                                                                                 |
| The traceability test counts fixture IDs as real tests                                        | Medium     | Fixtures created at run time in a temporary folder, test names without IDs (T001)                                                                                                                                   |
| Spanish sorting differs between Node (Jest) and Hermes (device)                               | Low        | `localeCompare` with `"es"`; tests with accents («Alevín A», «Cadete B»); check on the device                                                                                                                       |
| The player column is too narrow at 375 pt with 6 periods                                      | Medium     | Ellipsis for long names; layout tests at 375, 667, 768 and 1024 pt; device check at T057                                                                                                                            |
| The `@expo/ui` pickers differ between platforms or lack a time-only mode                      | Medium     | One file per platform; read the SDK 58 docs at T043; if a mode is missing, the fallback is recorded as a deviation and approved before adding any package                                                           |
| The gesture-handler 3 API differs from what is known                                          | Medium     | Read its v3 docs and types before T065; fallback `Pressable` `onLongPress`                                                                                                                                          |
| Undo interacts badly with call-up, overtime and format changes                                | Medium     | Rows keyed by call-up entry; history pruned after structural changes; `undoLast` skips missing cells and never makes a sixth X; tests in T018 and properties in T021                                                |
| The Undo history is lost when the coach opens the match's call-up or details, breaking E-026  | Low        | `closeMatch()` only in the cleanup of the grid screen's mount effect, never on blur; child routes always pushed, never `replace`; screen test with `renderRouter` (T055); Maestro (T056, T066)                      |
| SDK 58 needs iOS 16.4 and the 5th-gen iPad tops out at iPadOS 16.7                            | Low        | Supported today; a future SDK may drop it, to be checked at each SDK update                                                                                                                                         |
| Maestro needs Java and simulators and does not run in CI                                      | High       | Run by hand at each story checkpoint, with the output in `review.md`; the IDs that depend on it are listed below                                                                                                    |

## Test strategy

- **Order in each task:** the Test designer writes the tests from the task's scenarios, sees them fail for the right reason, and only then the Implementer writes code (AGENTS.md, phase 6).
- **Names:** each test starts with the IDs it covers (`'RF-062 E-001: …'`), so the traceability script can follow them.
- **Domain (D1, and the domain tasks of D2 and D3):** Jest with `it.each` tables for requirements and boundaries; `spec-examples.test.ts` with every domain example; fast-check properties and the RF-067 oracle; Stryker ≥ 80 % mutants killed and 90 % coverage, enforced by `verify.sh`.
- **Data:** Jest against in-memory SQLite (`tests/support/test-database.ts`) with the real migrations: cascades, transactions, snapshots, checks, rollback.
- **State:** Jest with the stores and an in-memory database: each action saves before publishing; a failed save publishes nothing (a repository double that throws); undo scope and pruning; the view model; a new store after "restart" has the same grid and an empty history (E-019), and no half-filled form (E-029).
- **Interface:** React Native Testing Library for components and screens (screens in `tests/app/`): what the user sees and taps, dialogs and their two closing modes (tapping outside and the Android Back button through `onRequestClose`), cancel paths, the Undo history across the match's child routes (`renderRouter`), warnings and legend rendering, `maxLength` of every field (E-022), sizes from `grid-layout.ts` at 375, 667, 768 and 1024 pt.
- **Configuration:** `tests/plugins/with-backup-exclusion.test.ts` (RF-088) and `tests/scripts/bundle-migrations.test.ts`.
- **Journeys:** Maestro flows per story and the interruption flows, at each checkpoint, on the iOS simulator and the Android emulator.
- **Device checks:** iPhone, 5th-gen iPad and Android, in portrait and landscape, at the US3, US4, US5 and closing checkpoints, recorded in `review.md`.
- **Scenarios** in every task cover happy path, boundaries, outside the rules, odd data, sequences, interruptions and mistakes (`docs/architecture.md`).

**IDs that a machine can only check in part (review P-16).** For these, the traceability script is satisfied by the test named below, but the full requirement is only proved by hand or by Maestro, which does not run in CI. This is accepted explicitly; the manual result goes to `review.md` at the task shown.

| ID            | Machine check in `verify.sh`                                                                                                            | Only by hand or Maestro                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| RF-011        | ESLint forbids network calls in `src/`; the schema and start-up tests that carry the ID check that data goes only to the local database | A whole match in airplane mode on a device (T079)                                                |
| RF-012        | ESLint forbids loose text in JSX; screen tests check Spanish texts                                                                      | Reading every screen on a device (T079)                                                          |
| RF-076        | `grid-layout.ts` tests at the four reference sizes, both orientations                                                                   | Device check on phone and tablet, both orientations (T057, T066)                                 |
| RF-077        | Grid component test: the player column is outside the horizontal `ScrollView`                                                           | Scrolling on devices (T057)                                                                      |
| RF-078–RF-081 | `grid-layout.ts` tests with the reference widths, heights and worst-case banners, and 13 players on a tablet                            | Device check that nothing scrolls where it should not (T057)                                     |
| RF-088, E-028 | Configuration test of `app.json` and the plugin output; the test name carries E-028 as a proxy                                          | Android prebuilt manifest and `bmgr` (T025); iOS simulator `xattr` on the database folder (T026) |
| E-019, E-029  | State tests with a new store on the same database                                                                                       | Maestro `stopApp` and `launchApp` (T036, T056)                                                   |
| E-023, E-032  | Domain formatting tests and screen tests with the picker replaced by a test double                                                      | Choosing a date and a time with the real native pickers in Maestro (T048, T073)                  |

## Glossary additions (T003)

Added to `docs/architecture.md` before the code uses them (spec, "Terms"). Existing entries are used as they are: `Team`, `Player`, `number`, `isActive`, `Match`, `CallUp`, `Format`, `Period`, `Overtime`, `RuleWindow`, `Mark` (`starter`, `sub`), `played`, `rested`, `Warning`.

| In the app (Spanish)       | Meaning                                                         | In the code                                                       |
| -------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| —                          | The data of a format: periods, rule window, call-up range       | `FormatRules`, `FORMAT_RULES`                                     |
| Periodo libre              | A period after the rule window, or an overtime                  | `isRuleWindowColumn(...) === false`                               |
| Cuadrícula                 | Players in rows, periods and overtimes in columns               | `MatchGrid`                                                       |
| —                          | A period or overtime column of the grid, and its key            | `Column`, `ColumnKey`                                             |
| Casilla, casillas vacías   | One player in one column; a cell with no mark                   | `Cell`, `CellKey`, `CellState` `"empty"`                          |
| —                          | A player's line in a match's call-up, with name and number kept | `CallUpEntry`, `CallUpEntryId`                                    |
| Casilla en rojo claro      | Cell that should not be marked                                  | `lightRedCells`                                                   |
| Jugador en rojo            | Player breaking a minimum of the rule window                    | `playersInRed`                                                    |
| Contador                   | Played and rested over the whole match                          | `PlayerCounter`                                                   |
| Categoría                  | Free-text category of a team                                    | `category`                                                        |
| Variante por defecto       | Format of a team's new matches                                  | `defaultFormat`                                                   |
| Local, visitante           | Names of the two sides                                          | `homeName`, `awayName`                                            |
| Resultado final            | Optional points of each side                                    | `homeScore`, `awayScore`                                          |
| Notas                      | Free text of a match                                            | `notes`                                                           |
| Desactivado                | Player not offered in new call-ups                              | `isActive: false`                                                 |
| Periodo incompleto         | Rule-window period with fewer than 5 X                          | `PeriodWarning` `"incomplete"`                                    |
| Periodo incoherente        | Period with a sub and fewer than 5 X                            | `PeriodWarning` `"inconsistent"`                                  |
| Regla imposible de cumplir | No filling of the rule window meets everyone's minimums         | `isRuleImpossible`, `ruleImpossible`                              |
| Rango de convocatoria      | Allowed number of players in the call-up                        | `callUpMin`, `callUpMax`, `CallUpRangeWarning`                    |
| Dorsal repetido            | Two active players of a team with the same number               | `duplicateNumbers`                                                |
| Descansos posibles         | A player's empty cells in the rule window                       | `possibleRests`                                                   |
| —                          | Every warning of a grid at once                                 | `Warnings`                                                        |
| Leyenda                    | List under the general warning explaining the visible marks     | `LegendItem`, `legendItems`                                       |
| Titular en lugar de otro   | Starter replacing someone else's X                              | `replaceStarter`                                                  |
| Deshacer                   | Revert the last mark change                                     | `undoLast`, `UndoEntry`, `CellChange`                             |
| —                          | What state publishes for a screen to draw                       | `MatchView`, `RowView`, `ColumnView`, `CellView`, `MatchListItem` |

## ADR

- **[ADR-004](../../docs/decisions/ADR-004-global-ids-and-deliveries.md) (Proposed):** three-digit, globally unique and never reused `RF` and `E` IDs, resolving pending finding C-10 of phase 0; spec 001 delivered in three deliveries (D1, D2, D3) with their own branches and PRs, after a documentation-only PR from a `-spec` branch. It is accepted together with this plan.
- No other ADR is needed: expo-sqlite, Drizzle, Zustand, gesture-handler and Maestro are already in ADR-001 and the architecture stack; the backup settings use a config plugin, which `docs/architecture.md` already names as the place for native settings; `better-sqlite3` is test tooling, recorded above with its reason (rule 10); the folders the plan adds outside `src/` (`plugins/`, `tests/scripts/`, `tests/plugins/`, `tests/setup/`, `tests/support/`, `e2e/`) are listed in the "Structure" of `docs/architecture.md` in the documentation PR, as a consequence recorded in ADR-004 (review P-28). They add no layer and change no import rule.

## Deviations

| Date | What changes from the plan | Reason | Approved by |
| ---- | -------------------------- | ------ | ----------- |
| —    | None yet                   | —      | —           |
