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
- **The grid:** one row per player, one column per period, tap a cell to mark it (empty, X, circled X as the domain decides). The player column stays fixed while the periods scroll sideways. A tablet is a window whose shortest side is at least 768 pt: there the buttons, including «Convocatoria», are in the header and the warning strip (at most 80 pt, it scrolls inside itself) sits above the grid. Windows from 600 to 767 pt use the phone layout. On a phone in portrait the buttons are below the grid; on a phone in landscape «Convocatoria» and the grid buttons go in the native header, and the warnings sit in a bounded strip that scrolls inside itself (approved by Fernando on 2026-11-15). The team, player and match forms scroll and avoid the keyboard.
- **Overtimes and Undo:** add and remove overtimes (a question first if the last one has marks) and undo the last actions, also after going to the call-up screen and coming back.
- **Call-up changes during the match:** add a player, remove one (a question first if the player has marks) or create a new player straight from the match.
- **All the warnings and the legend:** light red cells, players in red, «!» and «≠» in the period headers, the "rule impossible" banner and the legend. The screen only draws what the state layer computed from the domain.
- **Everything saved at every tap.** Each mark, overtime, undo and call-up change is written to the SQLite database first and shown only after it was stored. If the write fails, the screen does not change and shows an error banner (always in normal flow, never over the screen: above the toolbar on the match screen, above the list on the call-up screen, inside the form on the forms, so «Guardar» and the buttons stay tappable).
- **Kept out of backups.** Android builds write two rule files that exclude every backup domain; iOS launch code marks the database folder as excluded from iCloud and computer backups (RF-088).

**Not in D2 (all D3):** substitutions and the long-press menu, the questions «sub or starter?» and «who leaves?», the list of a team's matches, editing or deleting a match, changing the format of a match, and squad upkeep. A tap that needs a question does nothing yet.

**Important:** none of this was run on a device, a simulator or Maestro when it was written (2026-11-14). Update 2026-11-20: the six Maestro flows were run on iOS simulators (see below and `review.md`); Android and the device checks are still pending. What is proven is the Jest tests (about 2,870) and the local `verify`. CI has not run on this branch yet.

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
- **Codex finding F4: a screen that reloads on focus.** The team screen stays mounted under the match, so players created there did not show on Back. It now calls `openTeam` inside `useFocusEffect`, so it reloads every time it comes back into view. (Until 2026-11-21 it also called it once inside a `useState` initialiser, before the first render; F-03 removed that, see the last section.)
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

The new-match form works the same way for its draft: all forms share one draft, which records the mounted form that owns it (`formId`, from React `useId`). Each form resets the draft in `useFocusEffect` on opening and whenever the draft belongs to another form, also another form of the same team, so returning to an earlier form starts a fresh draft and never reuses a match another form saved; «Guardar» always saves for the team of its own route (Codex fourth and seventh runs).

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
- Small change (iOS 26 header): every screen sets `headerTransparent: false` so content starts below the header (`small-change-ios26-header.md`); the device look is still to be checked on the iPad simulator.

Not done or not verified:

- **Maestro: run on iOS simulators on 2026-11-20, not on Android.** The six flows pass on an iPhone 17 simulator (five of them) and an iPad Pro 11-inch in landscape (`us4-warnings`), with iOS 27.2 and Maestro 2.12.1; the details are in `review.md` and in `small-change-maestro-ios-flows.md`. On iOS the time of the match form is only checked up to «12:00» (decision of Fernando, 2026-11-20). NOT run (on 2026-11-20): Android, iPad in portrait, iPhone in landscape. Before that run the flows had been written but not run. **Update 2026-11-21:** the first Android run is in the last section of this file. T048, T056 and T060 are unticked in `tasks.md` until their Maestro runs pass on both platforms: those three tasks are NOT done (Codex F5). T036 was ticked on 2026-11-21, when its two flows also passed on Android. T057 (device check of the grid layout) is not done. The iPad 100 ms measurement, the `xattr` check and the Android E-028 test are not done. So T057 and T061 stay unticked too.
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

**Codex round 8 (2026-11-15).** No blocking findings. One important finding, fixed by amending E-021 (decided by Fernando on 2026-11-15): the number field stops at two characters (D42), so typing or pasting 100 leaves "10", with no message, and 10 is saved; 07 and a missing number still show the message. One minor finding (two outdated passages in this summary: landscape-phone header buttons and draft ownership by mounted form), fixed.

## Change of 2026-11-18 · Time field without a time (RF-083, E-032, E-033)

Branch `fix/match-time-empty-state`, medium change, approved by Fernando on 2026-11-18. Tasks T089–T091 done; T092 (close) waits for the device checks and the merge.

