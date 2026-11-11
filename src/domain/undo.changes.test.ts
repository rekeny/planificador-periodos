import type { Column } from "@/domain/column";
import {
  cellKey,
  type Cell,
  type CallUpEntry,
  type CellKey,
  type CellState,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { replaceStarter, tapCell } from "@/domain/marking";
import { cellChanges, undoEntryFor, type CellChange } from "@/domain/undo";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6].map((id) => ({
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

const change = (cell: Cell, state: CellState): CellChange => ({ cell, state });
const sorted = (changes: readonly CellChange[]): readonly CellChange[] =>
  [...changes].sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell)));

const STATES: readonly CellState[] = ["empty", "starter", "sub"];
const TRANSITIONS: readonly (readonly [CellState, CellState])[] =
  STATES.flatMap((from) => STATES.map((to) => [from, to] as const));
const withState = (state: CellState): MatchGrid =>
  gridWith(state === "empty" ? [] : [[period(1), 1, state]]);

describe("cellChanges", () => {
  const cell: Cell = { entryId: 1, column: period(1) };

  it.each(TRANSITIONS)(
    "RF-057: one cell going from %s to %s lists exactly that cell with the new state, or nothing if equal",
    (from, to) => {
      expect(cellChanges(withState(from), withState(to))).toEqual(
        from === to ? [] : [change(cell, to)],
      );
    },
  );

  it("RF-057: the same grid object gives no changes", () => {
    const grid = gridWith([[period(2), 1, "starter"]]);
    expect(cellChanges(grid, grid)).toEqual([]);
  });

  it("RF-057: two equal grids built separately give no changes", () => {
    const marks: readonly (readonly [Column, number, Mark])[] = [
      [period(2), 1, "starter"],
      [period(3), 2, "sub"],
    ];
    expect(cellChanges(gridWith(marks), gridWith(marks))).toEqual([]);
  });

  it("RF-057: a tap on an empty cell is one change, the new X", () => {
    const before = gridWith();
    const result = tapCell(before, { entryId: 2, column: period(3) });
    if (result.kind !== "changed") throw new Error("expected a change");
    expect(cellChanges(before, result.grid)).toEqual([
      change({ entryId: 2, column: period(3) }, "starter"),
    ]);
  });

  it("RF-057: marks that did not change are not listed", () => {
    const before = gridWith([[period(1), 3, "starter"]]);
    const after = gridWith([
      [period(1), 3, "starter"],
      [period(2), 4, "sub"],
    ]);
    expect(cellChanges(before, after)).toEqual([
      change({ entryId: 4, column: period(2) }, "sub"),
    ]);
  });

  it("RF-057: an overtime cell is listed like a period cell", () => {
    const before = gridWith([], 1);
    const after = gridWith([[overtime(1), 2, "starter"]], 1);
    expect(cellChanges(before, after)).toEqual([
      change({ entryId: 2, column: overtime(1) }, "starter"),
    ]);
  });

  it("RF-057 RF-047: a starter replacement lists two cells, the new X and the emptied one", () => {
    const full = [1, 2, 3, 4, 5].map(
      (id) => [period(2), id, "starter"] as const,
    );
    const before = gridWith(full);
    const after = replaceStarter(before, { entryId: 6, column: period(2) }, 3);
    expect(sorted(cellChanges(before, after))).toEqual(
      sorted([
        change({ entryId: 6, column: period(2) }, "starter"),
        change({ entryId: 3, column: period(2) }, "empty"),
      ]),
    );
  });
});

describe("undoEntryFor", () => {
  const cell: Cell = { entryId: 1, column: period(1) };

  it.each(TRANSITIONS)(
    "RF-057: one cell going from %s to %s stores the old state %s, or nothing if equal",
    (from, to) => {
      expect(undoEntryFor(withState(from), withState(to))).toEqual(
        from === to ? [] : [change(cell, from)],
      );
    },
  );

  it("RF-057: the same grid gives an empty entry", () => {
    const grid = gridWith([[period(1), 1, "sub"]]);
    expect(undoEntryFor(grid, grid)).toEqual([]);
  });

  it("RF-057 RF-047: a starter replacement is one entry with both old states", () => {
    const full = [1, 2, 3, 4, 5].map(
      (id) => [period(2), id, "starter"] as const,
    );
    const before = gridWith(full);
    const after = replaceStarter(before, { entryId: 6, column: period(2) }, 3);
    expect(sorted(undoEntryFor(before, after))).toEqual(
      sorted([
        change({ entryId: 6, column: period(2) }, "empty"),
        change({ entryId: 3, column: period(2) }, "starter"),
      ]),
    );
  });

  it("RF-057: the entry lists the same cells as cellChanges, with the opposite states", () => {
    const before = gridWith([
      [period(1), 1, "starter"],
      [period(2), 2, "sub"],
    ]);
    const after = gridWith([
      [period(1), 1, "sub"],
      [period(3), 4, "starter"],
    ]);
    const forward = new Map(
      cellChanges(before, after).map((c) => [cellKey(c.cell), c.state]),
    );
    const back = new Map(
      undoEntryFor(before, after).map((c) => [cellKey(c.cell), c.state]),
    );
    expect([...back.keys()].sort()).toEqual([...forward.keys()].sort());
    expect(back.get("1:P1")).toBe("starter");
    expect(forward.get("1:P1")).toBe("sub");
    expect(back.get("2:P2")).toBe("sub");
    expect(forward.get("2:P2")).toBe("empty");
    expect(back.get("4:P3")).toBe("empty");
    expect(forward.get("4:P3")).toBe("starter");
  });
});
