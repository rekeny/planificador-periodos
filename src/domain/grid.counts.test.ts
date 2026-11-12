import type { Column } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  hasSub,
  starterCount,
  cellState,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { comparePlayers } from "@/domain/player-order";
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

describe("starterCount", () => {
  const callUp = [
    entry(1, "Ana", "4"),
    entry(2, "Bea", "7"),
    entry(3, "Eva", "10"),
    entry(4, "Luis", "11"),
    entry(5, "Zoe", "12"),
    entry(6, "Nico", "13"),
  ];

  it("RF-043: counts the starters of one column", () => {
    const grid = makeGrid({
      callUp,
      marks: { "1:P1": "starter", "2:P1": "starter", "3:P1": "starter" },
    });
    expect(starterCount(grid, period(1))).toBe(3);
  });

  it("RF-043: counts only X, not circled X", () => {
    const grid = makeGrid({
      callUp,
      marks: {
        "1:P3": "starter",
        "2:P3": "sub",
        "3:P3": "sub",
        "4:P3": "starter",
      },
    });
    expect(starterCount(grid, period(3))).toBe(2);
  });

  it("RF-043: marks of other columns are not counted", () => {
    const grid = makeGrid({
      callUp,
      overtimeCount: 1,
      marks: { "1:P1": "starter", "2:P2": "starter", "3:OT1": "starter" },
    });
    expect(starterCount(grid, period(1))).toBe(1);
    expect(starterCount(grid, period(2))).toBe(1);
    expect(starterCount(grid, overtime(1))).toBe(1);
    expect(starterCount(grid, period(3))).toBe(0);
  });

  it("RF-043: five starters in a column count 5", () => {
    const grid = makeGrid({
      callUp,
      marks: {
        "1:P2": "starter",
        "2:P2": "starter",
        "3:P2": "starter",
        "4:P2": "starter",
        "5:P2": "starter",
        "6:P2": "sub",
      },
    });
    expect(starterCount(grid, period(2))).toBe(5);
  });

  it("RF-043: P1 does not count the marks of P11 or OT1", () => {
    const grid = makeGrid({
      format: 8,
      callUp,
      overtimeCount: 1,
      marks: { "1:OT1": "starter", "11:P1": "starter" },
    });
    expect(starterCount(grid, period(1))).toBe(0);
  });

  it("RF-043: an empty column and a grid with no players count 0", () => {
    expect(starterCount(makeGrid({ callUp }), period(1))).toBe(0);
    expect(starterCount(makeGrid({ callUp: [] }), period(1))).toBe(0);
    expect(
      starterCount(makeGrid({ callUp: [], overtimeCount: 2 }), overtime(2)),
    ).toBe(0);
  });
});

describe("hasSub", () => {
  it("RF-043: a column with a circled X has a sub", () => {
    const grid = makeGrid({ marks: { "2:P4": "sub" } });
    expect(hasSub(grid, period(4))).toBe(true);
  });

  it("RF-043: a column with only X has no sub", () => {
    const grid = makeGrid({ marks: { "1:P4": "starter", "2:P4": "starter" } });
    expect(hasSub(grid, period(4))).toBe(false);
  });

  it("RF-043: an empty column has no sub", () => {
    expect(hasSub(makeGrid(), period(1))).toBe(false);
  });

  it("RF-043: a sub in another column does not count", () => {
    const grid = makeGrid({
      overtimeCount: 1,
      marks: { "1:P2": "sub", "2:OT1": "sub" },
    });
    expect(hasSub(grid, period(1))).toBe(false);
    expect(hasSub(grid, period(2))).toBe(true);
    expect(hasSub(grid, overtime(1))).toBe(true);
  });

  it("RF-043: a sub in P1 is not read as a sub in P11 or OT1", () => {
    const grid = makeGrid({
      format: 8,
      overtimeCount: 1,
      marks: { "1:P1": "sub" },
    });
    expect(hasSub(grid, overtime(1))).toBe(false);
    expect(hasSub(grid, period(8))).toBe(false);
  });

  it("RF-043: a grid with no players has no sub", () => {
    expect(hasSub(makeGrid({ callUp: [] }), period(1))).toBe(false);
  });
});

describe("rows of the grid", () => {
  it("RF-042 E-020: the call-up sorted with comparePlayers lists Ana 0, Carla 0, Luis 00, Bea 7, Eva 10", () => {
    const rows = [
      entry(1, "Luis", "00"),
      entry(2, "Ana", "0"),
      entry(3, "Eva", "10"),
      entry(4, "Bea", "7"),
      entry(5, "Carla", "0"),
    ];
    expect(
      [...rows].sort(comparePlayers).map((row) => `${row.name} ${row.number}`),
    ).toEqual(["Ana 0", "Carla 0", "Luis 00", "Bea 7", "Eva 10"]);
  });

  it("RF-042: two entries with the same name and number are different rows with their own marks", () => {
    const callUp = [entry(1, "Ana", "7"), entry(2, "Ana", "7")];
    const grid = makeGrid({ callUp, marks: { "2:P1": "starter" } });
    expect(cellState(grid, { entryId: 1, column: period(1) })).toBe("empty");
    expect(cellState(grid, { entryId: 2, column: period(1) })).toBe("starter");
    expect(starterCount(grid, period(1))).toBe(1);
  });
});