### What was done and what changes for the user

On the iPhone, «Quitar hora» seemed to do nothing: the match had no time, but the time wheel still showed 12:00. Now the time field of the new-match form has two clear states, on iPhone and Android. Without a time it shows «Sin hora» and an «Añadir hora» button, and no wheel. «Añadir hora» gives the match 12:00 and shows the wheel and «Quitar hora»; «Quitar hora» goes back to «Sin hora». On Android, «Añadir hora» also opens the time dialog at 12:00, and «Cancelar» keeps 12:00. Adding the time again after clearing it always gives 12:00 (D51).

### How: files and new pieces

- `src/ui/no-time.tsx` (new): `NoTime`, the «Sin hora» text and the «Añadir hora» button (44 pt touch target).
- `src/ui/date-time-field-shared.ts`: `ADDED_TIME = { hour: 12, minute: 0 }`.
- `src/ui/date-time-field.tsx` (iOS) and `src/ui/date-time-field-android.tsx` (Android): a `TimePart` component that draws the time part from the `time` prop only.
- `src/i18n/es.json`: `match.noTime` «Sin hora» and `match.addTime` «Añadir hora».
- Tests: `tests/app/new-match.time-states.*` (iOS, Android, sequences and the real «Guardar»), `src/ui/*.test.tsx` for the field pieces, `tests/e2e/us2-flow.time.test.ts`; the Android picker double gained `setDialogReportsOnMount` to test the dialog's mount guard. The US2 Maestro flow learns «Añadir hora».
- Not touched: `src/domain/`, `src/state/`, `src/data/`, `match-form.tsx`.

### Why: decisions along the way

- **The data decides.** The field shows «Sin hora» when the draft's `time` is `null`, and «Añadir hora» writes 12:00 through the existing `setTime`. The screen and what «Guardar» saves can no longer disagree, which was the iPhone bug. A local "picker shown" `useState` was discarded for that reason.
- **12:00 lives in `src/ui/`**: it is the value the picker offers, not a regulation rule.
- **«Quitar hora» calls `onClearTime()` with no arguments** (`onPress={() => onClearTime()}`), so the press event is not passed on.
- **The Android mount guard** (`armed` in `PickerDialog`) stays: with it removed, exactly the two mount-guard tests go red (checked on the real file, then restored).
- Lint's 60-line limit led to the separate `TimePart` component in both fields.

### To learn, with the real code

- **Derived state:** `time === null ? <NoTime onAdd={() => onTimeChange(ADDED_TIME)} /> : …` — the component keeps no copy of the time, it just follows its props.
- **Arrow wrappers for callbacks:** `onPress={onClearTime}` would call it with the press event; `() => onClearTime()` calls it with nothing.
- **Tests proving absence:** `queryByText("Quitar hora")` returning `null`; `jest.replaceProperty(Platform, "OS", "android")` to test the Android field.
- **Tests that start green:** the whole-form tests of T091 passed at once because T089 and T090 were done; they were checked against copies of the code with planted bugs (for example saving `draft.time ?? "12:00"`), and each bug was caught.

### To check it

```bash
npm run verify
```

- **iPhone:** new match → «Sin hora» and «Añadir hora», no wheel. «Añadir hora» → 12:00, wheel and «Quitar hora». Wheel to 18:30, then «Quitar hora» → «Sin hora». «Añadir hora» again → 12:00, not 18:30.
- **Android:** «Añadir hora» → the dialog opens on 12:00; «Cancelar» keeps 12:00; the «Hora» button reopens it; choose 18:30 and «Aceptar».

### Pending

- Fernando's checks on iPhone and Android, and the merge (T092).
- The Maestro flow was updated on 2026-11-18 and run on an iPhone 17 simulator on 2026-11-20: its iOS «12:00» check passes. Its Android date and time steps were run on 2026-11-21 on an emulator and work (18:30 chosen with «Aceptar»); the rest of that flow stops earlier on Android because of a problem of the app (last section).
- The match details half of E-032 is in T072 and T073 (D3).
- Codex found 0 blocking findings. Its other three findings are in code this branch does not change, and Fernando accepted them as pending on 2026-11-18:
  - **F-01, important:** the keyboard offset in `form-scroll.tsx`; «Guardar» may stay partly hidden on an iPhone in landscape. Fixed on 2026-11-20 on `fix/form-keyboard-offset` (see the last section).
  - **F-02, minor:** a picker drift on the March daylight-saving day.
  - **F-03, minor:** M-01, `openTeam()` in a `useState` initialiser. Fixed on 2026-11-21 on `fix/team-forms-render-updates` (see the last section).

