import type { Format } from "@/domain/format";
import {
  cellKey,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { lightRedCells } from "@/domain/rule-window";

type Marks = Partial<Record<CellKey, Mark>>;

function callUpOf(count: number): CallUpEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: index === 0 ? "Juan" : `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

function makeGrid(
  format: Format,
  marks: Marks,
  options: { players?: number; overtimeCount?: number } = {},
): MatchGrid {
  return {
    format,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: callUpOf(options.players ?? 10),
    marks,
  };
}

// Juan is entry 1.
function juanMarks(
  starterPeriods: readonly number[],
  subPeriods: readonly number[] = [],
): Marks {
  const marks: Marks = {};
  for (const n of starterPeriods) marks[`1:P${n}`] = "starter";
  for (const n of subPeriods) marks[`1:P${n}`] = "sub";
  return marks;
}

// rosters[i] lists the entries with an X in period i + 1.
function startersOf(rosters: readonly (readonly number[])[]): Marks {
  const marks: Marks = {};
  rosters.forEach((ids, index) => {
    for (const id of ids) marks[`${id}:P${index + 1}`] = "starter";
  });
  return marks;
}

function lightRedKeys(grid: MatchGrid): CellKey[] {
  return lightRedCells(grid).map(cellKey).sort();
}

describe("lightRedCells, spec examples", () => {
  it("RF-062 RF-004 RF-008 RF-002 E-001: Juan with X in P1, P2 and P3 of 6 periods has P4 and P5 light red", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3]));
    expect(lightRedKeys(grid)).toEqual(["1:P4", "1:P5"]);
  });

  it("RF-062 RF-009 E-002: a sub in P3 does not count as a rest, so P4 and P5 are light red and P3 is not", () => {
    const grid = makeGrid(6, juanMarks([1, 2], [3]));
    expect(lightRedKeys(grid)).toEqual(["1:P4", "1:P5"]);
  });

  it("RF-062 RF-004 E-003: with 4 X in the first 5 periods, P5 is light red although the possible rests are already below the minimum", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 4]));
    expect(lightRedKeys(grid)).toEqual(["1:P5"]);
  });

  it("RF-062 RF-002 RF-006 RF-072 E-008: in 8 periods Juan's P5 and P6 are light red and P7 and P8 have no colour", () => {
    const grid = makeGrid(8, juanMarks([1, 2, 3, 4]));
    expect(lightRedKeys(grid)).toEqual(["1:P5", "1:P6"]);
  });

  it("RF-062 RF-002 RF-006 E-009: in 4 periods Juan's P3 is light red and P4 has no colour", () => {
    const grid = makeGrid(4, juanMarks([1, 2]));
    expect(lightRedKeys(grid)).toEqual(["1:P3"]);
  });

  it("RF-062 RF-009 E-010: in 4 periods an X and a sub leave P3 light red", () => {
    const grid = makeGrid(4, juanMarks([1], [2]));
    expect(lightRedKeys(grid)).toEqual(["1:P3"]);
  });

  it("RF-062: a returned cell names the player's entry and the period column", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 4]));
    expect(lightRedCells(grid)).toEqual([
      { entryId: 1, column: { kind: "period", number: 5 } },
    ]);
  });
});

describe("lightRedCells, boundaries at the minimum of rests", () => {
  it.each<[Format, number, CellKey[]]>([
    [4, 1, []],
    [4, 2, ["1:P3"]],
    [4, 3, []],
    [6, 2, []],
    [6, 3, ["1:P4", "1:P5"]],
    [6, 4, ["1:P5"]],
    [6, 5, []],
    [8, 3, []],
    [8, 4, ["1:P5", "1:P6"]],
    [8, 5, ["1:P6"]],
    [8, 6, []],
  ])(
    "RF-062 RF-004 RF-002: format %i with X in the first %i window periods has the light red cells %j",
    (format, starterCount, expected) => {
      const periods = Array.from({ length: starterCount }, (_, i) => i + 1);
      expect(lightRedKeys(makeGrid(format, juanMarks(periods)))).toEqual(
        expected,
      );
    },
  );
});

describe("lightRedCells, which cells count", () => {
  it("RF-062 RF-008: the empty cells need not be consecutive", () => {
    const grid = makeGrid(6, juanMarks([1, 3, 5]));
    expect(lightRedKeys(grid)).toEqual(["1:P2", "1:P4"]);
  });

  it("RF-062 RF-009: sub cells are never light red, even when the possible rests are at the minimum", () => {
    const grid = makeGrid(6, juanMarks([1], [2, 3]));
    expect(lightRedKeys(grid)).toEqual(["1:P4", "1:P5"]);
  });

  it("RF-062 RF-008: possible rests count whether or not the period is complete yet (P4 with 5 X stays light red)", () => {
    const withFullP4 = makeGrid(6, {
      ...juanMarks([1, 2, 3]),
      ...startersOf([[], [], [], [2, 3, 4, 5, 6]]),
    });
    expect(lightRedKeys(withFullP4)).toEqual(["1:P4", "1:P5"]);
  });

  it("RF-062: every player is evaluated on their own cells", () => {
    const grid = makeGrid(6, {
      ...juanMarks([1, 2, 3]),
      ...startersOf([[2], [2], [2], [2]]),
    });
    expect(lightRedKeys(grid)).toEqual(["1:P4", "1:P5", "2:P5"]);
  });

  it("RF-062 RF-004: players with possible rests above the minimum have no light red cell (spec E-007: 2 X in P1-P4 of 6 periods)", () => {
    const grid = makeGrid(
      6,
      startersOf([
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
      ]),
    );
    expect(lightRedKeys(grid)).toEqual([]);
  });
});

describe("lightRedCells, free periods and overtimes", () => {
  it("RF-072 RF-006 E-008: marks only in P7 and P8 of 8 periods colour nothing", () => {
    const grid = makeGrid(8, juanMarks([7, 8]));
    expect(lightRedKeys(grid)).toEqual([]);
  });

  it("RF-072 RF-006 E-008: X in P7, P8 and an overtime do not change the light red cells of the window", () => {
    const grid = makeGrid(8, juanMarks([1, 2, 3, 4, 7, 8]), {
      overtimeCount: 1,
    });
    expect(lightRedKeys(grid)).toEqual(["1:P5", "1:P6"]);
  });

  it("RF-072 RF-006: an X in the free P6 of 6 periods changes nothing in the window (X in P1-P3 still light-reds P4 and P5)", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 6]), { overtimeCount: 1 });
    expect(lightRedKeys(grid)).toEqual(["1:P4", "1:P5"]);
  });

  it("RF-006 RF-072: an empty free period or overtime is never light red, whatever the player", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 4]), { overtimeCount: 2 });
    expect(lightRedKeys(grid)).toEqual(["1:P5"]);
  });
});

describe("lightRedCells, odd data", () => {
  it("RF-062: an empty call-up has no light red cells", () => {
    expect(lightRedKeys(makeGrid(6, {}, { players: 0 }))).toEqual([]);
  });

  it.each<Format>([4, 6, 8])(
    "RF-062 RF-004: format %i with no marks has no light red cell",
    (format) => {
      expect(lightRedKeys(makeGrid(format, {}))).toEqual([]);
    },
  );

  it("RF-062: the same grid gives the same cells every time and the grid is not changed", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3]));
    const before = JSON.stringify(grid);
    expect(lightRedKeys(grid)).toEqual(lightRedKeys(grid));
    expect(JSON.stringify(grid)).toBe(before);
  });
});
