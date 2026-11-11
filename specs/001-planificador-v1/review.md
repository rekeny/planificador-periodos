# Review · 001 Period planner v1

## Pre-implementation analysis (phase 4)

Reviewed on 2026-11-11 at commit `ef3e852` (branch `001-planificador-v1-spec`), with a clean context. Inputs: `spec.md`, `plan.md`, `tasks.md`, ADR-004, `source-en.md`, `AGENTS.md`, `docs/constitution.md`, `docs/architecture.md`, `docs/security.md`, `eslint.config.js`, `scripts/check-traceability.mjs`, `scripts/verify.sh`, `jest.config.js`, `stryker.config.json` and `.github/workflows/verify.yml`.

| #    | Finding                                                 | Severity  | Status |
| ---- | ------------------------------------------------------- | --------- | ------ |
| P-01 | Layers: ui and data would have to call domain functions | Important | Open   |
| P-02 | `src/data/test-database.ts` imports `better-sqlite3`    | Important | Open   |
| P-03 | Plan decisions add behaviour that is not in the spec    | Important | Open   |
| P-04 | Principle 5: iOS backups undecided, check says Yes      | Important | Open   |
| P-05 | RF-082 forbids a save button, but forms use «Guardar»   | Important | Open   |
| P-06 | Brute-force oracle for RF-067 is vacuous as planned     | Important | Open   |
| P-07 | `babel-plugin-inline-import` is unmaintained            | Important | Open   |
| P-08 | Mutation testing may exceed the 30-minute CI limit      | Important | Open   |
| P-09 | Plan and tasks still call the answers pending           | Minor     | Open   |
| P-10 | Examples leave the rest of the grid undefined           | Minor     | Open   |
| P-11 | Some tasks are likely longer than three hours           | Minor     | Open   |
| P-12 | Small mismatches between plan and tasks                 | Minor     | Open   |
| P-13 | Spec bookkeeping: US2 list, RF-074, Q20                 | Minor     | Open   |
| P-14 | Code names drift from the glossary                      | Minor     | Open   |
| P-15 | ADR-004 loose ends                                      | Minor     | Open   |
| P-16 | Some RFs are traced only by manual Maestro flows        | Minor     | Open   |
| P-17 | D2 interim gap missing from the constitution check      | Minor     | Open   |
| P-18 | Undo after a player is removed and re-added             | Minor     | Open   |
| P-19 | Tablet height budget for RF-081                         | Minor     | Open   |
| P-20 | Contradictory wording of the RF-061 property            | Minor     | Open   |

### Details