## Fix of 2026-11-20 · The keyboard no longer hides the focused field of a form (F-01, RF-076)

Branch `fix/form-keyboard-offset`, small change, form approved by Fernando on 2026-11-20 (`small-change-form-keyboard-offset.md`). One commit holds the code and its tests (`c5f5df4`).

### What was done and what changes for the user

On the iPhone, opening the keyboard in the new-match, new-team or new-player form used to leave the form where it was: the field you were typing in, and everything below it, «Guardar» included, stayed under the keyboard. Now, when a text field gets the focus, the form scrolls so that the field sits above the keyboard, and «Guardar» can still be reached by scrolling. It was seen first in landscape and then also in portrait.

### How: files and new pieces

| Piece                                     | What it does                                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/form-scroll.tsx`                  | The one component the three forms share. On iOS the `ScrollView` adjusts its own insets and the `KeyboardAvoidingView` adds no padding. On Android nothing changes: `behavior="height"`. |
| `tests/app/form-scroll.keyboard.test.tsx` | Three tests: on iOS the scroll adjusts its insets, on iOS the avoiding view adds no padding, on Android it keeps `"height"` and the scroll does not adjust.                              |

### Why: decisions along the way

- **The cause.** `KeyboardAvoidingView` works out how much the keyboard overlaps from its own position on the screen. These forms sit under a native header and, on iOS, inside a modal sheet that does not start at the top, so its estimate was wrong (`keyboardVerticalOffset` is 0 by default).
- **Why `automaticallyAdjustKeyboardInsets`.** The system itself knows where the keyboard is and where the focused field is, wherever the sheet sits, so there is no offset to guess. It needed no new dependency. I checked on the simulator that it works inside the sheet before accepting it, as the form said.
- **Why not both.** Keeping the padding of `KeyboardAvoidingView` on iOS would adjust twice, so on iOS it gets no `behavior`.
- **Discarded.** `react-native-keyboard-controller`: a new dependency with native code, a root provider and `react-native-reanimated`; that is a medium change with its own entry in `plan.md`. The fallback, a measured `keyboardVerticalOffset`, was not needed.
- **Found along the way.** Rotating the device with the keyboard open does not scroll again until another field gets the focus. Left as it is: it needs a keyboard-event listener, and it was not asked.

### To learn, with the real code

- **`automaticallyAdjustKeyboardInsets`:** a `ScrollView` prop, only on iOS, that makes the scroll view add the keyboard's height to its bottom inset and scroll the focused field into view: `automaticallyAdjustKeyboardInsets={ios}` in `form-scroll.tsx`. On Android the prop does nothing, so the shared component passes `ios` and keeps the other mechanism there.
- **`KeyboardAvoidingView` without `behavior`:** with `behavior` undefined it does nothing, which is what we want on iOS now.
- **Testing a component you cannot see inside:** RNTL 14 only sees host elements, so the `behavior` prop is read by replacing the React Native module with a spy through `jest.mock` and reading `jest.requireMock(...).default.mock.calls.at(-1)`. The platform is switched with `jest.replaceProperty(Platform, "OS", "android")`.

### To check it

```bash
npm run verify
```

- **iPhone, portrait:** new match → tap «Notas». The form scrolls and the field stays above the keyboard; scroll down and reach «Guardar». Do the same in the new-team and new-player forms.
- **iPhone, landscape:** the same; the field you type in stays above the keyboard and «Guardar» can be reached.
- **Android:** open a form, tap the last field, and check that «Guardar» can still be reached (not checked by me).

### Pending

- Not checked: Android, the iPad and a real device. The team and player forms share the component but were not opened on the simulator.
- Rotating the device with the keyboard open does not scroll again until another field gets the focus.
- Codex found 0 blocking findings and 1 important one about these records, fixed in this branch (`review.md`, «Verification and Codex review · fix/form-keyboard-offset, F-01»).

## Maestro on Android · fix/maestro-android-flows (2026-11-21)

Small change, form `small-change-maestro-android-flows.md` approved by Fernando on 2026-11-20. No change in `src/`.

### What was done and what changes for the user

The Maestro flows were run for the first time on an Android phone emulator (Android 17, 1080x2400, English, Release build). Nothing changes in the app for the coach. What changes is what we know: three flows now pass on Android, and the other two stopped at two real problems of the Android app, which the flows found.

### How: files and new pieces

| Piece                                                              | What it does                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/us2-match-and-call-up.yaml`                                   | On Android it opens the date dialog with «Fecha», goes back to March 2026 with the dialog's «previous month» button, taps March 1 by its label and closes with «Aceptar». The time uses the dial's own labels («18 hours», «30 minutes», or their Spanish forms). |
| `e2e/subflows/commit-typed-text.yaml` (new)                        | On Android only, hides the keyboard before each check that a character over the limit is not shown.                                                                                                                                                               |
| `e2e/us1-teams-and-players.yaml`, `e2e/us2-match-and-call-up.yaml` | Call that subflow before the «not visible» checks of the 41st character and of «100» and «1234».                                                                                                                                                                  |
| `e2e/us3-interruption.yaml`                                        | Waits for the list of teams before the three links to match 99, abc and 01.                                                                                                                                                                                       |
| `tests/e2e/*`, `tests/support/e2e-flows.ts`                        | The static checks follow the new steps; a new one checks the Android date branch.                                                                                                                                                                                 |

