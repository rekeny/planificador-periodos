import { type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type CallUpEntry,
  type CellKey,
  type MatchGrid,
  type Mark,
} from "@/domain/grid";
import { tapCell, type MarkingResult } from "@/domain/marking";

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

function changedGrid(result: MarkingResult): MatchGrid {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed grid, got ${result.kind}`);
  }
  return result.grid;
}

describe("tapCell on a marked cell", () => {
  it("RF-049: an X in a period with no sub is removed and the period drops to 4 X", () => {
    const grid = gridWith({
      marks: marksOf(period(2), "starter", [1, 2, 3, 4, 5]),
    });
    const next = changedGrid(tapCell(grid, { entryId: 3, column: period(2) }));
    expect(cellState(next, { entryId: 3, column: period(2) })).toBe("empty");
    expect(cellKey({ entryId: 3, column: period(2) }) in next.marks).toBe(
      false,
    );
    expect(starterCount(next, period(2))).toBe(4);
  });

  it("RF-049: a sub in another column does not stop the removal of an X", () => {
    const grid = gridWith({
      marks: [
        [period(2), 1, "starter"],
        [period(3), 2, "sub"],
      ],
    });
    const next = changedGrid(tapCell(grid, { entryId: 1, column: period(2) }));
    expect(cellState(next, { entryId: 1, column: period(2) })).toBe("empty");
  });

  it("RF-050 E-013: an X in a period with a sub asks for confirmation and leaves the grid alone", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4, 5]),
        ...marksOf(period(3), "sub", [6]),
      ],
    });
    const before = JSON.stringify(grid);
    expect(tapCell(grid, { entryId: 3, column: period(3) })).toEqual({
      kind: "confirmRemoveStarter",
    });
    expect(JSON.stringify(grid)).toBe(before);
  });

  it.each([
    ["rule-window period", period(1), 6],
    ["free period", period(6), 6],
    ["overtime", overtime(1), 6],
  ] as const)(
    "RF-050 E-013: an X with a sub asks for confirmation in a %s, even with fewer than 5 X",
    (_label, column, format) => {
      const grid = gridWith({
        format,
        overtimeCount: 1,
        marks: [
          ...marksOf(column, "starter", [1, 2]),
          ...marksOf(column, "sub", [7]),
        ],
      });
      expect(tapCell(grid, { entryId: 1, column }).kind).toBe(
        "confirmRemoveStarter",
      );
    },
  );

  it.each([
    ["rule-window period", period(1)],
    ["free period", period(6)],
    ["overtime", overtime(1)],
  ] as const)(
    "RF-051: a circled X in a %s is removed without asking, whatever else the column holds",
    (_label, column) => {
      const grid = gridWith({
        overtimeCount: 1,
        marks: [
          ...marksOf(column, "starter", [1, 2, 3, 4, 5]),
          ...marksOf(column, "sub", [6, 7]),
        ],
      });
      const next = changedGrid(tapCell(grid, { entryId: 6, column }));
      expect(cellState(next, { entryId: 6, column })).toBe("empty");
      expect(cellState(next, { entryId: 7, column })).toBe("sub");
      expect(starterCount(next, column)).toBe(5);
    },
  );

  it("RF-051: removing the only circled X lets the next tap on an X remove it without asking", () => {
    const grid = gridWith({
      marks: [
        [period(1), 1, "starter"],
        [period(1), 2, "sub"],
      ],
    });
    const afterSub = changedGrid(
      tapCell(grid, { entryId: 2, column: period(1) }),
    );
    expect(tapCell(afterSub, { entryId: 1, column: period(1) }).kind).toBe(
      "changed",
    );
  });
});
