import { array, assert, constantFrom, integer, property } from "fast-check";
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

describe("tapCell sequences and odd data", () => {
  it("RF-044 RF-049: X then a second tap on the same cell leaves it empty again", () => {
    const grid = gridWith();
    const cell = { entryId: 1, column: period(1) };
    const marked = changedGrid(tapCell(grid, cell));
    const cleared = changedGrid(tapCell(marked, cell));
    expect(cleared.marks).toEqual({});
  });

  it("RF-048 RF-051: circled X then a second tap on the same cell leaves it empty", () => {
    const grid = gridWith({
      marks: marksOf(period(6), "starter", [1, 2, 3, 4, 5]),
    });
    const cell = { entryId: 6, column: period(6) };
    const sub = changedGrid(tapCell(grid, cell));
    const cleared = changedGrid(tapCell(sub, cell));
    expect(cellState(cleared, cell)).toBe("empty");
    expect(starterCount(cleared, period(6))).toBe(5);
  });

  it.each([
    ["an entry that is not in the call-up", { entryId: 99, column: period(1) }],
    ["a period beyond the format", { entryId: 1, column: period(7) }],
    ["an overtime that does not exist", { entryId: 1, column: overtime(1) }],
    ["period number 0", { entryId: 1, column: period(0) }],
  ] as const)("RF-044: a tap on %s returns unchanged", (_label, cell) => {
    expect(tapCell(gridWith(), cell)).toEqual({ kind: "unchanged" });
  });

  it("RF-044: a tap on a column that does not exist returns unchanged even when its key has a mark", () => {
    const grid = gridWith({ marks: [[period(7), 1, "starter"]] });
    expect(tapCell(grid, { entryId: 1, column: period(7) })).toEqual({
      kind: "unchanged",
    });
  });

  it("RF-044: an overtime that exists is tappable like any other column", () => {
    const grid = gridWith({ overtimeCount: 2 });
    const next = changedGrid(
      tapCell(grid, { entryId: 1, column: overtime(2) }),
    );
    expect(cellState(next, { entryId: 1, column: overtime(2) })).toBe(
      "starter",
    );
  });
});

describe("tapCell never lets a column pass 5 X", () => {
  const tracked: readonly Column[] = [
    period(1),
    period(4),
    period(6),
    overtime(1),
  ];
  const tapArb = constantFrom<Column>(...tracked, period(9));

  it("RF-055: no sequence of taps leaves any column with 6 X", () => {
    assert(
      property(
        constantFrom<Format>(4, 6, 8),
        array(
          integer({ min: 1, max: 9 }).chain((entryId) =>
            tapArb.map((column) => ({ entryId, column })),
          ),
          { maxLength: 80 },
        ),
        (format, taps) => {
          // Every tracked column starts one X short of the limit.
          let grid = gridWith({
            format,
            overtimeCount: 1,
            marks: tracked.flatMap((column) =>
              marksOf(column, "starter", [1, 2, 3, 4]),
            ),
          });
          for (const cell of taps) {
            const result = tapCell(grid, cell);
            if (result.kind === "changed") grid = result.grid;
            for (const column of tracked) {
              expect(starterCount(grid, column)).toBeLessThanOrEqual(5);
            }
          }
        },
      ),
    );
  });

  it("RF-055: tapping every empty cell of a column with 5 X in the rule window never adds a sixth X", () => {
    const column = period(1);
    const grid = gridWith({
      marks: marksOf(column, "starter", [1, 2, 3, 4, 5]),
    });
    for (const entryId of [6, 7, 8]) {
      expect(tapCell(grid, { entryId, column }).kind).toBe("askSubOrStarter");
    }
  });
});