### Why: decisions along the way

- **Gboard's suggestion strip.** While you type, the keyboard shows the word in its strip and Maestro counts it as visible, so «the 41st character is not shown» failed although the field held 40. Waiting did not help (the strip stays while the word is being composed). Hiding the keyboard ends the word. It is only done on Android: on iOS `hideKeyboard` can close the whole form.
- **Links right after the launch.** On Android a link that arrives about a second after `launchApp` is lost (the list of teams shows). A link that is the launch itself, or one sent to a running app, works. The flow waits for the list; a coach opening a link from another app is the second case.
- **No workaround for the app's problems.** The two flows that stop at a problem of the app are left failing on Android on purpose; a workaround would hide the problem.

### To learn, with the real code

- **Material date dialog:** its month and day names follow the device language, so the flow matches both: `"(?i).*(march 1, 2026|1 de marzo de 2026).*"`.
- **Accessibility labels as selectors:** `tapOn` matches the label that Android exposes, such as «18 hours» or «Ana, P1: casilla vacía».
- **Reading why an assertion fails:** Maestro saves the screen tree of each step in `~/.maestro/tests/<run>/…/screen-hierarchy/`, where the keyboard's strip showed up as an element with the typed word.

### To check it

```bash
npm run verify
maestro --device <android-device> test e2e/us1-teams-and-players.yaml
```

### Pending

- **F-A1, Android keyboard:** fixed on 2026-11-21 on `fix/android-keyboard-offset` (see the last section).
- **F-A2, Android grid:** fixed on 2026-11-21 on `fix/android-grid-scroll` (see the last section).
- **F-A3, Android links:** a link that arrives in the first fraction of a second after the launch (0.3 s measured; 0.8 s and later work) is lost. Accepted as a limit on 2026-11-21 (`review.md`).
- `us4-warnings` is not run on Android (a tablet flow; no tablet emulator). Of the Maestro tasks, T036 is ticked; T048, T056 and T060 stay unticked.

## Fix of 2026-11-21 · The Android keyboard no longer hides the focused field of a form (F-A1, RF-076)

Branch `fix/android-keyboard-offset`, small change, form approved by Fernando on 2026-11-21 (`small-change-form-android-keyboard.md`). One commit holds the code and its tests (`937b497`).

### What was done and what changes for the user

On an Android phone, tapping a text field of the new-match, new-team or new-player form, with the keyboard closed, used to leave the field, and what you typed in it, under the keyboard. Now, once the keyboard has opened, the form scrolls so that the field sits just above it. The iPhone was already fixed in F-01.

### How: files and new pieces

