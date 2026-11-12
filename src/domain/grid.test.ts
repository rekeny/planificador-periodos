import { gridColumns, type Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellExists,
  cellKey,
  cellState,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

const period = (number: number): Column => ({ kind: "period", number });
const overtime = (number: number): Column => ({ kind: "overtime", number });

const entry = (id: number, name: string, number: string): CallUpEntry => ({
  id,
  playerId: id,
  name,
  number,
});

function makeGrid(
  options: {
    format?: Format;
    overtimeCount?: number;
    callUp?: readonly CallUpEntry[];
    marks?: Readonly<Partial<Record<CellKey, Mark>>>;
  } = {},
): MatchGrid {
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: options.callUp ?? [entry(1, "Ana", "4"), entry(2, "Bea", "7")],
    marks: options.marks ?? {},
  };
}

describe("cellKey", () => {
  it.each([
    [1, period(1), "1:P1"],
    [12, period(3), "12:P3"],
    [7, period(8), "7:P8"],
    [7, overtime(1), "7:OT1"],
    [30, overtime(3), "30:OT3"],
  ] as const)(
    "RF-043: entry %i in column %j has the key %s",
    (entryId, column, key) => {
      expect(cellKey({ entryId, column })).toBe(key);
    },
  );

  it("RF-043: entry 1 in P11 and entry 11 in P1 have different keys", () => {
    expect(cellKey({ entryId: 1, column: period(11) })).not.toBe(
      cellKey({ entryId: 11, column: period(1) }),
    );
  });

  it("RF-043: the same entry in P1 and in OT1 has different keys", () => {
    expect(cellKey({ entryId: 5, column: period(1) })).not.toBe(
      cellKey({ entryId: 5, column: overtime(1) }),
    );
  });
});

describe("cellExists", () => {
  it.each([
    {
      label: "first cell of the grid",
      format: 6,
      ot: 0,
      entryId: 1,
      column: period(1),
      expected: true,
    },
    {
      label: "last period of a 6-period match",
      format: 6,
      ot: 0,
      entryId: 2,
      column: period(6),
      expected: true,
    },
    {
      label: "period after the last one of a 6-period match",
      format: 6,
      ot: 0,
      entryId: 1,
      column: period(7),
      expected: false,
    },
    {
      label: "P5 does not exist in a 4-period match",
      format: 4,
      ot: 0,
      entryId: 1,
      column: period(5),
      expected: false,
    },
    {
      label: "P4 exists in a 4-period match",
      format: 4,
      ot: 0,
      entryId: 1,
      column: period(4),
      expected: true,
    },
    {
      label: "P5 exists in an 8-period match",
      format: 8,
      ot: 0,
      entryId: 1,
      column: period(5),
      expected: true,
    },
    {
      label: "P8 exists in an 8-period match",
      format: 8,
      ot: 0,
      entryId: 1,
      column: period(8),
      expected: true,
    },
    {
      label: "P9 does not exist in an 8-period match",
      format: 8,
      ot: 0,
      entryId: 1,
      column: period(9),
      expected: false,
    },
    {
      label: "period 0 does not exist",
      format: 6,
      ot: 0,
      entryId: 1,
      column: period(0),
      expected: false,
    },
    {
      label: "OT1 does not exist without overtimes",
      format: 6,
      ot: 0,
      entryId: 1,
      column: overtime(1),
      expected: false,
    },
    {
      label: "OT1 exists with one overtime",
      format: 6,
      ot: 1,
      entryId: 1,
      column: overtime(1),
      expected: true,
    },
    {
      label: "OT2 does not exist with one overtime",
      format: 6,
      ot: 1,
      entryId: 1,
      column: overtime(2),
      expected: false,
    },
    {
      label: "OT3 exists with three overtimes",
      format: 4,
      ot: 3,
      entryId: 2,
      column: overtime(3),
      expected: true,
    },
    {
      label: "overtime 0 does not exist",
      format: 6,
      ot: 2,
      entryId: 1,
      column: overtime(0),
      expected: false,
    },
    {
      label: "an entry that is not in the call-up",
      format: 6,
      ot: 0,
      entryId: 99,
      column: period(1),
      expected: false,
    },
    {
      label: "an entry that is not in the call-up, in an overtime",
      format: 6,
      ot: 1,
      entryId: 99,
      column: overtime(1),
      expected: false,
    },
  ] as const)(
    "RF-042 RF-043: $label",
    ({ format, ot, entryId, column, expected }) => {
      const grid = makeGrid({ format, overtimeCount: ot });
      expect(cellExists(grid, { entryId, column })).toBe(expected);
    },
  );

  it("RF-042 RF-043: in a grid with no players no cell exists", () => {
    const grid = makeGrid({ callUp: [], overtimeCount: 1 });
    expect(cellExists(grid, { entryId: 1, column: period(1) })).toBe(false);
    expect(cellExists(grid, { entryId: 0, column: overtime(1) })).toBe(false);
  });

  it("RF-042: a 6-period match with 1 overtime and 10 players has 70 cells, one per player and column", () => {
    const callUp = Array.from({ length: 10 }, (_, index) =>
      entry(index + 1, `Jugador ${index + 1}`, String(index + 1)),
    );
    const grid = makeGrid({ format: 6, overtimeCount: 1, callUp });
    const columns = gridColumns(6, 1);
    expect(columns).toHaveLength(7);
    const cells = callUp.flatMap((row) =>
      columns.map((column) => ({ entryId: row.id, column })),
    );
    expect(cells).toHaveLength(70);
    expect(cells.every((cell) => cellExists(grid, cell))).toBe(true);
  });
});

describe("call-up entries and the data of a player (RF-019)", () => {
  // Juan (player 5) entered the call-up of an old match as 7; after a change he
  // entered another stay as 9. Both are rows of the same grid with their own data.
  const oldStay = { id: 10, playerId: 5, name: "Juan", number: "7" };
  const newStay = { id: 11, playerId: 5, name: "Juan Pérez", number: "9" };

  it("RF-019: two entries of the same player keep their own name and number and have different ids", () => {
    const grid = makeGrid({ callUp: [oldStay, newStay] });
    expect(grid.callUp).toHaveLength(2);
    expect(grid.callUp.map((row) => row.playerId)).toEqual([5, 5]);
    expect(new Set(grid.callUp.map((row) => row.id)).size).toBe(2);
    expect(grid.callUp.map((row) => [row.name, row.number])).toEqual([
      ["Juan", "7"],
      ["Juan Pérez", "9"],
    ]);
  });

  it("RF-019: the cells of the two entries of the same player have different keys, so each keeps its marks", () => {
    const column = period(1);
    expect(cellKey({ entryId: oldStay.id, column })).not.toBe(
      cellKey({ entryId: newStay.id, column }),
    );
    const grid = makeGrid({
      callUp: [oldStay, newStay],
      marks: { "10:P1": "starter", "11:P2": "sub" },
    });
    expect(cellState(grid, { entryId: oldStay.id, column })).toBe("starter");
    expect(cellState(grid, { entryId: newStay.id, column })).toBe("empty");
    expect(cellState(grid, { entryId: oldStay.id, column: period(2) })).toBe(
      "empty",
    );
    expect(cellState(grid, { entryId: newStay.id, column: period(2) })).toBe(
      "sub",
    );
  });
});
