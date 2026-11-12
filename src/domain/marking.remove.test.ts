import { assert, integer, property } from "fast-check";
import { type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  hasSub,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { removeMark, tapCell } from "@/domain/marking";

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

describe("removeMark (remove anyway)", () => {
  it("RF-054 E-013: removing Eva's X leaves 4 X and the sub still circled", () => {
    // 6 periods. P3 has 5 X (1..5) and a sub (6); Eva is entry 3.
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
      ],
    });
    expect(tapCell(grid, { entryId: 3, column: period(3) }).kind).toBe(
      "confirmRemoveStarter",
    );
    const next = removeMark(grid, { entryId: 3, column: period(3) });
    expect(cellState(next, { entryId: 3, column: period(3) })).toBe("empty");
    expect(cellState(next, { entryId: 6, column: period(3) })).toBe("sub");
    expect(starterCount(next, period(3))).toBe(4);
    expect(hasSub(next, period(3))).toBe(true);
  });

  it("RF-054 E-013: no circled X becomes an X and no other cell changes", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        [period(3), 6, "sub"],
        [period(3), 7, "sub"],
        [period(4), 8, "sub"],
      ],
    });
    const next = removeMark(grid, { entryId: 3, column: period(3) });
    for (const id of [1, 2, 4, 5]) {
      expect(cellState(next, { entryId: id, column: period(3) })).toBe(
        "starter",
      );
    }
    expect(cellState(next, { entryId: 6, column: period(3) })).toBe("sub");
    expect(cellState(next, { entryId: 7, column: period(3) })).toBe("sub");
    expect(cellState(next, { entryId: 8, column: period(4) })).toBe("sub");
    expect(Object.keys(next.marks)).toHaveLength(7);
  });

  it("RF-054: the removed cell has no mark at all, not a stored empty value", () => {
    const grid = gridWith({
      marks: [...marksOf(period(3), "starter", [1, 2]), [period(3), 6, "sub"]],
    });
    const next = removeMark(grid, { entryId: 1, column: period(3) });
    expect(cellKey({ entryId: 1, column: period(3) }) in next.marks).toBe(
      false,
    );
    expect(Object.keys(next.marks)).toHaveLength(2);
  });

  it("RF-054: removing a circled X empties its cell and leaves the X as they are", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4]),
        [period(3), 6, "sub"],
      ],
    });
    const next = removeMark(grid, { entryId: 6, column: period(3) });
    expect(cellState(next, { entryId: 6, column: period(3) })).toBe("empty");
    expect(starterCount(next, period(3))).toBe(4);
    expect(hasSub(next, period(3))).toBe(false);
  });

  it("RF-054: removing an X where there is no sub just empties that cell", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const next = removeMark(grid, { entryId: 5, column: period(2) });
    expect(cellState(next, { entryId: 5, column: period(2) })).toBe("empty");
    expect(starterCount(next, period(2))).toBe(4);
  });

  it("RF-054: the same player's marks in other columns are not touched", () => {
    const grid = gridWith({
      marks: [
        [period(3), 3, "starter"],
        [period(2), 3, "starter"],
        [period(4), 3, "sub"],
      ],
    });
    const next = removeMark(grid, { entryId: 3, column: period(3) });
    expect(cellState(next, { entryId: 3, column: period(2) })).toBe("starter");
    expect(cellState(next, { entryId: 3, column: period(4) })).toBe("sub");
  });

  it("RF-054: an overtime column is treated like any other", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        ...marksOf(overtime(1), "starter", [1, 2, 3, 4, 5]),
        [overtime(1), 6, "sub"],
      ],
    });
    const next = removeMark(grid, { entryId: 2, column: overtime(1) });
    expect(cellState(next, { entryId: 2, column: overtime(1) })).toBe("empty");
    expect(cellState(next, { entryId: 6, column: overtime(1) })).toBe("sub");
    expect(starterCount(next, overtime(1))).toBe(4);
  });

  it("RF-054: removing from an empty cell leaves the grid as it was", () => {
    const grid = gridWith({
      marks: marksOf(period(3), "starter", [1, 2, 3]),
    });
    expect(removeMark(grid, { entryId: 7, column: period(3) })).toEqual(grid);
  });

  it("RF-054: a cell that is not in the grid leaves the grid unchanged", () => {
    const grid = gridWith({
      marks: marksOf(period(3), "starter", [1, 2, 3]),
    });
    expect(removeMark(grid, { entryId: 99, column: period(3) })).toEqual(grid);
    expect(removeMark(grid, { entryId: 1, column: period(7) })).toEqual(grid);
  });

  it("RF-054: it does not change the grid it receives", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3]),
        [period(3), 6, "sub"],
      ],
    });
    const before = structuredClone(grid);
    removeMark(grid, { entryId: 3, column: period(3) });
    expect(grid).toEqual(before);
  });

  it("RF-054 RF-055: removing never raises the X count of any column (property)", () => {
    assert(
      property(
        integer({ min: 1, max: 5 }),
        integer({ min: 1, max: 5 }),
        (periodNumber, entryId) => {
          const column = period(periodNumber);
          const grid = gridWith({
            marks: [
              ...marksOf(column, "starter", [1, 2, 3, 4, 5]),
              [column, 6, "sub"],
            ],
          });
          const next = removeMark(grid, { entryId, column });
          expect(starterCount(next, column)).toBe(4);
          expect(cellState(next, { entryId: 6, column })).toBe("sub");
        },
      ),
    );
  });
});