| Piece                                     | What it does                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/form-scroll.tsx`                  | The component the three forms share. A new hook, `useScrollToFocusedField`, listens to `keyboardDidShow` on Android only, measures the focused field and, if the keyboard covers it, scrolls the form by the difference plus 16 points. It keeps the current scroll offset (from `onScroll`) and removes the listener when the form goes away. |
| `tests/app/form-scroll.keyboard.test.tsx` | Six new tests for Android and iOS, added to the three of F-01.                                                                                                                                                                                                                                                                                 |

### Why: decisions along the way

- **The cause.** The app is edge to edge on Android, so the window does not resize for the keyboard. The `KeyboardAvoidingView` with `"height"` already shrinks the visible area, but the tapped field was in view before the keyboard opened and nothing scrolled it again.
- **Why a listener and not another `behavior`.** `"padding"` would shrink the area in the same way and scroll nothing. The `ScrollView` prop that does it on iOS, `automaticallyAdjustKeyboardInsets`, is iOS only.
- **Discarded.** `react-native-keyboard-controller` (`KeyboardAwareScrollView`): a new dependency with native code, a new development build and a root provider; a medium change with an entry in `plan.md`. It was the fallback if the emulator had shown the listener to be unreliable; it did not.
- **Found along the way.** In landscape Android shows the keyboard's own full-screen editor for the field, so the text is visible there but not the form. Left as it is. And `us2-match-and-call-up` now stops at the 500-character notes on Android because typing takes too long for Maestro's 120 s limit: a limit of the flow.

### To learn, with the real code

- **`Keyboard.addListener("keyboardDidShow", …)`:** returns a subscription; the effect returns `() => subscription.remove()` so nothing is left listening.
- **`TextInput.State.currentlyFocusedInput()`:** the field that has the focus, and `measureInWindow` gives its position on the screen, which is compared with `event.endCoordinates.screenY`, the top of the keyboard.
- **Testing without a keyboard:** the tests replace `Keyboard.addListener` with a recorder, so the test sends the event itself, and spy on `ScrollView.prototype.scrollTo`. The ScrollView mock shares one `scrollTo` between tests, so each test clears it first.

### To check it

```bash
npm run verify
```

- **Android phone, portrait:** new match → scroll to «Notas» and tap it. The field stays above the keyboard and what you type is visible; the same with the score fields and with «Local» and «Visitante». Scroll down and reach «Guardar» with the keyboard open.
- **Android phone, landscape:** the same; the text shows in the keyboard's full-screen editor.

### Pending

- Not checked: «Guardar» in landscape, the Android tablet, a real device, a keyboard other than Gboard, and the team and player forms.
- `us2-match-and-call-up` on Android was finished on 2026-11-21 (last section).
- F-A2 (the grid stuck after the last overtime is removed) was fixed on 2026-11-21 (last section); F-A3 (a link lost in the first fraction of a second after the launch) was accepted as a limit on 2026-11-21 (`review.md`).
- Codex found 0 blocking findings and 1 important one about these records, fixed in this branch (`review.md`).

## Fix of 2026-11-21 · The grid no longer stays scrolled after the last overtime is removed (F-A2, RF-076)

Branch `fix/android-grid-scroll`, small change, form approved by Fernando on 2026-11-21 (`small-change-form-android-grid-scroll.md`). One commit holds the code and its tests (`2d9888f`).

### What was done and what changes for the user

On an Android phone, with overtimes the grid scrolls sideways. If the coach marked a cell in an overtime and then removed the overtimes, the grid stayed scrolled to the right: the first columns (P1, P2) sat behind the player column and could not be reached until the match was reopened. Now the grid goes back to where it can be, with every column in reach.

### How: files and new pieces

| Piece                                    | What it does                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/grid/match-grid.tsx`             | New hook `useOffsetInRange`: the horizontal `ScrollView` reports its offset (`onScroll`); the largest offset is `max(0, columns × cell width − (viewport width − player column))`. When that value falls below the current offset, the grid scrolls to it without animation. With the columns fitting it is 0. `HeaderRow` is the header row taken out of `MatchGrid` to keep the function under the lint limit. |
| `src/ui/grid/match-grid.offset.test.tsx` | Six tests of the cases above.                                                                                                                                                                                                                                                                                                                                                                                    |

### Why: decisions along the way

- **The cause.** With 9 columns of at least 44 pt on a 411 pt phone, the columns do not fit and the horizontal scroll is on. After removing the overtimes they fit, `scrollEnabled` becomes false, and Android does not bring the old offset back into range: the coach cannot, either, with the scroll off. iOS does not show it.
- **Why bring the offset back, and not reset it.** Removing one overtime of three only needs the grid to go to the new end; a reset to 0 would also move a coach who was looking at the right place. A `key` that changes with the columns was discarded for the same reason, because it remounts the scroll on every change.
- **No platform check.** The code does nothing while the offset is in range, so it is the same on both platforms.

### To learn, with the real code

- **`ScrollView` offsets:** `onScroll` gives `event.nativeEvent.contentOffset.x`, and the ref's `scrollTo({ x, animated: false })` moves it; `scrollEnabled={false}` stops only the touch, not `scrollTo`.
- **`useEffect` with a derived value:** the effect depends on `largest`, so it runs only when the limit changes, not on every render.
- **Testing a scroll:** the test sends a scroll event, rerenders with fewer overtimes (`screen.rerender`) and reads the `scrollTo` calls of the ScrollView mock, which shares one `scrollTo` between tests, so each test clears it first.

### To check it

```bash
npm run verify
maestro --device <android-device> test e2e/us3-planning.yaml
```

- **Android phone, 6 periods:** open a match, add three overtimes, mark a cell in PR1, remove the overtimes (confirm). P1 to P6 are in place and the first cell can be tapped.