- **P-01 · Important.** `docs/architecture.md` and `eslint.config.js` let `src/app/`, `src/ui/` and `src/data/` import only types from `src/domain/`. The plan exposes from `match-session-store.ts` only `grid` and `warnings`, so the grid components (T038, T041) would need `gridColumns`, `columnKey`, `cellKey` (to look up `GridWarnings.lightRedCells`), `cellState`, `playerCounter` and `isRuleWindowColumn`, and `format-picker.tsx` (T023) would need `FORMAT_IDS`. On the data side, T034 asks `loadGrid` to return the call-up "sorted", which needs `comparePlayers`, and turning the stored integer into `FormatId` needs `isFormatId`. All of these are domain functions, so ESLint `boundaries` would fail. The plan must define what state publishes for the interface (for example a grid view with columns, rows with counters, cell states and warning flags, and the format options), and move sorting and narrowing from `src/data/` to `src/state/`.
- **P-02 · Important.** T019 puts `src/data/test-database.ts`, a helper built on `better-sqlite3`, inside `src/data/`. It is not a `*.test.ts` file, so the boundaries rule for `data` (only `expo-sqlite` and `drizzle-orm`) rejects the import. This contradicts the plan's own line "`better-sqlite3` is only imported by tests", and the helper would also count in coverage. Move it to `tests/` (test category) or name it so that it falls under `TEST_FILES`.
- **P-03 · Important.** The nine plan questions were answered, but the answers live only in `plan.md`. Several of them are user-visible behaviour that the spec does not contain: "07" rejected (RF-016 says "one or two digits"), length limits of 40 and 500 and scores 0–999 (RF-013, RF-016, RF-025), the date shown as «11/11/2026», the format being editable in the new-match form, the save-failure message and its new key `error.saveFailed` (not in the approved Spanish texts table), undo skipping missing cells (RF-057), and the legend with «≠» and «!» (RF-065, RF-066). Constitution principle 12 says the answer is recorded in the spec, and the Planner role forbids adding scope that is not in the spec. Some tasks also add small behaviour of their own: T029 "draft discarded when leaving", T046 "tapping outside the dialog cancels it", T051 "change to the same format still asks". Record them through the Specifier (Clarifications, the affected RFs and the texts table) before approval.
- **P-04 · Important.** Principle 5 says children's names never leave the device. By default, iOS iCloud and computer backups include the app's data, and the plan leaves this to Security in T018 (question 6) while the constitution check marks principle 5 "Yes" and "Pending: none". Mark the row "Pending", and settle it before D2 approval, because D2 is the first delivery that stores names. Security should also check whether `android.allowBackup: false` still allows device-to-device transfer on Android 12 and later, which may need `dataExtractionRules`. If the decision adds native configuration, `docs/security.md` should record it.
- **P-05 · Important.** RF-082 says "Every change is saved on the device at once, without a save button". The approved Spanish texts include `common.save` «Guardar» "in forms", and the plan has team, player and match forms. The spec should say what RF-082 covers: grid marks and confirmed actions are saved at once, while forms are saved with «Guardar». It should also say what happens to a half-filled form when the app closes, because E-019 and the T022, T029 and T035 "Interruptions" scenarios depend on it.
- **P-06 · Important.** Plan and T016 compare `isRuleImpossible` with brute force "up to 5 players × 3 window periods". Three window periods means the 4-period format, where every window period needs 5 X and every player needs one rest. With 5 players or fewer, no filling can give 5 X per period and a rest to everyone, so the rule is always impossible and both sides always return `true`: the property proves nothing. Generate call-ups of at least 8 players (4 periods) and 9 to 12 players (6 and 8 periods), with most cells already filled, so that brute force runs only over a few empty cells. Cover all three formats, because the minimums of 2 are never exercised otherwise.
- **P-07 · Important.** `docs/security.md` requires every new dependency to be maintained. `babel-plugin-inline-import` was last released in 2018, which the plan itself records. Either take the plan's own no-dependency fallback (a script that turns the generated `.sql` files into TypeScript modules), or record an explicit exception that Fernando approves.
- **P-08 · Important.** With `coverageAnalysis: "perTest"`, Stryker reruns, for every covering mutant, the fast-check properties (5 × 1,000 runs, one with a brute-force oracle) and the 1,000-call budget test of T012. Mutation testing also runs in D2 and D3, because the domain changes there, and the CI job has `timeout-minutes: 30`. The risk table does not cover this. The 2-second budget test is also timing-sensitive under coverage instrumentation. Plan a mitigation, for example fewer runs under Stryker through an environment variable, keeping the budget test out of mutation runs, or a separate timeout.
- **P-09 · Minor.** "Pending: none … they are decisions now" contradicts the rest of the plan and tasks. Constitution rows 5 and 12 still say "pending question" ("a proposal, not a decision"), the signatures carry "(pending question 1)", and the "Pending:" fields of T003, T018, T020, T026, T029, T030, T033, T035, T036 and T041 still point to "pending question N". Reword them to "decision N".
- **P-10 · Minor.** E-007 is fully determined, and E-003, E-004 and E-006 hold whatever the rest of the grid is. E-001, E-002, E-005 and E-008–E-010 do not fix the call-up or the other players' marks, so whether the rule-impossible warning (RF-067) and the incomplete marks appear depends on how the test fills the grid. E-003 and E-004 now list the general warning and E-005 does not, so readers may assume it is absent. A consequence worth telling Fernando: a call-up below the minimum always makes the rule impossible (8 players in 6 periods can give at most 24 of the 25 X), and so do 13 players in 6 periods (26 played needed, 25 X available). E-015 therefore also shows the general warning. The spec should say that each example asserts only the warnings it names, or give full grids.
- **P-11 · Minor.** These tasks look longer than three hours: T016 (five properties, the oracle and the 18-row examples table), T019 (schema, generated migration, database opening, test driver, start-up state and splash), T030 (screen plus four components), T031 (three routes plus `choice-dialog.tsx`) and T040 (two flows on two platforms plus a device check on three devices in both orientations). Split them. D2 and D3 are re-planned anyway, but T016 is in D1.
- **P-12 · Minor.** T018 installs every D2 package, but T022 says "install `zustand`". T029 adds call-up actions to `match-session-store.ts` before T035 creates that store. T045's `openCellMenu` and T051's `src/state/matches-store.ts` are not in the plan's state design. T026 says the quick home/away option is a domain function, but `match-input.ts` has no signature for it.
- **P-13 · Minor.** RF-001 lists US2 among its stories, but the US2 requirements list does not include RF-001. RF-074 shows the format and the category, which go beyond the Q17 answer ("date, time, home, away, score and team"). The Q20 row still says "(see Spanish texts, pending approval)", while that section is approved.
- **P-14 · Minor.** The glossary maps Player, Team, Match, CallUp, Format, Period, Overtime, RuleWindow and Warning to code names. The plan uses `SquadPlayer`, `ShirtNumber`, `FormatId` and `FormatConfig`, `GridWarnings` and `Column` kinds instead, and does not define `Player`, `Team`, `Match`, `RuleWindow` or `Warning`. Align the names, or add the new ones to the T002 glossary table (principle 17, rule 12).
- **P-15 · Minor.** In ADR-004: the documentation branch `001-planificador-v1-spec` fits neither the current rule (`001-planificador-v1`) nor the new one (`NNN-name-dN`). No task sets the spec to "In progress" when D1 starts. D1 is described as "only `src/domain/` plus the traceability script and its documentation", but T002 also edits the glossary in `docs/architecture.md`. The consequence "the Specifier must look up the highest `RF` and `E`" is not among T001's changes to `specifier.md`.
- **P-16 · Minor.** The traceability script counts any YAML name under `e2e/`, but Maestro does not run in CI. Requirements whose only realistic test is a manual Maestro flow or a device check (RF-011 offline, RF-076 and RF-080–RF-081 on devices) pass the machine check without being executed by a machine. Accept this explicitly, or name the Jest tests that carry those IDs (for example `grid-layout.ts` for RF-078–RF-081).
- **P-17 · Minor.** In D2, a tap on an empty cell of a full rule-window period, or on an X in a period with a sub, does nothing until D3. It is stated in "Deliveries", but the principle 1 row of the constitution check says "Yes" without mentioning it, and D2's checkpoint is a real match.
- **P-18 · Minor.** Undo entries are keyed by `PlayerId`. A player removed from the call-up and added again (T028 "add her again → empty row") gets a new call-up entry with the same `PlayerId`, so an older undo entry could restore marks onto the new row, which decision 7 does not contemplate. Add the scenario to T033 or T036.
- **P-19 · Minor.** RF-081 needs 12 rows without vertical scroll on a tablet in landscape (768 pt high). The grid shares that height with the header row, the general warning, the call-up banner, the legend and the undo and overtime buttons. T037 should include them in the height calculation.
- **P-20 · Minor.** The property "`evaluateWarnings` … white on an empty, complete and valid grid" contradicts itself: an empty grid shows incomplete marks in the window. Say "a complete grid that meets every rule".

