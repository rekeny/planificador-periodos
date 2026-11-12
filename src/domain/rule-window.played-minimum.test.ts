import type { Format } from "@/domain/format";
import type {
  CallUpEntry,
  CallUpEntryId,
  CellKey,
  Mark,
  MatchGrid,
} from "@/domain/grid";
import { playersInRed } from "@/domain/rule-window";

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

// 4 periods, window P1-P3 complete, Juan (entry 1) never starts; entries 2 to 10 have 1 or 2 X.
const FOUR_PERIOD_ROSTERS = [
  [2, 3, 4, 5, 6],
  [7, 8, 9, 10, 2],
  [3, 4, 5, 6, 7],
];

// 8 periods, window P1-P6 complete, Juan only starts P1; entries 2 to 10 have 3 or 4 X.
const EIGHT_PERIOD_ROSTERS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [2, 3, 4, 5, 6],
  [7, 8, 9, 10, 2],
  [3, 4, 5, 6, 7],
  [8, 9, 10, 2, 3],
];

describe("playersInRed, too few periods played", () => {
  it("RF-064 RF-003: in 4 periods a complete window leaves Juan, who never starts, in red", () => {
    const grid = makeGrid(4, startersOf(FOUR_PERIOD_ROSTERS));
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-064 RF-003: in 8 periods a complete window leaves Juan, with one X, in red", () => {
    const grid = makeGrid(8, startersOf(EIGHT_PERIOD_ROSTERS));
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-064: a player with exactly the minimum played is not red (4 periods, entries 8 to 10 have 1 X)", () => {
    const grid = makeGrid(4, startersOf(FOUR_PERIOD_ROSTERS));
    expect(redIds(grid)).not.toContain(8);
  });

  it("RF-064: the played minimum is not judged while a window period has fewer than 5 X", () => {
    const rosters = [
      [2, 3, 4, 5, 6],
      [7, 8, 9, 10, 2],
      [3, 4, 5, 6],
    ];
    const grid = makeGrid(4, startersOf(rosters));
    expect(redIds(grid)).toEqual([]);
  });

  it("RF-064 RF-009: a sub is not played, so Juan with only a sub in P1 is red once the window is complete", () => {
    const grid = makeGrid(4, {
      ...startersOf(FOUR_PERIOD_ROSTERS),
      ...juanMarks([], [1]),
    });
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-064 RF-072 RF-006: X in P7, P8 and an overtime are not played periods of the window", () => {
    const grid = makeGrid(
      8,
      {
        ...startersOf(EIGHT_PERIOD_ROSTERS),
        ...juanMarks([1, 7, 8]),
        "1:OT1": "starter",
      },
      { overtimeCount: 1 },
    );
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-064 RF-063: a player breaking both minimums appears once, as one red", () => {
    const rosters = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6],
      [7, 8, 9, 10, 2],
      [3, 4, 5, 6, 7],
      [8, 9, 10, 2, 3],
    ];
    const grid = makeGrid(6, {
      ...startersOf(rosters),
      ...juanMarks([1], [2, 3, 4]),
    });
    expect(redIds(grid).filter((id) => id === 1)).toHaveLength(1);
    expect(playersInRed(grid).filter((id) => id === 1)).toHaveLength(1);
  });
});

describe("playersInRed, free periods and odd data", () => {
  it("RF-072 RF-006: empty overtime cells are not possible rests, so Juan with X in P1-P4 stays red", () => {
    const grid = makeGrid(6, juanMarks([1, 2, 3, 4]), { overtimeCount: 2 });
    expect(redIds(grid)).toEqual([1]);
  });

  it("RF-072 RF-006: an X in an overtime changes nothing for Juan with X in P1-P3, who is not red", () => {
    const grid = makeGrid(
      6,
      { ...juanMarks([1, 2, 3]), "1:OT1": "starter" },
      { overtimeCount: 1 },
    );
    expect(redIds(grid)).toEqual([]);
  });

  it("RF-063: an empty call-up has nobody in red", () => {
    expect(redIds(makeGrid(6, {}, { players: 0 }))).toEqual([]);
  });

  it.each<Format>([4, 6, 8])(
    "RF-063 RF-064: format %i with no marks has nobody in red",
    (format) => {
      expect(redIds(makeGrid(format, {}))).toEqual([]);
    },
  );
});