### Pending

- The changed code has not been tested on iOS (the iPhone run used the build from before this change).
- Not checked: the Android tablet, a real device, landscape.
- `us2-match-and-call-up` on Android was finished on 2026-11-21 (last section); F-A3 (a link lost in the first fraction of a second after the launch) was accepted as a limit on 2026-11-21 (`review.md`); `us4-warnings` is not run on Android.
- T056 is ticked (both of its flows pass on both platforms); T048 and T060 stay unticked.
- Codex found 0 blocking findings and 1 important one about these records, fixed in this branch (`review.md`).

## T048 on Android and the warning strip of a phone in portrait · fix/maestro-us2-android-notes (2026-11-21)

Two small changes, forms `small-change-maestro-us2-android-notes.md` and `small-change-form-phone-strip-portrait.md`, both approved by Fernando on 2026-11-21. Code: `src/ui/grid/tablet-budget.ts` and `src/ui/warnings/warning-strip.tsx` (F-A4); the rest is the Maestro flow and its tests.

### What was done and what changes for the user

On an Android phone held in portrait, the warnings above the grid («Con las casillas vacías…», «Convocatoria fuera del rango…») were squeezed into a strip of 60 pt that showed about one line: the second warning was out of view unless the coach scrolled that strip. Now the strip may take 220 pt on a phone in portrait, enough for both banners; on a phone in landscape and on a tablet it is as before. The Maestro flow `us2-match-and-call-up` (T048) now runs to the end on an Android phone emulator and on an iPhone simulator, and T048 is ticked.

### How: files and new pieces

| Piece                                                            | What it does                                                                                                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tablet-budget.ts`                                               | New constant `PHONE_PORTRAIT_STRIP_MAX_HEIGHT = 220`, with the budget of a 640 pt phone in its comment.                                                                    |
| `warning-strip.tsx`                                              | Chooses the bound: 80 on a tablet, 60 on a phone in landscape (`compact`), 220 on a phone in portrait.                                                                     |
| `match-screen.phone-portrait.test.tsx`                           | Eight tests of the bound, when the strip scrolls, the room left for the grid, and landscape and tablet unchanged.                                                          |
| `us2-match-and-call-up.yaml`                                     | Notes typed in three pieces; Android swipe before the call-up taps; scroll to the banners and to the 13th row; subflow `close-number-keyboard` centres «Local» on Android. |
| `tests/e2e/us2-flow.typing.test.ts`, `tests/support/us2-flow.ts` | `typedRuns` / `typedTexts`, and the check that the notes are two or more pieces of at most 170 characters.                                                                 |

### Why: decisions along the way

- **Why 220 and not the approved 160.** The Codex review noted that two banners need more than 160 pt with their padding and margins; measured on the emulator, about 175 at 411 pt wide and about 215 at 375 pt wide. 220 keeps 170 pt for the grid on a 640 pt phone. The form records the change of number.
- **Why the strip changes and not the flow.** A flow that slides the strip hides that the coach cannot read a warning on the device most coaches use. Fernando chose to fix the app.
- **Typing in pieces.** Maestro gives each command 120 s, and typing took 0.18 to 0.6 s per character on the emulator, so 501 characters in one step were too close to the limit.
- **`hideKeyboard` on Android.** It acts as Back when the keyboard is already closed, so the subflow keeps «focus «Local» and press Enter» there, with the label centred.

### To learn, with the real code

- **A bound chosen for one case:** `PHONE_STRIP_MAX_HEIGHT = 60` was documented for "any orientation" but chosen for a landscape phone; the new constant names the case it is for.
- **`compact`:** in `MatchScreen` it is true when the buttons go in the header (a tablet or a landscape window), so `tablet`, then `compact`, then the rest picks the bound without reading the window again.
- **Maestro «visible»:** on Android an element can count as visible while it is under the navigation bar or clipped by a bounded view; `scrollUntilVisible` of the text itself, or a swipe, brings it into view.

### To check it

```bash
npm run verify
maestro --device <android-device> test e2e/us2-match-and-call-up.yaml
```

- **Android phone, portrait:** open a match with 13 players: both banners are in view without scrolling the strip. Turn the phone to landscape: the strip is small again.

### Pending

- The F-A4 change has not been tested on iOS (the iPhone simulator has the app built before it).
- Not checked: a real phone, scaled-up system fonts, an Android tablet, a Spanish-configured device.
- F-A3 (a link lost in the first fraction of a second after the launch on Android) was accepted as a limit on 2026-11-21 (`review.md`); `us4-warnings` is not run on Android; T060, T057, T061 and T092 stay unticked.
- Codex found 0 blocking findings, two important and one minor; the three are fixed in this branch (`review.md`).

## Fix of 2026-11-21 · The team screens no longer update the shared store while rendering (F-03, M-01)

Branch `fix/team-forms-render-updates`, small change, form approved by Fernando on 2026-11-21 (`small-change-form-team-forms-render-updates.md`). One commit holds the code and its tests (`723f84c`).

### What was done and what changes for the user

Nothing changes on screen. In development, opening the edit-team form or the new-player form over the team screen made React print «Cannot update a component (`TeamScreen`) while rendering a different component». The three team routes opened their team in the shared store from inside a render, and a render must not update another component. Now they open it from the route's focus effect.

### How: files and new pieces

| Piece                                                                      | What it does                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ui/use-open-route-team.ts` (new)                                      | The hook `useOpenRouteTeam(id, store, mode)`: opens the team from `useFocusEffect` and returns `ready` once it has. `"every-focus"` (the team screen) opens it on every focus; `"if-another"` (the two forms) on the first focus and later only when the store holds another team. |
| `edit.tsx`, `players/new.tsx`, `index.tsx` under `src/app/teams/[teamId]/` | Use the hook instead of the `useState` initialiser; they draw nothing until it is ready, then keep the same guards (an unknown team shows «No se ha encontrado»).                                                                                                                  |
| `tests/app/team-forms.render-updates.test.tsx` (new)                       | Five tests; three read the React warning from `console.error` and failed before.                                                                                                                                                                                                   |

