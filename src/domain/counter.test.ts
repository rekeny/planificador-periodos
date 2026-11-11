import { array, assert, constantFrom, integer, property } from "fast-check";
import { playerCounter } from "@/domain/counter";
import { columnKey, gridColumns } from "@/domain/column";
import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";

const juan: CallUpEntry = { id: 1, playerId: 1, name: "Juan", number: "4" };
const pedro: CallUpEntry = { id: 2, playerId: 2, name: "Pedro", number: "7" };

type Marks = Readonly<Partial<Record<CellKey, Mark>>>;

function makeGrid(
  options: {
    format?: Format;
    overtimeCount?: number;
    callUp?: readonly CallUpEntry[];
    marks?: Marks;
  } = {},
): MatchGrid {
  return {
    format: options.format ?? 6,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: options.callUp ?? [juan, pedro],
    marks: options.marks ?? {},
  };
}

// Juan's marks of E-014: X in P1, P3 and P6, a sub in P5; P2, P4 and OT1 empty.
const e014Marks: Marks = {
  "1:P1": "starter",
  "1:P3": "starter",
  "1:P6": "starter",
  "1:P5": "sub",
};

describe("playerCounter, spec example", () => {
  it("RF-070 E-014: Juan with 3 X, a sub and 3 empty cells counts played 3, rested 3", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: e014Marks });
    expect(playerCounter(grid, 1)).toEqual({ played: 3, rested: 3 });
  });

  it("RF-007 E-014: each X adds one played period", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: e014Marks });
    expect(playerCounter(grid, 1).played).toBe(3);
  });

  it("RF-008 E-014: each empty cell adds one rested period, the overtime included", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: e014Marks });
    expect(playerCounter(grid, 1).rested).toBe(3);
  });

  it("RF-009 E-014: the circled X in P5 adds to neither played nor rested", () => {
    const withSub = makeGrid({ overtimeCount: 1, marks: e014Marks });
    const withoutMark = makeGrid({
      overtimeCount: 1,
      marks: { "1:P1": "starter", "1:P3": "starter", "1:P6": "starter" },
    });
    // The cell without the sub is empty, so it adds one rested period.
    expect(playerCounter(withoutMark, 1)).toEqual({ played: 3, rested: 4 });
    expect(playerCounter(withSub, 1)).toEqual({ played: 3, rested: 3 });
  });

  it("RF-070: one counter per player, marks of another player do not count", () => {
    const grid = makeGrid({
      overtimeCount: 1,
      marks: { ...e014Marks, "2:P1": "starter", "2:P2": "starter" },
    });
    expect(playerCounter(grid, 1)).toEqual({ played: 3, rested: 3 });
    expect(playerCounter(grid, 2)).toEqual({ played: 2, rested: 5 });
  });
});

describe("playerCounter, whole match and rule window", () => {
  it.each<[Format, number]>([
    [4, 0],
    [6, 0],
    [8, 0],
    [4, 2],
    [6, 1],
    [8, 3],
  ])(
    "RF-070 RF-008: format %i with %i overtimes and no marks rests in every column",
    (format, overtimeCount) => {
      const grid = makeGrid({ format, overtimeCount });
      const columns = gridColumns(format, overtimeCount).length;
      expect(playerCounter(grid, 1)).toEqual({ played: 0, rested: columns });
    },
  );

  it.each<[Format, number]>([
    [4, 0],
    [6, 0],
    [8, 0],
    [4, 2],
    [6, 1],
    [8, 3],
  ])(
    "RF-070 RF-007: format %i with %i overtimes and an X in every column plays them all",
    (format, overtimeCount) => {
      const columns = gridColumns(format, overtimeCount);
      const marks: Partial<Record<CellKey, Mark>> = {};
      for (const column of columns) marks[`1:${columnKey(column)}`] = "starter";
      const grid = makeGrid({ format, overtimeCount, marks });
      expect(playerCounter(grid, 1)).toEqual({
        played: columns.length,
        rested: 0,
      });
    },
  );

  it("RF-070 RF-072: a player with an X in every period still gets a counter, with no warning or limit", () => {
    const marks: Partial<Record<CellKey, Mark>> = {};
    for (const n of [1, 2, 3, 4, 5, 6]) marks[`1:P${n}`] = "starter";
    expect(playerCounter(makeGrid({ marks }), 1)).toEqual({
      played: 6,
      rested: 0,
    });
  });

  it("RF-072 RF-070: marks in free periods count in the counter (8 periods, window of 6)", () => {
    const grid = makeGrid({
      format: 8,
      marks: { "1:P7": "starter", "1:P8": "starter" },
    });
    expect(playerCounter(grid, 1)).toEqual({ played: 2, rested: 6 });
  });

  it("RF-072 RF-070: marks in overtimes count in the counter", () => {
    const grid = makeGrid({
      overtimeCount: 2,
      marks: { "1:OT1": "starter", "1:OT2": "sub" },
    });
    expect(playerCounter(grid, 1)).toEqual({ played: 1, rested: 6 });
  });

  it("RF-070 RF-007: periods and overtimes with the same number are different columns", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: { "1:OT1": "starter" } });
    expect(playerCounter(grid, 1)).toEqual({ played: 1, rested: 6 });
  });
});

