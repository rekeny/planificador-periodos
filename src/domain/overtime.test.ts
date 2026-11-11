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
import { addOvertime, lastOvertimeHasMarks } from "@/domain/overtime";

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

describe("addOvertime", () => {
  it("RF-058: pressing it twice in a 6-period match shows 8 columns", () => {
    const grid = addOvertime(addOvertime(gridWith({ format: 6 })));

    expect(grid.overtimeCount).toBe(2);
    expect(columnCount(grid)).toBe(8);
  });

  it.each([
    [4, 0, 5],
    [6, 0, 7],
    [8, 0, 9],
    [6, 1, 8],
    [8, 4, 13],
  ] as const)(
    "RF-058: format %i with %i overtimes gets one more column, %i in total",
    (format, overtimeCount, total) => {
      const grid = addOvertime(gridWith({ format, overtimeCount }));

      expect(grid.overtimeCount).toBe(overtimeCount + 1);
      expect(columnCount(grid)).toBe(total);
    },
  );

  it("RF-058: the new overtime is the last column, after the previous overtimes", () => {
    const columns = gridColumns(
      6,
      addOvertime(gridWith({ overtimeCount: 1 })).overtimeCount,
    );

    expect(columns.at(-2)).toEqual(overtime(1));
    expect(columns.at(-1)).toEqual(overtime(2));
  });

  it("RF-058: the new overtime is empty for every row", () => {
    const grid = addOvertime(gridWith({ marks: [[1, period(1), "starter"]] }));

    for (const { id } of CALL_UP) {
      expect(cellState(grid, { entryId: id, column: overtime(1) })).toBe(
        "empty",
      );
    }
  });

  it("RF-058: adding an overtime keeps every existing mark, format and call-up", () => {
    const before = gridWith({
      overtimeCount: 1,
      marks: [
        [1, period(1), "starter"],
        [2, period(6), "sub"],
        [3, overtime(1), "starter"],
      ],
    });

    const after = addOvertime(before);

    expect(after.marks).toEqual(before.marks);
    expect(after.callUp).toEqual(before.callUp);
    expect(after.format).toBe(before.format);
  });

  it("RF-058: it does not mutate the grid it receives", () => {
    const before = gridWith({ marks: [[1, period(1), "starter"]] });
    const snapshot = structuredClone(before);

    addOvertime(before);

    expect(before).toEqual(snapshot);
  });
});

describe("lastOvertimeHasMarks", () => {
  it("RF-059: false when the match has no overtimes", () => {
    expect(
      lastOvertimeHasMarks(gridWith({ marks: [[1, period(1), "starter"]] })),
    ).toBe(false);
  });

  it("RF-059: false when the last overtime is empty", () => {
    expect(lastOvertimeHasMarks(gridWith({ overtimeCount: 1 }))).toBe(false);
  });

  it.each(["starter", "sub"] as const)(
    "RF-059: true when the last overtime has a %s mark",
    (mark) => {
      const grid = gridWith({
        overtimeCount: 1,
        marks: [[2, overtime(1), mark]],
      });

      expect(lastOvertimeHasMarks(grid)).toBe(true);
    },
  );

  it("RF-059: only the last overtime counts, marks in OT1 do not matter with OT2 empty", () => {
    const grid = gridWith({
      overtimeCount: 2,
      marks: [[1, overtime(1), "starter"]],
    });

    expect(lastOvertimeHasMarks(grid)).toBe(false);
  });

  it("RF-059: marks in periods do not count", () => {
    const grid = gridWith({
      overtimeCount: 1,
      marks: [
        [1, period(6), "starter"],
        [2, period(1), "sub"],
      ],
    });

    expect(lastOvertimeHasMarks(grid)).toBe(false);
  });
});
