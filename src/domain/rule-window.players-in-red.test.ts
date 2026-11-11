import type { Format } from "@/domain/format";
import type {
  CallUpEntry,
  CallUpEntryId,
  CellKey,
  Mark,
  MatchGrid,
} from "@/domain/grid";
import { lightRedCells, playersInRed } from "@/domain/rule-window";

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

function redIds(grid: MatchGrid): CallUpEntryId[] {
  return [...playersInRed(grid)].sort((a, b) => a - b);
}

// E-004: Pedro (entry 1) only has an X in P1; the window is complete and entries 2 to 10 have 2 or 3 X.
const E004_ROSTERS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [2, 3, 4, 5, 6],
  [7, 8, 9, 10, 2],
  [3, 4, 5, 6, 7],
];

// E-005: 12 players. P1-P4 have 5 X, P5 has 3 X, Pedro (entry 1) only has an X in P1, entries 2 to 12 have exactly 2 X.
const E005_ROSTERS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12],
];

describe("playersInRed, spec examples", () => {
  it("RF-063 RF-004 E-003: 4 X in the first 5 periods of 6 put Juan in red at once, with P5 still light red", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 4]));
    expect(redIds(grid)).toEqual([1]);
    expect(lightRedCells(grid)).toHaveLength(1);
  });

  it("RF-064 RF-003 RF-007 E-004: with P1-P5 at 5 X each, Pedro with only one X is in red and nobody else", () => {
    expect(redIds(makeGrid(6, startersOf(E004_ROSTERS)))).toEqual([1]);
  });

  it("RF-064 E-005: while P5 has fewer than 5 X, Pedro is not in red and nothing is light red", () => {
    const grid = makeGrid(6, startersOf(E005_ROSTERS), { players: 12 });
    expect(redIds(grid)).toEqual([]);
    expect(lightRedCells(grid)).toEqual([]);
  });

  it("RF-064 E-005 E-004: filling P5 to 5 X turns Pedro red, because the window is now complete", () => {
    const filled = [...E005_ROSTERS.slice(0, 4), [10, 11, 12, 2, 3]];
    const grid = makeGrid(6, startersOf(filled), { players: 12 });
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-063 RF-004 E-001: X in P1-P3 of 6 periods is not red (possible rests equal the minimum)", () => {
    expect(redIds(makeGrid(6, juanMarks([1, 2, 3])))).toEqual([]);
  });

  it("RF-063 RF-009 E-002: an X, an X and a sub in 6 periods is not red", () => {
    expect(redIds(makeGrid(6, juanMarks([1, 2], [3])))).toEqual([]);
  });

  it("RF-063 RF-072 E-008: X in P1-P4 of 8 periods is not red", () => {
    expect(redIds(makeGrid(8, juanMarks([1, 2, 3, 4])))).toEqual([]);
  });

  it("RF-063 RF-072 E-008: marks only in P7 and P8 of 8 periods colour nobody", () => {
    expect(redIds(makeGrid(8, juanMarks([7, 8])))).toEqual([]);
  });

  it("RF-063 RF-002 E-009: X in P1 and P2 of 4 periods is not red", () => {
    expect(redIds(makeGrid(4, juanMarks([1, 2])))).toEqual([]);
  });

  it("RF-063 RF-009 E-010: an X and a sub in 4 periods is not red", () => {
    expect(redIds(makeGrid(4, juanMarks([1], [2])))).toEqual([]);
  });
});

describe("playersInRed, boundaries of the minimum of rests", () => {
  it.each<[Format, number, CallUpEntryId[]]>([
    [4, 2, []],
    [4, 3, [1]],
    [6, 3, []],
    [6, 4, [1]],
    [6, 5, [1]],
    [8, 4, []],
    [8, 5, [1]],
    [8, 6, [1]],
  ])(
    "RF-063 RF-004 RF-002: format %i with X in the first %i window periods has the red players %j",
    (format, starterCount, expected) => {
      const periods = Array.from({ length: starterCount }, (_, i) => i + 1);
      expect(redIds(makeGrid(format, juanMarks(periods)))).toEqual(expected);
    },
  );

  it("RF-063 RF-009: two X and two subs leave one possible rest, so Juan is red", () => {
    const grid = makeGrid(6, juanMarks([1, 2], [3, 4]));
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-063: each player is judged on their own cells", () => {
    const grid = makeGrid(6, {
      ...juanMarks([1, 2, 3, 4]),
      ...startersOf([[2, 3], [2, 3], [2, 3], [2], [2]]),
    });
    expect(redIds(grid)).toEqual([1, 2]);
  });
});
