# Summary · 001 Period planner v1

## D1 · Rules engine (`src/domain/`)

### What was done and what changes for the user

The code that knows the regulations now exists as pure, tested functions in `src/domain/`: which cells turn light red, which player is in red, when a sixth X is not allowed, what a tap does, what a long press offers, what Undo reverts, and what a format change keeps. There are no screens: **the app looks the same as before**. D2 turns these functions into the match screen.

Every domain example of the spec (E-001 to E-018, E-020, E-026, E-027, E-030, E-031) is one row of a table in `src/domain/spec-examples*.test.ts`.

### How: files and new pieces

| Area                | Files in `src/domain/`                                                                                                           | Requirements                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Formats and columns | `format.ts`, `column.ts`                                                                                                         | RF-001 to RF-006                           |
| Squad and grid      | `squad.ts`, `player-order.ts`, `grid.ts`                                                                                         | RF-016, RF-019, RF-042, RF-043             |
| Marking             | `marking.ts`, `cell-menu.ts`, `overtime.ts`, `counter.ts`                                                                        | RF-044 to RF-059, RF-070 to RF-072         |
| Warnings            | `rule-window.ts`, `rule-feasibility.ts`, `bounded-flow.ts`, `period-warnings.ts`, `call-up-range.ts`, `warnings.ts`, `legend.ts` | RF-002 to RF-010, RF-060 to RF-068, RF-087 |
| Call-up and format  | `call-up.ts`, `format-change.ts`, `duplicate-numbers.ts`                                                                         | RF-017 to RF-042, RF-069                   |
| Undo                | `undo.ts`                                                                                                                        | RF-055, RF-057, RF-086                     |

Tooling that changed: the traceability script reads three-digit global IDs and rejects an ID defined in two specs (T001); the documents and templates quote three-digit IDs (T002); fast-check runs 1,000 cases normally and 100 under Stryker, set once in `tests/setup/` (T014); ESLint lets test code import `tests/support/` (T020). No dependency was added.

Tests: properties on random grids (`grid.properties*.test.ts`), on random sequences of actions (`actions*.properties.test.ts`) and a brute-force oracle for "rule impossible" (`rule-feasibility.oracle*.test.ts`). Their generators are in `tests/support/`.

### Why: decisions made

- **One function per rule, no rule in the interface.** `evaluateWarnings(grid)` composes small functions, so D2's screens only read its result (constitution, architecture layers).
- **Rule numbers live in `FORMAT_RULES` only.** Minimums, window length and call-up range are data; no function repeats them.
- **"Rule impossible" uses a flow, not a count.** Counting free slots misses cases where each player needs a different period. A flow with lower bounds answers exactly, and a brute-force oracle checks it on realistic grids.
- **Entries, not players, are keyed.** A player removed and added again is a new entry, so Undo can never write into the old row (RF-086).
- **Codex finding D1-01.** `addToCallUp` was in the plan but missing, because T015's "Done when" did not list it and the task was built from that line. Codex found it; it was added in a follow-up commit with its own tests, and the interpreter of the action properties now uses it.

### To learn

Real code, from the repository.

**A discriminated union tells the caller what to do** (`src/domain/marking.ts`). A tap does not decide alone: when the answer needs the coach, it returns a question instead of changing the grid.

```ts
export function tapCell(grid: MatchGrid, cell: Cell): MarkingResult {
  if (!cellExists(grid, cell)) return { kind: "unchanged" };

  switch (cellState(grid, cell)) {
    case "empty":
      if (starterCount(grid, cell.column) < MAX_STARTERS_PER_PERIOD) {
        return { kind: "changed", grid: withMark(grid, cell, "starter") };
      }
      if (isRuleWindowColumn(grid.format, cell.column)) {
        return { kind: "askSubOrStarter" };
      }
      return { kind: "changed", grid: withMark(grid, cell, "sub") };
    // ...
  }
}
```

TypeScript checks that the `switch` covers all three cell states, so a new state cannot be forgotten.

**Order of the `if`s is the rule** (`src/domain/period-warnings.ts`).

