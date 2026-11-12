import type { Column } from "@/domain/column";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type CellState,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceStarter } from "@/domain/marking";
import { undoEntryFor, undoLast, type CellChange } from "@/domain/undo";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [column, entry id, mark] triples.
function gridWith(
  marks: readonly (readonly [Column, number, Mark])[] = [],
  overtimeCount = 0,
): MatchGrid {
  const stored: Partial<Record<CellKey, Mark>> = {};
  for (const [column, entryId, mark] of marks) {
    stored[cellKey({ entryId, column })] = mark;
  }
  return { format: 6, overtimeCount, callUp: CALL_UP, marks: stored };
}

const change = (
  entryId: number,
  column: Column,
  state: CellState,
): CellChange => ({ cell: { entryId, column }, state });
const sorted = (changes: readonly CellChange[]): readonly CellChange[] =>
  [...changes].sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell)));

const starters = (column: Column, ids: readonly number[]) =>
  ids.map((id) => [column, id, "starter"] as const);

describe("undoLast", () => {
  it("RF-057: with an empty history the grid is the same and nothing changes", () => {
    const grid = gridWith([[period(1), 1, "starter"]]);
    const result = undoLast(grid, []);
    expect(result.grid).toEqual(grid);
    expect(result.history).toEqual([]);
    expect(result.changes).toEqual([]);
  });

  it.each([
    ["empty", "starter"],
    ["empty", "sub"],
    ["starter", "empty"],
    ["sub", "empty"],
    ["starter", "sub"],
    ["sub", "starter"],
  ] as const)(
    "RF-057: undoing a cell that went from %s to %s restores %s with one change",
    (from, to) => {
      const marked = (state: CellState): MatchGrid =>
        gridWith(state === "empty" ? [] : [[period(3), 2, state]]);
      const entry = undoEntryFor(marked(from), marked(to));
      const result = undoLast(marked(to), [entry]);
      expect(result.grid).toEqual(marked(from));
      expect(result.changes).toEqual([change(2, period(3), from)]);
      expect(result.history).toEqual([]);
    },
  );

  it("RF-057: an emptied cell has no stored mark, like any empty cell", () => {
    const before = gridWith();
    const after = gridWith([[period(1), 1, "starter"]]);
    const result = undoLast(after, [undoEntryFor(before, after)]);
    expect(result.grid.marks).toEqual({});
    expect(
      cellKey({ entryId: 1, column: period(1) }) in result.grid.marks,
    ).toBe(false);
  });

  it("RF-057: only the last entry is reverted and the older ones stay in order", () => {
    const g0 = gridWith();
    const g1 = gridWith([[period(1), 1, "starter"]]);
    const g2 = gridWith([
      [period(1), 1, "starter"],
      [period(2), 2, "starter"],
    ]);
    const first = undoEntryFor(g0, g1);
    const second = undoEntryFor(g1, g2);
    const result = undoLast(g2, [first, second]);
    expect(result.grid).toEqual(g1);
    expect(result.history).toEqual([first]);
  });

  it("RF-057: three marks and three presses leave the grid as before the first mark", () => {
    const grids = [
      gridWith(),
      gridWith([[period(1), 1, "starter"]]),
      gridWith([
        [period(1), 1, "starter"],
        [period(1), 2, "sub"],
      ]),
      gridWith([
        [period(1), 1, "starter"],
        [period(1), 2, "sub"],
        [period(4), 3, "starter"],
      ]),
    ] as const;
    let history = [1, 2, 3].map((i) => undoEntryFor(grids[i - 1]!, grids[i]!));
    let grid = grids[3];
    for (let press = 0; press < 3; press += 1) {
      const result = undoLast(grid, history);
      grid = result.grid;
      history = [...result.history];
    }
    expect(grid).toEqual(grids[0]);
    expect(history).toEqual([]);
    expect(undoLast(grid, history).changes).toEqual([]);
  });

  it("RF-057 RF-047: a starter replacement is undone in one press, both cells together", () => {
    const before = gridWith(starters(period(2), [1, 2, 3, 4, 5]));
    const after = replaceStarter(before, { entryId: 6, column: period(2) }, 3);
    const result = undoLast(after, [undoEntryFor(before, after)]);
    expect(result.grid).toEqual(before);
    expect(starterCount(result.grid, period(2))).toBe(5);
    expect(sorted(result.changes)).toEqual(
      sorted([change(6, period(2), "empty"), change(3, period(2), "starter")]),
    );
    expect(result.history).toEqual([]);
  });

  it("RF-057: the grid it receives is not modified", () => {
    const before = gridWith();
    const after = gridWith([[period(1), 1, "starter"]]);
    const snapshot = JSON.stringify(after);
    undoLast(after, [undoEntryFor(before, after)]);
    expect(JSON.stringify(after)).toBe(snapshot);
  });

  it("RF-057: undo only writes cells of the entry; other marks stay", () => {
    const before = gridWith([[period(5), 4, "sub"]]);
    const after = gridWith([
      [period(5), 4, "sub"],
      [period(1), 1, "starter"],
    ]);
    const result = undoLast(after, [undoEntryFor(before, after)]);
    expect(cellState(result.grid, { entryId: 4, column: period(5) })).toBe(
      "sub",
    );
  });

  it("RF-086: a cell of the entry that does not exist is skipped and the others are reverted", () => {
    const grid = gridWith([[period(1), 1, "starter"]]);
    const entry = [
      change(1, period(1), "empty"),
      change(99, period(1), "starter"),
      change(2, overtime(1), "starter"),
    ];
    const result = undoLast(grid, [entry]);
    expect(result.changes).toEqual([change(1, period(1), "empty")]);
    expect(result.grid.marks).toEqual({});
    expect(result.grid.callUp).toEqual(CALL_UP);
    expect(result.grid.overtimeCount).toBe(0);
  });

  it("RF-086: an entry with no existing cell is discarded and the same press reverts the previous one", () => {
    const grid = gridWith([[period(1), 1, "starter"]]);
    const result = undoLast(grid, [
      [change(1, period(1), "empty")],
      [change(99, period(2), "starter")],
      [change(1, overtime(2), "sub")],
    ]);
    expect(result.changes).toEqual([change(1, period(1), "empty")]);
    expect(result.history).toEqual([]);
  });

  it("RF-086: when no entry has an existing cell, nothing changes and the history ends empty", () => {
    const grid = gridWith([[period(1), 1, "starter"]]);
    const result = undoLast(grid, [
      [change(99, period(1), "empty")],
      [change(1, overtime(1), "sub")],
    ]);
    expect(result.grid).toEqual(grid);
    expect(result.changes).toEqual([]);
    expect(result.history).toEqual([]);
  });

  it("RF-086: undo never brings back a column or a row", () => {
    const grid = gridWith([], 0);
    const result = undoLast(grid, [[change(2, overtime(1), "starter")]]);
    expect(result.grid.overtimeCount).toBe(0);
    expect(result.grid.marks).toEqual({});
    const noRow = undoLast(grid, [[change(42, period(1), "starter")]]);
    expect(noRow.grid.callUp).toEqual(CALL_UP);
    expect(noRow.grid.marks).toEqual({});
  });
});
