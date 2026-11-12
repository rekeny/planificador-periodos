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

Measured: Stryker kills 93.89 % of mutants (threshold 80 %) and domain coverage is above 99 %. The whole `verify` with mutation testing takes about 5 minutes on a Mac with 8 cores, but 25 minutes on GitHub Actions (22 min 32 s of it is Stryker, 2 vCPU, 685 mutants). That is above the 20 minutes of the plan, so it is recorded as a pending deviation in `plan.md`.

### Pending

- Fernando reviews and merges the PR "001 D1: rules engine" (T023).
- Before D2, the Planner reviews D2's tasks with these lessons: a task's "Done when" line can be shorter than the plan (D1-01); the traceability script only reads literal test titles, so tables use a literal title with the IDs; `verify.sh`'s focused-test check matches the word "fit" anywhere in a test file, which is too loose.
- Decide the CI mutation time (fallback of the plan: Stryker incremental mode with a cached file) before D2.
- Some `undo.ts` mutants survived (the guard against a sixth X cannot be reached by real app actions; it is only a defence, covered by tests with a history that does not match the grid).