describe("playerCounter, odd data and sequences", () => {
  it("RF-070: an entry not in the call-up counts 0 and 0", () => {
    const grid = makeGrid({ marks: e014Marks });
    expect(playerCounter(grid, 99)).toEqual({ played: 0, rested: 0 });
  });

  it("RF-070: marks of an entry that is not in the call-up do not count for it", () => {
    const grid = makeGrid({
      callUp: [pedro],
      marks: { "1:P1": "starter", "1:P2": "starter" },
    });
    expect(playerCounter(grid, 1)).toEqual({ played: 0, rested: 0 });
  });

  it("RF-070: a call-up with no entries counts 0 and 0", () => {
    expect(playerCounter(makeGrid({ callUp: [] }), 1)).toEqual({
      played: 0,
      rested: 0,
    });
  });

  it("RF-070: a mark in a column the grid does not have is not counted", () => {
    const grid = makeGrid({
      overtimeCount: 1,
      marks: { "1:OT2": "starter", "1:P7": "starter", "1:P1": "starter" },
    });
    expect(playerCounter(grid, 1)).toEqual({ played: 1, rested: 6 });
  });

  it.each([0, 1, 2, 3])(
    "RF-070 RF-008: with %i overtimes added, each one adds one rested period",
    (overtimeCount) => {
      const grid = makeGrid({ overtimeCount, marks: { "1:P1": "starter" } });
      expect(playerCounter(grid, 1)).toEqual({
        played: 1,
        rested: 5 + overtimeCount,
      });
    },
  );

  it("RF-070 RF-007: marking the overtime moves it from rested to played", () => {
    const empty = makeGrid({ overtimeCount: 1 });
    const marked = makeGrid({
      overtimeCount: 1,
      marks: { "1:OT1": "starter" },
    });
    expect(playerCounter(empty, 1)).toEqual({ played: 0, rested: 7 });
    expect(playerCounter(marked, 1)).toEqual({ played: 1, rested: 6 });
  });
});

describe("playerCounter, subs", () => {
  it("RF-071 RF-009: one circled X in 6 periods gives played + rested = 5", () => {
    const grid = makeGrid({ marks: { "1:P3": "sub" } });
    const { played, rested } = playerCounter(grid, 1);
    expect(played + rested).toBe(5);
    expect({ played, rested }).toEqual({ played: 0, rested: 5 });
  });

  it("RF-071 RF-009: a player with only circled X counts played 0 and rested 0", () => {
    const marks: Partial<Record<CellKey, Mark>> = {};
    for (const n of [1, 2, 3, 4, 5, 6]) marks[`1:P${n}`] = "sub";
    expect(playerCounter(makeGrid({ marks }), 1)).toEqual({
      played: 0,
      rested: 0,
    });
  });

  it("RF-009 RF-071: a circled X in an overtime adds to neither", () => {
    const grid = makeGrid({ overtimeCount: 1, marks: { "1:OT1": "sub" } });
    expect(playerCounter(grid, 1)).toEqual({ played: 0, rested: 6 });
  });
});

describe("playerCounter, properties", () => {
  const markArbitrary = constantFrom<Mark | undefined>(
    "starter",
    "sub",
    undefined,
  );

  it("RF-070 RF-071: played + rested + circled X equals the number of columns", () => {
    assert(
      property(
        constantFrom<Format>(4, 6, 8),
        integer({ min: 0, max: 3 }),
        array(markArbitrary, { minLength: 11, maxLength: 11 }),
        (format, overtimeCount, cells) => {
          const columns = gridColumns(format, overtimeCount);
          const marks: Partial<Record<CellKey, Mark>> = {};
          columns.forEach((column, index) => {
            const mark = cells[index];
            if (mark) marks[`1:${columnKey(column)}`] = mark;
          });
          const subs = Object.values(marks).filter((m) => m === "sub").length;
          const counter = playerCounter(
            makeGrid({ format, overtimeCount, marks }),
            1,
          );
          expect(counter.played + counter.rested + subs).toBe(columns.length);
          expect(counter.played + counter.rested).toBeLessThanOrEqual(
            columns.length,
          );
        },
      ),
    );
  });
});