```ts
if (starterCount(grid, column) >= MAX_STARTERS_PER_PERIOD) return null;
if (hasSub(grid, column)) return "inconsistent";
return isRuleWindowColumn(grid.format, column) ? "incomplete" : null;
```

A circled X in a column with fewer than five X beats "incomplete" (E-013).

**Loops over the window, not hard-coded periods** (`src/domain/rule-window.ts`). `ruleWindowColumns(format)` gives P1–P3, P1–P5 or P1–P6, so `lightRedCells` works for the three formats with the same code.

```ts
if (windowStats(grid, entry.id).possibleRests > minRested) continue;
for (const column of ruleWindowColumns(grid.format)) {
  /* empty cells go light red */
}
```

**A network instead of a counter** (`src/domain/rule-feasibility.ts`). Source → players → window periods → sink. A player edge carries `[minPlayed − played, emptyCells − minRested]`; a period edge carries exactly the X still missing to reach five. The rule can be met only if a flow exists that respects every minimum and maximum.

```ts
edges.push({ from: 0, to: 1 + row, min, max });
// ...
return !hasFeasibleFlow({ nodeCount: sink + 1, source: 0, sink, edges });
```

**Properties** state what must hold for any grid, and fast-check looks for a counterexample. Example: after any sequence of taps, answers, undos and structure changes, no column has six X.

### To check it

```bash
npm run verify
```

It runs types, lint, formatting, all tests with coverage, traceability, Expo Doctor, mutation testing and the scanners. To read the examples: open `src/domain/spec-examples.test.ts`.

Measured: Stryker kills 93.89 % of mutants (threshold 80 %) and domain coverage is above 99 %. The whole `verify` with mutation testing takes about 5 minutes on a Mac with 8 cores, but 25 minutes on GitHub Actions (22 min 32 s of it is Stryker, 2 vCPU, 685 mutants). That is above the 20 minutes of the plan, so CI now runs Stryker in incremental mode with a cached file (deviation approved on 2026-11-12): locally the second run takes 39 seconds instead of 5 minutes.

### Pending

- Fernando reviews and merges the PR "001 D1: rules engine" (T023).
- Before D2, the Planner reviews D2's tasks with these lessons: a task's "Done when" line can be shorter than the plan (D1-01); the traceability script only reads literal test titles, so tables use a literal title with the IDs; `verify.sh`'s focused-test check matches the word "fit" anywhere in a test file, which is too loose.
- Check on GitHub that the incremental cache works: the first run of the PR is still slow (it saves the cache), the next ones should be short.
- Some `undo.ts` mutants survived (the guard against a sixth X cannot be reached by real app actions; it is only a defence, covered by tests with a history that does not match the grid).

## D2 · Teams, players, match and grid (`src/data/`, `src/state/`, `src/ui/`, `src/app/`)

### What was done and what changes for the user

D1 was the rules engine with no screens. D2 puts the app on top of it. With the code of this branch the coach can:

- **Teams and players:** see the list of teams (sorted in Spanish order), create and edit a team (name, category, default format), open it, add players and see them sorted by number. Two players with the same number show a warning banner, but are never blocked.
- **A match with a call-up:** from a team, press «Nuevo partido», pick format, home and away names, date and time (native pickers), the scores and notes, tick who is called up (the screen says «12 convocados» and warns if the number is out of range), and save. The match opens on its grid.
- **The grid:** one row per player, one column per period, tap a cell to mark it (empty, X, circled X as the domain decides). The player column stays fixed while the periods scroll sideways. A tablet is a window whose shortest side is at least 768 pt: there the buttons, including «Convocatoria», are in the header and the warning strip (at most 80 pt, it scrolls inside itself) sits above the grid. Windows from 600 to 767 pt use the phone layout, with the buttons below the grid. The team, player and match forms scroll and avoid the keyboard.
- **Overtimes and Undo:** add and remove overtimes (a question first if the last one has marks) and undo the last actions, also after going to the call-up screen and coming back.
- **Call-up changes during the match:** add a player, remove one (a question first if the player has marks) or create a new player straight from the match.
- **All the warnings and the legend:** light red cells, players in red, «!» and «≠» in the period headers, the "rule impossible" banner and the legend. The screen only draws what the state layer computed from the domain.
- **Everything saved at every tap.** Each mark, overtime, undo and call-up change is written to the SQLite database first and shown only after it was stored. If the write fails, the screen does not change and shows an error banner (always in normal flow, never over the screen: above the toolbar on the match screen, above the list on the call-up screen, inside the form on the forms, so «Guardar» and the buttons stay tappable).
- **Kept out of backups.** Android builds write two rule files that exclude every backup domain; iOS launch code marks the database folder as excluded from iCloud and computer backups (RF-088).

