import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { isRuleWindowComplete, windowStats } from "@/domain/rule-window";

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

// Entries 1 to 5 start in every listed period.
function fiveStartersIn(periods: readonly number[]): Marks {
  const marks: Marks = {};
  for (const n of periods) {
    for (const id of [1, 2, 3, 4, 5]) marks[`${id}:P${n}`] = "starter";
  }
  return marks;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

describe("windowStats, spec examples", () => {
  it("RF-062 RF-008 RF-007 E-001: X in P1-P3 of 6 periods gives played 3 and possible rests 2", () => {
    expect(windowStats(makeGrid(6, juanMarks([1, 2, 3])), 1)).toEqual({
      played: 3,
      possibleRests: 2,
    });
  });

  it("RF-009 RF-062 E-002: a sub counts as neither played nor a possible rest", () => {
    expect(windowStats(makeGrid(6, juanMarks([1, 2], [3])), 1)).toEqual({
      played: 2,
      possibleRests: 2,
    });
  });

  it("RF-062 E-003: 4 X in the first 5 periods leave 1 possible rest", () => {
    expect(windowStats(makeGrid(6, juanMarks([1, 2, 3, 4])), 1)).toEqual({
      played: 4,
      possibleRests: 1,
    });
  });

  it("RF-072 RF-002 E-008: only the first 6 periods of 8 count, so X in P7, P8 and an overtime are ignored", () => {
    const grid = makeGrid(8, juanMarks([1, 2, 3, 4, 7, 8]), {
      overtimeCount: 1,
    });
    expect(windowStats(grid, 1)).toEqual({ played: 4, possibleRests: 2 });
  });

  it("RF-072 RF-002 E-008: marks only in P7 and P8 leave the whole window as possible rests", () => {
    expect(windowStats(makeGrid(8, juanMarks([7, 8])), 1)).toEqual({
      played: 0,
      possibleRests: 6,
    });
  });

  it("RF-002 RF-062 E-009: in 4 periods the window is P1-P3 and an X in P4 is ignored", () => {
    expect(windowStats(makeGrid(4, juanMarks([1, 2, 4])), 1)).toEqual({
      played: 2,
      possibleRests: 1,
    });
  });

  it("RF-009 RF-062 E-010: in 4 periods an X and a sub leave 1 played and 1 possible rest", () => {
    expect(windowStats(makeGrid(4, juanMarks([1], [2])), 1)).toEqual({
      played: 1,
      possibleRests: 1,
    });
  });
});

describe("windowStats, every format", () => {
  it.each<[Format, number]>([
    [4, 3],
    [6, 5],
    [8, 6],
  ])(
    "RF-002 RF-008: format %i with no marks has played 0 and every window cell (%i) as a possible rest",
    (format, windowLength) => {
      expect(windowStats(makeGrid(format, {}), 1)).toEqual({
        played: 0,
        possibleRests: windowLength,
      });
    },
  );

  it.each<[Format, number]>([
    [4, 3],
    [6, 5],
    [8, 6],
  ])(
    "RF-002 RF-007: format %i with an X in every window period has played %i and no possible rest",
    (format, windowLength) => {
      const grid = makeGrid(format, juanMarks(range(1, windowLength)));
      expect(windowStats(grid, 1)).toEqual({
        played: windowLength,
        possibleRests: 0,
      });
    },
  );

  it.each<[Format, number]>([
    [4, 3],
    [6, 5],
    [8, 6],
  ])(
    "RF-009 RF-002: format %i with a sub in every window period has played 0 and no possible rest",
    (format, windowLength) => {
      const grid = makeGrid(format, juanMarks([], range(1, windowLength)));
      expect(windowStats(grid, 1)).toEqual({ played: 0, possibleRests: 0 });
    },
  );
});

describe("windowStats, which cells count", () => {
  it("RF-062 RF-008: an empty cell is a possible rest even when its period already has 5 X", () => {
    const grid = makeGrid(6, fiveStartersIn([1]));
    // Entry 6 is not one of the five starters of P1.
    expect(windowStats(grid, 6)).toEqual({ played: 0, possibleRests: 5 });
  });

  it("RF-062: each player has their own stats", () => {
    const grid = makeGrid(6, { ...juanMarks([1, 2]), "2:P1": "starter" });
    expect(windowStats(grid, 1)).toEqual({ played: 2, possibleRests: 3 });
    expect(windowStats(grid, 2)).toEqual({ played: 1, possibleRests: 4 });
  });

  it("RF-072: overtime marks never enter the window stats", () => {
    const grid = makeGrid(
      6,
      { "1:OT1": "starter", "1:OT2": "sub" },
      {
        overtimeCount: 2,
      },
    );
    expect(windowStats(grid, 1)).toEqual({ played: 0, possibleRests: 5 });
  });
});

describe("isRuleWindowComplete", () => {
  it.each<[Format, number]>([
    [4, 3],
    [6, 5],
    [8, 6],
  ])(
    "RF-064: format %i is complete when its %i window periods have 5 X and the free periods are empty",
    (format, windowLength) => {
      const grid = makeGrid(format, fiveStartersIn(range(1, windowLength)));
      expect(isRuleWindowComplete(grid)).toBe(true);
    },
  );

  it.each<[Format, number]>([
    [4, 3],
    [6, 5],
    [8, 6],
  ])(
    "RF-064: format %i is not complete when the last window period has only 4 X, even if every free period has 5 X",
    (format, windowLength) => {
      const marks: Marks = {
        ...fiveStartersIn(range(1, windowLength - 1)),
        ...fiveStartersIn(range(windowLength + 1, format)),
      };
      for (const id of [1, 2, 3, 4])
        marks[`${id}:P${windowLength}`] = "starter";
      const grid = makeGrid(format, marks);
      expect(isRuleWindowComplete(grid)).toBe(false);
    },
  );

  it("RF-064 RF-072: a free period with 5 X does not complete the window", () => {
    expect(isRuleWindowComplete(makeGrid(6, fiveStartersIn([6])))).toBe(false);
  });

  it("RF-064: a grid with no marks is not complete", () => {
    expect(isRuleWindowComplete(makeGrid(6, {}))).toBe(false);
  });

  it("RF-064 RF-009: a sub is not an X, so 4 X and a sub do not complete a period", () => {
    const marks: Marks = { ...fiveStartersIn([2, 3, 4]) };
    for (const id of [1, 2, 3, 4]) marks[`${id}:P1`] = "starter";
    marks["5:P1"] = "sub";
    expect(isRuleWindowComplete(makeGrid(4, marks))).toBe(false);
  });

  it("RF-064 RF-009: 5 X plus a sub do complete the period", () => {
    const marks: Marks = { ...fiveStartersIn([1, 2, 3]), "6:P1": "sub" };
    expect(isRuleWindowComplete(makeGrid(4, marks))).toBe(true);
  });

  it("RF-064: a call-up with fewer than 5 players can never be complete", () => {
    const grid = makeGrid(4, fiveStartersIn([1, 2, 3]), { players: 4 });
    expect(isRuleWindowComplete(grid)).toBe(false);
  });
});