### Checks with no finding

- **Coverage:** every RF-001–RF-082 and E-001–E-019 is in at least one task line; every task ID points to an existing RF and E; T001–T059 are sequential; no `[DOUBT]` is open; the level, Large, is right.
- **Source coverage:** every item of `source-en.md` maps to an RF or to Out of scope. Apart from P-03 and P-13, every addition is backed by Q1–Q20 or D36.
- **Examples checked by hand** against RF-062, RF-063 and RF-067:
  - E-003 (one possible rest: red, P5 light red, U < L, impossible);
  - E-004 (window complete, Pedro L = 1 with no X missing: impossible, red by RF-064);
  - E-006 (one X missing, two players with L = 1: impossible);
  - E-007 (ten players with L = 0 and U = 1, five X missing in P5: possible, no light red because three possible rests is more than two).

  E-001, E-002 and E-008–E-010 also match RF-062 with "at or below".

- **RF-067 algorithm:** the bounded-flow reduction in the plan is sound. Its parts are source → player [L, U], player → period with capacity 1 on empty cells, period → sink [d, d], the return edge, a super-source and super-sink, and early rejection when U < L. "Player in red implies rule impossible" holds under this definition, as RF-067 requires.
- **Deliveries:** D1 contains only `src/domain/`, the traceability script and its documentation (see P-15). D2 and D3 split cleanly by story. Each delivery's PR stays green with the "ticked tasks only" rule.
- **Dependencies:** each one is listed with its reason, its alternative, its licence and its security review (see P-07).

## Verification (phase 7)

- Date and commit:
- Result:

```text
<output of scripts/verify.sh>
```

## Codex review (phase 8)

Full file: [codex-review.md](codex-review.md)

| #   | Finding | File | Severity | Status |
| --- | ------- | ---- | -------- | ------ |

## Security (phase 8)

| #   | Finding | Severity | Status |
| --- | ------- | -------- | ------ |

## Verdict

- [ ] No open blocking finding
- [ ] Important findings fixed or accepted as pending by the developer