**Not in D2 (all D3):** substitutions and the long-press menu, the questions «sub or starter?» and «who leaves?», the list of a team's matches, editing or deleting a match, changing the format of a match, and squad upkeep. A tap that needs a question does nothing yet.

**Important:** none of this was run on a device, a simulator or Maestro. What is proven is the Jest tests (about 2,870) and the local `verify`. CI has not run on this branch yet.

### How: files and new pieces

| Area                     | Files                                                                                                                                                                                                                                    | Requirements                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Native config            | `plugins/with-backup-exclusion.js`, `app.json`                                                                                                                                                                                           | RF-088, E-028                                            |
| Data: schema and open    | `src/data/schema.ts`, `migrations/` (generated), `database.ts`, `database-types.ts`, `scripts/bundle-migrations.mjs`, `drizzle.config.ts`                                                                                                | RF-011, RF-082                                           |
| Data: repositories       | `team-repository.ts`, `player-repository.ts`, `match-repository.ts`, `call-up-repository.ts`, `grid-repository.ts`, `records.ts`                                                                                                         | RF-014, RF-019, RF-032 to RF-035, RF-056, RF-058, RF-085 |
| Domain (small additions) | `squad-validation.ts`, `team-order.ts`, `match-input.ts`, `match-date.ts`                                                                                                                                                                | RF-013 to RF-015, RF-025 to RF-027                       |
| State: squad and match   | `squad-store.ts`, `new-match-draft.ts`, `new-match-save.ts`, `route-params.ts`, `save-result.ts`, `format-options.ts`, `database-ready.ts`, `app-stores.ts`                                                                              | RF-011 to RF-035, RF-085                                 |
| State: open match        | `match-session-store.ts` plus slices `match-session-call-up.ts`, `match-session-marks.ts`, `match-session-undo.ts`; `match-session-grid.ts`, `match-view.ts`, `match-view-grid.ts`, `match-view-warnings.ts`                             | RF-044 to RF-059, RF-060 to RF-067, RF-087               |
| Screens (routes)         | `src/app/_layout.tsx`, `index.tsx`, `teams/new.tsx`, `teams/[teamId]/{index,edit}.tsx`, `teams/[teamId]/players/new.tsx`, `teams/[teamId]/matches/new.tsx`, `matches/[matchId]/{index,call-up,new-player}.tsx`                           | US1 to US4                                               |
| UI: forms and dialogs    | `team-form.tsx`, `player-form.tsx`, `match-form.tsx`, `score-fields.tsx`, `date-time-field.tsx`, `date-time-field-android.tsx`, `form-scroll.tsx`, `call-up-selector.tsx`, `choice-dialog.tsx`, `not-found.tsx`, `save-error-banner.tsx` | RF-012 to RF-035, RF-083                                 |
| UI: grid and warnings    | `src/ui/grid/` (`grid-layout.ts`, `match-grid.tsx`, `grid-cell.tsx`, `column-header.tsx`, `player-column.tsx`, `grid-toolbar.tsx`), `src/ui/warnings/`                                                                                   | RF-076 to RF-081, RF-060 to RF-067, RF-087               |
| Texts                    | `src/i18n/es.json` (all new texts)                                                                                                                                                                                                       | RF-012                                                   |
| Tooling                  | `scripts/check-focused-tests.sh`, `tests/scripts/`, `tests/support/` (in-memory database, flow helpers), `e2e/*.yaml` (six Maestro flows), ESLint `max-lines` for tests                                                                  | rules of D2                                              |