### Why: decisions along the way

- **Why the initialiser existed.** So that a team left in the store by an earlier screen was never shown, nor received a player. The hook keeps that promise differently: the route draws nothing until its own team is open.
- **Why not just remove it.** The first frame would show «No se ha encontrado» on every open. Drawing nothing for one frame is the smaller evil.
- **A regression caught by a test.** The first version of the hook did not read the team again on the first focus of a form, so a team deleted since its last edit was still shown; an existing test failed and the hook now always reads on the first focus.
- **Discarded.** Moving the opening into the store (`squad-store.ts`): it makes a timing problem of the screens part of the state layer.

### To learn, with the real code

- **A render must be pure:** `useStore(store, …)` subscribes a component to the store; a store update made while another component renders reaches the first one in the middle of that render, and React warns. Effects (`useFocusEffect`, `useEffect`) run after the render, which is where such updates belong.
- **`useFocusEffect(useCallback(…))`:** runs when the screen is focused, including on the first time and every time it comes back after another screen over it is closed; the callback must be stable (`useCallback`), or it runs again on every render.
- **Testing a warning:** `jest.spyOn(console, "error")` and a filter on the message, since React reports these problems as `console.error` and the test would otherwise pass in silence.

### To check it

```bash
npm run verify
npx jest tests/app/team-forms.render-updates
```

- **Android or iPhone:** open a team, then «Editar» and «Nuevo jugador», and go back: the screens show the same data as before and no «No se ha encontrado» appears for a moment.

### Pending

- Not checked: iOS (neither simulator nor device), a real Android device, and the first, empty frame of each route on a slow device.
- Codex found 0 blocking findings and 1 important one about these records, fixed in this branch (`review.md`).

## Two osv-scanner exceptions removed · fix/osv-unused-exceptions (2026-11-21)

Small change, form `small-change-form-osv-unused-exceptions.md`, approved by Fernando on 2026-11-21. One commit (`bf2c2fe`): `osv-scanner.toml` only.

### What was done and what changes for the user

Nothing changes in the app. `osv-scanner.toml` lists the known vulnerabilities of development tools that are accepted for now. Two of its entries, deepmerge and picomatch, were about advisories that their publisher **withdrew** (on 2026-11-16 and 2026-11-18), so they no longer matched anything, and every `npm run verify` warned about them. They are removed, and the header of the file is brought up to date. The seven that remain are still needed.

### How: files and new pieces

| Piece              | What it does                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `osv-scanner.toml` | Two `[[IgnoredVulns]]` blocks deleted (`GHSA-gcqx-w48m-w2h4`, `GHSA-fc5q-39xc-vjpf`); the header says the remaining exceptions are medium severity and were approved on 2026-11-10 and 2026-11-13. |

### Why: decisions along the way

- **Why remove them.** An exception that matches nothing still looks like an accepted risk; `docs/security.md` says that without reason, expiry and approval there is no exception, and an unused entry has none of them in force. If an advisory for the same package comes back, it will have a new id and the scan will fail until it is looked at.
- **Evidence.** The advisory database (`api.osv.dev`) marks both as «Withdrawn Advisory» with their withdrawal dates; the scan ends with «No issues found»; the installed versions did not change.
- **Security review.** `AGENTS.md` asks for the Security role when configuration changes; it found nothing (`review.md`).

