import { type Column } from "@/domain/column";
import { canOpenCellMenu, chooseCellMenuOption } from "@/domain/cell-menu";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { type MarkingResult } from "@/domain/marking";

const period = (number: number): Column => ({ kind: "period", number });

// Eight rows, ids 1..8: enough for 5 X, a sub and empty cells in one column.
const CALL_UP: readonly CallUpEntry[] = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [column, entry id, mark] triples.
function gridWith(
  options: {
    format?: Format;
    overtimeCount?: number;
    marks?: readonly (readonly [Column, number, Mark])[];
  } = {},
): MatchGrid {
  const marks: Partial<Record<CellKey, Mark>> = {};
  for (const [column, entryId, mark] of options.marks ?? []) {
    marks[cellKey({ entryId, column })] = mark;
  }
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: CALL_UP,
    marks,
  };
}

const marksOf = (
  column: Column,
  mark: Mark,
  entryIds: readonly number[],
): readonly (readonly [Column, number, Mark])[] =>
  entryIds.map((id) => [column, id, mark] as const);

// The grid of a "changed" result; fails the test for any other kind.
function changedGrid(result: MarkingResult): MatchGrid {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed result, got ${result.kind}`);
  }
  return result.grid;
}

describe("Sequences (RF-052, RF-053, RF-054)", () => {
  it("RF-052 RF-053: X to «Entró de cambio» then back to «Titular» ends as the X it was", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const cell = { entryId: 3, column: period(2) };
    const asSub = changedGrid(chooseCellMenuOption(grid, cell, "sub"));
    expect(starterCount(asSub, period(2))).toBe(4);
    const back = changedGrid(chooseCellMenuOption(asSub, cell, "starter"));
    expect(cellState(back, cell)).toBe("starter");
    expect(back).toEqual(grid);
  });

  it("RF-052 RF-053: after X to «Entró de cambio», another circled X to «Titular» is allowed with 4 X", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
      ],
    });
    const asSub = changedGrid(
      chooseCellMenuOption(grid, { entryId: 3, column: period(2) }, "sub"),
    );
    const next = changedGrid(
      chooseCellMenuOption(asSub, { entryId: 6, column: period(2) }, "starter"),
    );
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("starter");
    expect(cellState(next, { entryId: 3, column: period(2) })).toBe("sub");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-052: choosing again the state just chosen returns unchanged", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const cell = { entryId: 3, column: period(2) };
    const asSub = changedGrid(chooseCellMenuOption(grid, cell, "sub"));
    expect(chooseCellMenuOption(asSub, cell, "sub")).toEqual({
      kind: "unchanged",
    });
  });

  it("RF-052: after «Quitar» the cell is empty and has no menu", () => {
    const grid = gridWith({ marks: [[period(2), 1, "starter"]] });
    const cell = { entryId: 1, column: period(2) };
    const next = changedGrid(chooseCellMenuOption(grid, cell, "remove"));
    expect(canOpenCellMenu(next, cell)).toBe(false);
  });
});