New dependencies (T024, audited by Security): `expo-sqlite`, `drizzle-orm`, `zustand`; for development `drizzle-kit`, `better-sqlite3` and its types. `expo` and `expo-dev-client` moved to the SDK 58 patch versions that Expo Doctor asked for.

### Why: decisions made

- **Data first, screens last.** Order of the work: database, repositories, state, then screens. Each layer was tested before the next existed, so a screen never had to guess what the layer below does.
- **The view model lives in the state layer.** `buildMatchView` turns the grid and the warnings into a plain object (columns, cells, counters, colours, `canUndo`). The screens only read it. This is rule 8 in practice: no rule is computed in the interface.
- **The session store is built from slices.** `match-session-store.ts` joins three files (call-up, marks, undo). Each slice gets a small `host` object and the store stays under the 60-line and 250-line limits. D3 will add questions to the same slices.
- **Save first, publish after.** Every action writes to SQLite and only then updates what the screen shows; a thrown write becomes `saveFailed` and changes nothing else (RF-085).
- **Create-once guard.** The new-match draft remembers its saved result, so a second tap on «Guardar» cannot create a second match. A failed save is not remembered, so the retry works.
- **Ids in routes, never names.** Routes carry only a number (`/matches/1`), parsed by `parseMatchId`; an odd value shows the not-found screen. Names never go in a URL (Security checked it).
- **Trimming lives only in the domain.** `validateTeamInput`, `validatePlayerInput` and `validateMatchInput` return the cleaned value; the state layer saves only that (Fernando's answer of 2026-11-12).
- **Foreign-key columns are NOT NULL.** The plan was silent; it protects integrity. Approved by Fernando on 2026-11-14.
- **Two picker files, not one.** The `@expo/ui` drop-in gives native pickers on both platforms. iOS keeps the inline pickers in `date-time-field.tsx`. Android uses `date-time-field-android.tsx`: its «Fecha» and «Hora» buttons open the picker as a dialog, and only a confirmed selection reaches the draft. Approved by Fernando on 2026-11-14.
- **Codex re-run: the Android picker.** The inline Android picker, once drawn, emits its initial value (12:00) as soon as it mounts, so an untouched match saved a time nobody chose and clearing a time brought 12:00 back (RF-025, RF-083). The fix: the picker is not drawn until the button is pressed, it is unmounted after confirming or dismissing, and a dismissal changes nothing. The old test double only emitted real taps, so it hid the bug; the new tests emit the mount value too.
- **Codex re-run and third run: forms, cache key.** `FormScroll` (`src/ui/form-scroll.tsx`) wraps the team and player forms so they scroll and avoid the keyboard. The Stryker cache key now includes `tests/setup/**`, so a change to the property-test setup cannot reuse old mutant results.
- **Codex sixth run: phones in landscape.** On a 667 × 375 phone with both banners and a long legend the grid was left without usable height. Decided by Fernando on 2026-11-15: in landscape the call-up button and the grid buttons go in the navigation header (`buttonsInHeader` is true for a tablet or a window wider than tall), portrait phones keep the toolbar, and the warnings sit in a bounded strip of 60 pt that scrolls inside itself on every phone (80 pt on tablets). A landscape phone keeps at least 132 pt for the grid, also after a failed save. The look on a real phone is for Fernando (T057).
- **Codex third run: tablet threshold 768 and a scrolling strip.** Twelve rows of 44 pt fit without scrolling only by construction from 768 pt of shortest side, so a tablet is now a window with its shortest side at least 768 pt and 600-767 pt use the phone layout. The warning strip (`warning-strip`) keeps a maximum of 80 pt and scrolls inside itself, so no explanation is cut off. The trade-off: smaller tablets get the phone layout, and a long warning list needs a small scroll. Decided by Fernando on 2026-11-14.
- **Codex third run: the match screen restores its session on focus.** Opening another match link and pressing Back left the first grid with a closed session. A screen must not close a session it does not own: cleanup now closes only the session of its own match, and on focus the screen restores its session if it is missing or belongs to another match, keeping Undo when coming back from child routes.
- **Codex third run: the save-error banner in normal flow.** The banner was absolutely positioned at the bottom of the scroll content, which covers «Guardar» after a failure. On the forms it is now an ordinary element in the flow; on the match and call-up screens it is in normal flow too, above the toolbar or the list (fourth run), so it never covers a button.
- **The 250-line limit also covers tests.** ESLint `max-lines` now checks `tests/`, `scripts/` and `plugins/` (T080), so big test helpers were split.
- **A script for focused tests.** `scripts/check-focused-tests.sh` looks for `it.only`, `xit` and similar at the start of a line, so a test title with the word "fit" no longer fails it (D1 lesson).
- **Codex finding F1: an invalidated draft.** When the new-match draft was reset for a team that no longer loaded, it quietly kept the old data. Now `reset` first empties the draft, never throws, and returns a boolean (`reset(teamId): boolean`); the route reads that `false` and shows the not-found screen. Lesson: a reset that can fail must leave a safe empty state first and say so, instead of leaving stale data behind.
- **Codex finding F4: a screen that reloads on focus.** The team screen stays mounted under the match, so players created there did not show on Back. It now calls `openTeam` inside `useFocusEffect` (and once before the first render), so it reloads every time it comes back into view.
- **Codex finding F3: no fallible read after a commit.** If a read fails after the write was saved, the coach sees "save failed" for something that was saved. The rule is: read first, commit, publish from memory. Real code from `src/state/squad-store.ts`:

  ```ts
  // The list is read first: once the write is committed no read is left that could fail (RF-085).
  before = sortedTeams(db);
  saved = write({ ...checked.value, defaultFormat: input.defaultFormat });
  ```

  After the write, the new list is built from `before` and the saved team, never from a new database read. The call-up and marks slices of the session store follow the same rule.

- **Codex finding F2: the grid sized from its measured viewport.** The grid used the window size, which is wrong when headers or the safe area take space. Now `MatchGrid` wraps its scroll in a `flex:1` view with the test id `grid-viewport`, and its `onLayout` gives the real width and height to the pure function `viewportLayout` in `src/ui/grid/grid-layout.ts`. Window sizing stays only as the fallback before the first measurement.
- **Incremental Stryker locally.** `STRYKER_INCREMENTAL=1 npm run verify` reuses the last mutation results. Because Stryker does not see `tests/support/`, a full run is forced in T030, T037, T061 and whenever those helpers or Jest or Stryker configs change.
- **ADR-005 and the osv exception.** ADR-005 adds `better-sqlite3`, `@expo/ui` and `expo-splash-screen` to the stack table. `osv-scanner.toml` ignores one advisory (GHSA-67mh-4wv8-2f99) in an old esbuild that only `drizzle-kit` pulls in: it is the CORS of esbuild's dev server, never used, never in the app; it expires on 2027-02-10.

### To learn

Real code, from the repository.

**A Zustand vanilla store, split in slices** (`src/state/match-session-undo.ts`). `zustand/vanilla` has no React in it, so the state layer stays free of `react-native`. A slice is a file that builds some of the store's actions from a `host` (`db`, `get`, `set`), not from the whole store.

```ts
const result = undoLast(current.grid, history);
try {
  saveCellChanges(host.db, current.matchId, result.changes);
} catch {
  // The entry stays in the history: a failed undo does not lose it.
  return failed(host);
}
return publish(host, current, result.grid, result.history);
```

The order is the rule: the domain computes, the database saves, and only then the screen's data changes.

**Drizzle synchronous transactions** (`src/data/grid-repository.ts`). expo-sqlite is synchronous, so `db.transaction` takes a plain function. If it throws, everything it wrote is rolled back. `tx` is itself a database, so helpers that expect one accept it.

```ts
db.transaction((tx) => {
  assertEntriesBelongToMatch(
    tx,
    matchId,
    last.map((change) => change.cell.entryId),
  );
  for (const { cell, state } of last) {
    /* delete the row when the state is "empty", otherwise upsert it */
  }
});
```

The foreign key alone would accept an entry of another match, so ownership is checked before the first write.

**The database folder is the same everywhere** (`plugins/with-backup-exclusion.js`). A config plugin edits the files `prebuild` generates, so `android/` and `ios/` are never touched by hand. The iOS block runs before React Native starts. It marks a _folder_, and expo-sqlite's default folder is `documentDirectory + "SQLite"`, which is why `openDatabaseSync(name)` is called with no `directory` (a test asserts it).

```js
application.$["android:dataExtractionRules"] = `@xml/${RULES_NAME}`;
// ...and in the Swift it injects:
//   values.isExcludedFromBackup = true
//   try databaseFolder.setResourceValues(values)
```

**Expo Router: a screen opens the session it shows and closes only its own** (`src/app/matches/[matchId]/index.tsx`, `useOwnSession`). `useFocusEffect` runs when the screen is focused, also when it comes back from a route pushed over it, and opens the match only if the session is not already open for it, so Undo survives a trip to the call-up screen (T084) but a `/matches/999` on top never leaves the grid without its session. The cleanup of an effect runs only when the screen is popped, and it closes the session only if the view's `matchId` is this screen's.

```tsx
useFocusEffect(
  useCallback(() => {
    const { status, view, openMatch } = store.getState();
    const owned = status === "open" && view?.matchId === id;
    if (id !== null && !owned) openMatch(id);
  }, [id, store]),
);
```

The new-match form works the same way for its draft: all forms share one draft, so each form resets it in `useFocusEffect` on opening and whenever the draft belongs to another team, and «Guardar» always saves for the team of its own route (Codex fourth run).

**A pure layout function** (`src/ui/grid/grid-layout.ts`). Sizes and scroll flags come from numbers in and numbers out, so they are tested without a screen. `Math.max` and `Math.min` clamp a value between a minimum and a maximum.

```ts
const rowHeight = Math.max(
  MIN_ROW_HEIGHT,
  Math.min(MAX_ROW_HEIGHT, spacePerRow),
);
// ...
horizontalScroll: fittingWidth < MIN_CELL_WIDTH,
verticalScroll: input.players * rowHeight > rowsSpace,
```

**An in-memory database for tests** (`tests/support/test-database.ts`). Tests use `better-sqlite3` in memory and run the _real_ migration SQL, so the tests see the same tables as the app. Foreign keys are turned on before migrating, as the app does.

```ts
const sqlite = new Database(":memory:");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });
migrateTestDatabase(db);
return db;
```

**fast-check through a store** (`src/state/match-session-store.undo.properties.test.ts`). Random sequences of taps, overtimes and undos run on the real store and database. After every step the test checks that no column has more than five X and that the database holds exactly the grid the screen shows.

```ts
expect(mostStarters(after)).toBeLessThanOrEqual(5);
expect(savedGrid(db, matchId)).toEqual(after);
expect(state.saveFailed).toBe(false);
```

**A check that does not cry wolf** (`scripts/check-focused-tests.sh`). Two anchored patterns: one for a call at the start of a line, one for a focused function used as a value. A bare search for "fit" would match the title "4 periods fit at 375 pt".

```bash
PATTERN_CALL='^[[:space:]]*((it|test|describe)(\.[A-Za-z]+)*\.(only|skip)|x(it|test|describe)|f(it|test|describe))(\.[A-Za-z]+)*(<[^>]*>)?[[:space:]]*[(`]'
```

**Screen tests ask like a user** (`tests/app/new-match.form.test.tsx`). React Native Testing Library finds elements by role and visible Spanish name, as a screen reader would, and `findBy...` waits for async renders.

```tsx
screen.getByRole("radio", { name: `${periods} periodos` });
await screen.findByRole("button", { name: "Nuevo jugador" });
```

### To check it

On the Mac, in the repository:

```bash
npm run verify                              # everything, as CI does
STRYKER_INCREMENTAL=1 npm run verify        # same, reusing mutation results (about 1 min)
STRYKER_INCREMENTAL=1 STRYKER_FORCE=1 npm run verify   # full local run (about 6 min)
npx jest src/state/match-session-store      # only the session store
```

Measured on 2026-11-13 (verifier, local, not CI): about 2,870 Jest tests green after the Codex fixes (2,694 at the first measurement, about 2,777 after the first four); `src/domain/` coverage 100 % lines and 96.63 % branches; Stryker kills 94.78 % of mutants (still the same after the Codex fixes) (threshold 80 %); full run 6 min 14 s, incremental run 1 min 9 s; `npm audit`, `osv-scanner`, gitleaks and semgrep clean.

#### How to run Maestro (T061)

Maestro drives the real app from outside, for what Jest cannot prove (native pickers, `maxLength`, closing and reopening the app).

1. Install Maestro version 2.7.0 or later. It is **not** an npm package: use the official installer from maestro.dev.
2. Build a Release app (not the dev client, so no developer menu is in the way): `npx expo run:ios --configuration Release` or `npx expo run:android --variant release`. Keep one simulator or emulator open.
3. Run the six flows, one after another:

```bash
maestro test e2e/us1-teams-and-players.yaml
maestro test e2e/us1-form-interruption.yaml
maestro test e2e/us2-match-and-call-up.yaml
maestro test e2e/us3-planning.yaml
maestro test e2e/us3-interruption.yaml
maestro test e2e/us4-warnings.yaml
```

4. Paste each output in `review.md`. The flows were written without running them, so expect to fix some steps (risks are in the Pending lines of T036, T048, T056 and T060). `us4-warnings.yaml` is written for a tablet screen.

#### Device checklist (Fernando)

- **T057, grid layout and Codex layout fixes:** iPhone, 5th-gen iPad and an Android phone, portrait and landscape; also an Android pick of «Fecha» and «Hora» (an untouched match must save no time), forms with the keyboard open in landscape, a window of 600-767 pt (phone layout) and one of 768 pt or more (tablet header, scrolling strip): 6 periods and 10 players on a 375 pt phone fits with no sideways scroll; 8 periods scrolls sideways with cells of at least 44 pt; 12 players with every banner and the legend fit on the iPad in landscape; 13 players scroll down; the player column never moves sideways; rotate with marks on the grid.
- **Colours by eye:** light red cells and players in red are visible on the three devices (Maestro only reads text).
- **iOS backup exclusion:** on the simulator, `xattr -l` on the app's `Documents/SQLite` folder must show `com.apple.metadata:com_apple_backup_excludeItem`.
- **Android backup (E-028):** `npx expo prebuild --platform android --clean`, check the two attributes in the manifest, then on an emulator `adb shell bmgr backupnow`; a new phone must receive no data.
- **iPad 5th gen, 100 ms repaint:** the slow-motion measurement in T060: a tap must repaint the grid and its warnings within 100 ms.
- **Modals and Android Back:** the new-team, new-player and new-match modals; Back must not close a confirmation dialog.

### Pending

Known D2 limits (stated in the spec and tasks, not bugs to fix now):

- A tap on an empty cell of a period that already has five X in the rule window, or on an X in a period with a sub, does nothing yet (the questions are D3).
- A saved match cannot be reopened from the interface in D2: only by the deep link `planificadorperiodos://matches/1`. After Back from the grid there is no way back to it until the team's match list (T071, D3).
- A team with no players shows an empty list with no text.
- A failed read reuses the empty and not-found states, with no new text.

