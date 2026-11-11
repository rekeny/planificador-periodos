import { assert, integer, property } from "fast-check";
import { type Column } from "@/domain/column";
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
import { markSub, tapCell } from "@/domain/marking";

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

describe("markSub (answer sub)", () => {
  it("RF-046: answering sub puts a circled X in the tapped cell and the period keeps its 5 X", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const next = markSub(grid, { entryId: 6, column: period(2) });
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("sub");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-046: every X of the period stays exactly where it was", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const next = markSub(grid, { entryId: 6, column: period(2) });
    for (const id of [1, 2, 3, 4, 5]) {
      expect(cellState(next, { entryId: id, column: period(2) })).toBe(
        "starter",
      );
    }
  });

  it("RF-046: marks in other columns are not touched", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(1), 6, "starter"],
        [period(3), 7, "sub"],
      ],
    });
    const next = markSub(grid, { entryId: 6, column: period(2) });
    expect(cellState(next, { entryId: 6, column: period(1) })).toBe("starter");
    expect(cellState(next, { entryId: 7, column: period(3) })).toBe("sub");
    expect(Object.keys(next.marks)).toHaveLength(8);
  });

  it("RF-046: it does not change the grid it receives", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const before = structuredClone(grid);
    markSub(grid, { entryId: 6, column: period(2) });
    expect(grid).toEqual(before);
  });

  it("RF-046 RF-055: a sub never counts as an X, also in a free period and an overtime", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        ...marksOf(period(6), "starter", [1, 2, 3, 4, 5]),
        ...marksOf(overtime(1), "starter", [1, 2, 3, 4, 5]),
      ],
    });
    for (const column of [period(6), overtime(1)]) {
      const next = markSub(grid, { entryId: 6, column });
      expect(cellState(next, { entryId: 6, column })).toBe("sub");
      expect(starterCount(next, column)).toBe(5);
    }
  });

  it("RF-046: a second sub in the same period is allowed", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
        [period(2), 6, "sub"],
      ],
    });
    const next = markSub(grid, { entryId: 7, column: period(2) });
    expect(cellState(next, { entryId: 6, column: period(2) })).toBe("sub");
    expect(cellState(next, { entryId: 7, column: period(2) })).toBe("sub");
    expect(starterCount(next, period(2))).toBe(5);
  });

  it("RF-046: a cell that is not in the grid leaves the grid unchanged", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    expect(markSub(grid, { entryId: 99, column: period(2) })).toEqual(grid);
    expect(markSub(grid, { entryId: 6, column: period(7) })).toEqual(grid);
    expect(markSub(grid, { entryId: 6, column: overtime(1) })).toEqual(grid);
  });

  it("RF-046 RF-055: after any tap that asked sub-or-starter, answering sub leaves 5 X (property)", () => {
    assert(
      property(
        integer({ min: 1, max: 3 }), // P1..P3: rule-window periods, so the tap asks
        integer({ min: 6, max: 8 }),
        (periodNumber, entryId) => {
          const column = period(periodNumber);
          const grid = gridWith({
            marks: marksOf(column, "starter", [1, 2, 3, 4, 5]),
          });
          const cell = { entryId, column };
          expect(tapCell(grid, cell).kind).toBe("askSubOrStarter");
          const next = markSub(grid, cell);
          expect(cellState(next, cell)).toBe("sub");
          expect(starterCount(next, column)).toBe(5);
        },
      ),
    );
  });
});