### To learn, with the real code

- **`ignoreUntil`:** the field of an `[[IgnoredVulns]]` entry that gives the day the exception stops applying; `scripts/check-npm-audit.mjs` reads the same entries, so one list covers `osv-scanner` and `npm audit`.
- **«Unused ignores»:** osv-scanner prints it when an exception names an id that the scan did not need; it is the signal that an entry can go.

### To check it

```bash
osv-scanner scan source --lockfile=package-lock.json
npm run verify
```

The first must end with «No issues found» and no «unused ignores» line.

### Pending

- `osv-scanner.toml` still uses `ignoreUntil`, which osv-scanner reports as deprecated in favour of `effectiveUntil`; migrating it also changes `scripts/check-npm-audit.mjs` (line 20), so it is its own small change.

## Fix of 2026-11-21 · The time picker shows the draft's time on a daylight-saving day (F-02, RF-083)

Branch `fix/picker-dst-drift`, small change, form approved by Fernando on 2026-11-21 (`small-change-form-picker-dst-drift.md`). One commit holds the code and its tests (`21566a4`).

### What was done and what changes for the user

On the day the clocks go forward (in Spain, Sunday 29 March 2026) the hour from 02:00 to 02:59 does not exist. A coach who chose 02:30 for a match that day saw the time picker move to 03:30 and, on Android, the dialog saved 03:30 instead of 02:30. Now the time picker always shows the time the draft holds, and what the coach chooses is what is saved. On any other day nothing changes.

### How: files and new pieces

| Piece                                                | What it does                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date-time-field-shared.ts`                          | New `toLocalTime(time)`: the `Date` for the time picker, built on a fixed reference day (15 January 2001), noon when there is no time. `toLocalDate(date, time)` stays for the date picker.                                                                   |
| `date-time-field.tsx`, `date-time-field-android.tsx` | The iOS inline time picker and the Android dialog in time mode get `toLocalTime(time)`; the date picker is as before.                                                                                                                                         |
| `date-time-field.dst.test.tsx` (new)                 | Nine tests in Europe/Madrid on iOS and on Android, driven through a parent that keeps the draft; six of them fail with the old conversion put back.                                                                                                           |
| `date-time-field.zones.test.ts` (new)                | Six tests: the real helpers run in five child Node processes, each started with its own `TZ` (Madrid, New York, Sydney, Lord Howe, UTC), reading back the zone it used and checking every time of the day; plus a check that the suite itself runs in Madrid. |
| `tests/setup/time-zone.js`, `jest.config.js`         | A Jest `globalSetup` that puts the whole suite in `Europe/Madrid`.                                                                                                                                                                                            |

### Why: decisions along the way

- **Why the fix was bigger than the finding.** F-02 said the picker disagreed with the text. On the emulator the dialog also saved the shifted time: the picker returns a `Date` built on the match's day, and JavaScript moves a time in the skipped hour to the next one. Giving the picker a day with no clock change fixes both.
- **Why 15 January 2001.** The time of a match is a plain «HH:MM» with no time zone, so no date can change it. A day in the middle of January has no clock change in any zone in use today (the changes are in spring and autumn, in April and October in the Southern Hemisphere).
- **Discarded.** Detecting the gap by hand and adjusting the time (it needs the rules of each zone), and giving the date picker noon (it never drifts, because it reads only the day).

### To learn, with the real code

- **JavaScript local dates:** `new Date(2026, 2, 29, 2, 30)` in Madrid is 03:30; the constructor never fails on a time that does not exist, it moves it. A function that only needs the time of day should not build a date on a real day.
- **Testing a time zone:** the zone of a process is read when it starts, so assigning `process.env.TZ` inside a test does not change it (the first version of these tests did that, and passed only because the machine is in Spain; Codex found it). The suite sets it in a Jest `globalSetup`, before the workers start, and other zones are tried in child Node processes started with `TZ`, reading back the zone they used.

### To check it

```bash
npm run verify
TZ=UTC npx jest src/ui/date-time-field
```

- **Phone in the Madrid time zone:** new match, «Fecha» to 29 March 2026, «Añadir hora», choose 02:30: the field must show 02:30, and opening the dialog again must show 02:30.

### Pending

- Not checked: iOS (neither simulator nor device), a real phone, and time zones outside the five of the tests.
- Codex's verdict is in `review.md`.
