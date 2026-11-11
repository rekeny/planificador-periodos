import { assert, integer, property } from "fast-check";
import { gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const CALL_UP: readonly CallUpEntry[] = [1, 2, 3].map((id) => ({
  id,
  playerId: id,
  name: `Player ${id}`,
  number: String(id),
}));

// `marks` lists [entry id, column, mark] triples.
function gridWith(
  options: {
    format?: Format;
    overtimeCount?: number;
    marks?: readonly (readonly [number, Column, Mark])[];
  } = {},
): MatchGrid {
  const marks: Partial<Record<CellKey, Mark>> = {};
  for (const [entryId, column, mark] of options.marks ?? []) {
    marks[cellKey({ entryId, column })] = mark;
  }
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: CALL_UP,
    marks,
  };
}

const columnCount = (grid: MatchGrid): number =>
  gridColumns(grid.format, grid.overtimeCount).length;

describe("removeLastOvertime", () => {
  it("RF-059: removing the only overtime of a 6-period match leaves 6 columns", () => {
    const grid = removeLastOvertime(gridWith({ overtimeCount: 1 }));

    expect(grid.overtimeCount).toBe(0);
    expect(columnCount(grid)).toBe(6);
  });

  it("RF-059: with two overtimes only the second one is removed", () => {
    const grid = removeLastOvertime(gridWith({ overtimeCount: 2 }));

    expect(grid.overtimeCount).toBe(1);
    expect(gridColumns(6, grid.overtimeCount).at(-1)).toEqual(overtime(1));
  });

  it("RF-059: removing an overtime with marks deletes those marks", () => {
    const grid = removeLastOvertime(
      gridWith({
        overtimeCount: 1,
        marks: [
          [1, overtime(1), "starter"],
          [2, overtime(1), "sub"],
        ],
      }),
    );

    expect(Object.keys(grid.marks)).toEqual([]);
  });

  it("RF-059: add 2, mark OT1 and OT2, remove: OT1 keeps its marks and the periods too", () => {
    const added = addOvertime(addOvertime(gridWith()));
    const marked: MatchGrid = {
      ...added,
      marks: {
        [cellKey({ entryId: 1, column: period(2) })]: "starter" as const,
        [cellKey({ entryId: 1, column: overtime(1) })]: "starter" as const,
        [cellKey({ entryId: 2, column: overtime(1) })]: "sub" as const,
        [cellKey({ entryId: 3, column: overtime(2) })]: "starter" as const,
      },
    };

    const grid = removeLastOvertime(marked);

    expect(grid.overtimeCount).toBe(1);
    expect(grid.marks).toEqual({
      [cellKey({ entryId: 1, column: period(2) })]: "starter" as const,
      [cellKey({ entryId: 1, column: overtime(1) })]: "starter" as const,
      [cellKey({ entryId: 2, column: overtime(1) })]: "sub" as const,
    });
  });

  it("RF-059: add 2, mark only OT2, remove: OT1 stays empty and OT2 marks are gone", () => {
    const added = addOvertime(addOvertime(gridWith()));
    const marked: MatchGrid = {
      ...added,
      marks: {
        [cellKey({ entryId: 2, column: overtime(2) })]: "starter" as const,
      },
    };

    const grid = removeLastOvertime(marked);

    expect(grid.overtimeCount).toBe(1);
    expect(grid.marks).toEqual({});
  });

  it("RF-059: with no overtimes it returns the same grid", () => {
    const before = gridWith({
      marks: [
        [1, period(1), "starter"],
        [2, period(4), "sub"],
      ],
    });

    expect(removeLastOvertime(before)).toEqual(before);
  });

  it("RF-059: removing an overtime does not touch period marks, format or call-up", () => {
    const before = gridWith({
      format: 8,
      overtimeCount: 1,
      marks: [
        [1, period(8), "starter"],
        [2, period(1), "sub"],
        [3, overtime(1), "starter"],
      ],
    });

    const after = removeLastOvertime(before);

    expect(after.format).toBe(8);
    expect(after.callUp).toEqual(before.callUp);
    expect(after.marks).toEqual({
      [cellKey({ entryId: 1, column: period(8) })]: "starter",
      [cellKey({ entryId: 2, column: period(1) })]: "sub",
    });
  });

  it("RF-059: it does not mutate the grid it receives", () => {
    const before = gridWith({
      overtimeCount: 1,
      marks: [[1, overtime(1), "starter"]],
    });
    const snapshot = structuredClone(before);

    removeLastOvertime(before);

    expect(before).toEqual(snapshot);
  });

  it("RF-058 RF-059: after removing the last overtime, adding one again gives an empty column", () => {
    const removed = removeLastOvertime(
      gridWith({
        overtimeCount: 1,
        marks: [[1, overtime(1), "starter"]],
      }),
    );

    const grid = addOvertime(removed);

    expect(grid.overtimeCount).toBe(1);
    expect(cellState(grid, { entryId: 1, column: overtime(1) })).toBe("empty");
  });
});

describe("overtime properties", () => {
  it("RF-058 RF-059: adding and then removing an overtime gives back the same grid", () => {
    assert(
      property(integer({ min: 0, max: 6 }), (overtimeCount) => {
        const before = gridWith({
          overtimeCount,
          marks: [
            [1, period(1), "starter"],
            [2, period(6), "sub"],
          ],
        });

        expect(removeLastOvertime(addOvertime(before))).toEqual(before);
      }),
    );
  });

  it("RF-059: removing never leaves a mark outside the remaining columns", () => {
    assert(
      property(integer({ min: 1, max: 6 }), (overtimeCount) => {
        const marks = gridColumns(6, overtimeCount).flatMap((column) =>
          CALL_UP.map((row) => [row.id, column, "starter"] as const),
        );
        const after = removeLastOvertime(gridWith({ overtimeCount, marks }));
        const valid = new Set(
          gridColumns(6, after.overtimeCount).flatMap((column) =>
            CALL_UP.map((row) => cellKey({ entryId: row.id, column })),
          ),
        );

        expect(
          Object.keys(after.marks).every((key) => valid.has(key as CellKey)),
        ).toBe(true);
      }),
    );
  });
});
