import { type Column } from "@/domain/column";
import { chooseCellMenuOption } from "@/domain/cell-menu";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { type MarkingResult } from "@/domain/marking";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

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

describe("«Quitar» on an X with a sub (RF-052 reminder)", () => {
  it("RF-052 RF-050: «Quitar» on an X in a period with a sub asks for confirmation", () => {
    // E-013 shape: 5 X and a sub in P3.
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
      ],
    });
    expect(
      chooseCellMenuOption(grid, { entryId: 3, column: period(3) }, "remove"),
    ).toEqual({ kind: "confirmRemoveStarter" });
  });

  it("RF-052 RF-050: asking for confirmation does not change the grid", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
      ],
    });
    const before = structuredClone(grid);
    chooseCellMenuOption(grid, { entryId: 3, column: period(3) }, "remove");
    expect(grid).toEqual(before);
  });

  it("RF-052 RF-050: the reminder also applies in a free period and in an overtime", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        ...marksOf(period(6), "starter", [1, 2, 3, 4, 5]),
        [period(6), 6, "sub"],
        ...marksOf(overtime(1), "starter", [1, 2, 3, 4, 5]),
        [overtime(1), 6, "sub"],
      ],
    });
    for (const column of [period(6), overtime(1)]) {
      expect(
        chooseCellMenuOption(grid, { entryId: 1, column }, "remove"),
      ).toEqual({ kind: "confirmRemoveStarter" });
    }
  });

  it("RF-052 RF-050: a sub in another column does not trigger the reminder", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(4), 6, "sub"],
      ],
    });
    const cell = { entryId: 3, column: period(3) };
    const next = changedGrid(chooseCellMenuOption(grid, cell, "remove"));
    expect(cellState(next, cell)).toBe("empty");
  });

  it("RF-052 RF-050: «Titular» and «Entró de cambio» on an X in a period with a sub ask nothing", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
      ],
    });
    const cell = { entryId: 3, column: period(3) };
    expect(chooseCellMenuOption(grid, cell, "starter")).toEqual({
      kind: "unchanged",
    });
    const next = changedGrid(chooseCellMenuOption(grid, cell, "sub"));
    expect(cellState(next, cell)).toBe("sub");
  });
});
