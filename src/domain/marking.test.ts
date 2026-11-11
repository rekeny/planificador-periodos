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

describe("tapCell on an empty cell with fewer than 5 X", () => {
  it.each([0, 1, 3, 4])(
    "RF-044: marks an X when the period has %i X",
    (xCount) => {
      const ids = [1, 2, 3, 4].slice(0, xCount);
      const grid = gridWith({ marks: marksOf(period(2), "starter", ids) });
      const next = changedGrid(
        tapCell(grid, { entryId: 8, column: period(2) }),
      );
      expect(cellState(next, { entryId: 8, column: period(2) })).toBe(
        "starter",
      );
      expect(starterCount(next, period(2))).toBe(xCount + 1);
    },
  );

  it("RF-044: with 4 X the period ends with 5 X (the limit is reached, not passed)", () => {
    const grid = gridWith({
      marks: marksOf(period(1), "starter", [1, 2, 3, 4]),
    });
    const next = changedGrid(tapCell(grid, { entryId: 5, column: period(1) }));
    expect(starterCount(next, period(1))).toBe(5);
  });

  it("RF-044: a sub already in the period does not count as an X, so 4 X and a sub still takes an X", () => {
    const grid = gridWith({
      marks: [
        ...marksOf(period(3), "starter", [1, 2, 3, 4]),
        ...marksOf(period(3), "sub", [5]),
      ],
    });
    const next = changedGrid(tapCell(grid, { entryId: 6, column: period(3) }));
    expect(cellState(next, { entryId: 6, column: period(3) })).toBe("starter");
  });

  it("RF-044: touches only the tapped cell and does not mutate the grid it received", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        [period(1), 8, "starter"],
        [period(2), 1, "sub"],
      ],
    });
    const before = JSON.stringify(grid);
    const next = changedGrid(tapCell(grid, { entryId: 1, column: period(1) }));
    expect(next.marks).toEqual({ ...grid.marks, "1:P1": "starter" });
    expect(next.callUp).toBe(grid.callUp);
    expect(next.format).toBe(grid.format);
    expect(next.overtimeCount).toBe(grid.overtimeCount);
    expect(JSON.stringify(grid)).toBe(before);
  });

  it("RF-044: a tap that breaks a rest minimum is still marked (nothing blocks the coach but 5 X)", () => {
    // Entry 1 already has X in P1..P5 of a 6-period format: a sixth period X leaves 0 rests in the window.
    const grid = gridWith({
      marks: [1, 2, 3, 4, 5].flatMap((n) => marksOf(period(n), "starter", [1])),
    });
    const next = changedGrid(tapCell(grid, { entryId: 1, column: period(6) }));
    expect(cellState(next, { entryId: 1, column: period(6) })).toBe("starter");
  });
});

describe("tapCell on an empty cell in a period with 5 X", () => {
  const full = (column: Column, format: Format = 6, overtimeCount = 0) =>
    gridWith({
      format,
      overtimeCount,
      marks: marksOf(column, "starter", [1, 2, 3, 4, 5]),
    });

  it("RF-045 E-011: asks sub or starter in a rule-window period and leaves the grid alone", () => {
    const grid = full(period(2));
    const before = JSON.stringify(grid);
    expect(tapCell(grid, { entryId: 6, column: period(2) })).toEqual({
      kind: "askSubOrStarter",
    });
    expect(JSON.stringify(grid)).toBe(before);
  });

  it.each([
    [4, 3],
    [6, 5],
    [8, 6],
  ] as const)(
    "RF-045 RF-048: format %i asks in its last rule-window period (P%i)",
    (format, last) => {
      const grid = full(period(last), format);
      expect(tapCell(grid, { entryId: 6, column: period(last) }).kind).toBe(
        "askSubOrStarter",
      );
    },
  );

  it.each([
    [4, 4, 0],
    [6, 6, 0],
    [8, 7, 0],
    [8, 8, 0],
    [6, 0, 1], // overtime OT1
  ] as const)(
    "RF-048 E-012: format %i free column (period %i, overtime %i) marks a circled X without asking",
    (format, periodNumber, overtimeNumber) => {
      const column = periodNumber
        ? period(periodNumber)
        : overtime(overtimeNumber);
      const grid = full(column, format, overtimeNumber);
      const next = changedGrid(tapCell(grid, { entryId: 6, column }));
      expect(cellState(next, { entryId: 6, column })).toBe("sub");
      expect(starterCount(next, column)).toBe(5);
    },
  );

  it("RF-048 E-012: the free period P6 of a 6-period format is not in the rule window", () => {
    const grid = full(period(6));
    expect(tapCell(grid, { entryId: 6, column: period(6) }).kind).toBe(
      "changed",
    );
  });

  it("RF-045 RF-048: 5 X plus a sub in the column behaves the same as 5 X alone", () => {
    const rule = gridWith({
      marks: [
        ...marksOf(period(1), "starter", [1, 2, 3, 4, 5]),
        ...marksOf(period(1), "sub", [6]),
      ],
    });
    expect(tapCell(rule, { entryId: 7, column: period(1) }).kind).toBe(
      "askSubOrStarter",
    );
    const freeGrid = gridWith({
      marks: [
        ...marksOf(period(6), "starter", [1, 2, 3, 4, 5]),
        ...marksOf(period(6), "sub", [6]),
      ],
    });
    const next = changedGrid(
      tapCell(freeGrid, { entryId: 7, column: period(6) }),
    );
    expect(cellState(next, { entryId: 7, column: period(6) })).toBe("sub");
  });
});