Not done or not verified:

- **The six Maestro flows were written but NOT run.** T036, T048, T056 and T060 are unticked in `tasks.md` (flows written, not run) until their Maestro runs are recorded: those four tasks are NOT done (Codex F5). T057 (device check of the grid layout) is not done. The iPad 100 ms measurement, the `xattr` check and the Android E-028 test are not done. So T057 and T061 stay unticked too.
- **CI has not run yet** on this branch. The first full Stryker run on CI (about 25 minutes) and the incremental runs, with whether the cache was restored, are still to be recorded in `review.md`. A note: `tests/support/` and `tests/setup/` are part of the cache key, so changes there force a full run.
- **Deviations:** FK columns NOT NULL, and the picker files (iOS inline, Android dialog) were approved by Fernando on 2026-11-14 and are recorded in `plan.md` "Deviations", with the later ones up to 2026-11-15.
- **Security:** SEC-D2-1 (unused Android permissions) is done in T088 (`android.blockedPermissions`; `INTERNET` only for `APP_VARIANT=production`; the release needs an `eas.json` profile that sets it and a check with `aapt dump permissions`, listed in `docs/security.md`). SEC-D2-3 (the silent failure to open the database) is done in T087 (message and «Reintentar»). Still open for the release: SEC-D2-7 (the INTERNET block fails open if `APP_VARIANT` is forgotten), the dark-mode look of the failure message (SEC-D2-9) and the iOS `xattr` check.
- **Mutation survivors:** the 8 in `undo.ts` are classified (equivalent or defence only). The other 19 (`bounded-flow.ts` 9, `marking.ts` 5, `rule-feasibility.ts` 2, one each in `column.ts`, `overtime.ts`, `player-order.ts`) are probably the D1 set but are not yet classified one by one. `team-order.ts` gets no mutants (finding M1).
- **Codex review:** it ran three times. Round 1: 4 blocking findings (F1 to F4), all fixed, plus F5 (the four unticked tasks above) and F6 (a stale claim removed). Round 2: 2 blocking (Android time, tablet 12 rows), one important (forms) and one minor (cache key), all fixed. Round 3: 4 blocking (match screen restore, save-error banner, tablet 768 threshold, scrolling strip) and one minor (this summary's picker paragraph), all fixed. Anything still open is listed in `review.md`; a fourth run is recorded there if the orchestrator runs it. **The real look on devices of all these layout fixes (forms, tablet threshold, strip, banner, Android picker) is unverified (T057).** Codex also checks that these explanations match what was done.
- **Before D3 starts,** the Planner reviews D3's tasks with the lessons of D2, including the slice files of the session store.

**Codex review rounds (state at the end of the D2 close, 2026-11-14).** Seven Codex rounds ran: 4, 2, 4, 3, 2, 2 and 1 blocking findings (the first five are the state at the close; rounds 6 and 7 are described below). All of them were fixed except one, which is open on purpose and waits for Fernando:

- **Android native calendar language (fifth run, finding 1, RF-012).** The Android date and time dialogs follow the device language for month and day names, because `@expo/ui` reads `LocalConfiguration.locales[0]` and has no `locale` prop on Android. Only the button labels are Spanish. Options: accept the risk and verify on an English-configured phone, or approve a native localization config (Android `localeConfig` or `app.json` `locales`) as a follow-up. Also pending: Fernando's approval of the new text «Aceptar» (`common.accept`).
- Codex never approved a round. A sixth run (2 blocking findings, fixed in `864302a`: phone landscape buttons in the header and bounded phone warnings) and a seventh run (1 blocking, 1 minor, below) were made after this paragraph was first written. Each round found new problems after the fixes of the previous one; the remaining checks (layout, keyboard, picker language, backup, inspector) are best done on devices (T057).

**Decisions taken by Fernando on 2026-11-14 (chat).** The Android calendar language is accepted for D2 and will be verified on an English-configured Android phone (a follow-up task is opened only if it shows English). The text «Aceptar» (`common.accept`), the foreign keys `NOT NULL` and the separate Android date and time component are approved. Two small tasks are added to D2 before the PR leaves draft: a message with «Reintentar» when the database fails to open (SEC-D2-3; two new texts that Fernando approves before they are written to `es.json`) and blocking the unused Android permissions with `android.blockedPermissions` (SEC-D2-1; `INTERNET` only for the production profile). The device checks and the six Maestro flows are done by Fernando with a step-by-step guide. D2 is closed (CI green, device checks, PR ready, merge) before D3 starts with the Planner's review.

**Codex rounds 6 and 7 (2026-11-15).** Round 6 asked for the landscape-phone buttons in the header and the bounded warning strip on every phone (fixed in `864302a`; the tablet threshold is 768 pt, approved by Fernando on 2026-11-15, and the earlier 600 pt and toolbar decisions are historical). Round 7 found that two new-match forms of the same team shared one draft: after saving the later form and going Back, the earlier form reopened the saved match instead of creating its own. Fix: the draft now records which mounted form owns it (`formId`, from React `useId`), and a form that regains focus while the draft belongs to another form starts a fresh draft. Seen on a device: still for Fernando (T057). The seventh run's minor finding was these outdated statements, now corrected here and in T053.
