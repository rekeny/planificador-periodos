import { FORMATS, type Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { isRuleImpossible } from "@/domain/rule-feasibility";

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
  players: number,
  marks: Marks,
  overtimeCount = 0,
): MatchGrid {
  return { format, overtimeCount, callUp: callUpOf(players), marks };
}

// Index 0 lists the entries with a mark in P1, index 1 those with a mark in P2, and so on.
function marksByPeriod(
  periods: readonly (readonly number[])[],
  mark: Mark = "starter",
): Marks {
  const marks: Marks = {};
  periods.forEach((entries, index) => {
    for (const id of entries) marks[`${id}:P${index + 1}`] = mark;
  });
  return marks;
}

// Entries 1 to 5 in P1 and P3, entries 6 to 10 in P2 and P4: everyone has 2 X, P5 and P6 empty (E-007).
const E007_STARTERS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];

const COUNTS_BELOW_FIVE_AND_FIVE = [0, 1, 2, 3, 4, 5];

describe("isRuleImpossible, call-ups too small to fill a period", () => {
  it.each(
    FORMATS.flatMap((format) =>
      COUNTS_BELOW_FIVE_AND_FIVE.map((players) => [format, players] as const),
    ),
  )(
    "RF-010 RF-067: %i periods, %i players and nothing marked is impossible, not an error",
    (format, players) => {
      expect(isRuleImpossible(makeGrid(format, players, {}))).toBe(true);
    },
  );

  it.each<readonly [Format, number]>([
    [4, 4],
    [6, 4],
    [8, 4],
    [6, 5],
  ])(
    "RF-010 RF-067: %i periods and all %i players with an X in every window period is impossible",
    (format, players) => {
      const windowPeriods = { 4: 3, 6: 5, 8: 6 }[format];
      const everyone = Array.from({ length: players }, (_, i) => i + 1);
      const marks = marksByPeriod(
        Array.from({ length: windowPeriods }, () => everyone),
      );
      expect(isRuleImpossible(makeGrid(format, players, marks))).toBe(true);
    },
  );
});

describe("isRuleImpossible, circled X cells are never free cells", () => {
  it("RF-067 E-007: five players with a circled X in P5 leave exactly the five free cells P5 needs, so it is possible", () => {
    const marks = {
      ...marksByPeriod(E007_STARTERS),
      ...marksByPeriod([[], [], [], [], [1, 2, 3, 4, 5]], "sub"),
    };
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(false);
  });

  it("RF-067 E-007: a sixth circled X in P5 leaves four free cells for five X, so it is impossible", () => {
    const marks = {
      ...marksByPeriod(E007_STARTERS),
      ...marksByPeriod([[], [], [], [], [1, 2, 3, 4, 5, 6]], "sub"),
    };
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(true);
  });

  it("RF-004 RF-067 E-007: two circled X leave Juan one possible rest, so it is impossible", () => {
    // If the circled cells counted as rests, Juan would still have 3 and could take an X.
    const marks = {
      ...marksByPeriod(E007_STARTERS),
      ...marksByPeriod([[], [1], [], [1]], "sub"),
    };
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(true);
  });

  it("RF-067 E-002: a circled X of Juan is not a rest and not played, and the rest of the grid can still be filled", () => {
    const marks = { ...marksByPeriod([[1], [1]]), "1:P3": "sub" } as const;
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(false);
  });

  it("RF-067: every cell of the window already circled leaves nothing to fill, so it is impossible", () => {
    const everyone = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const marks = marksByPeriod(
      Array.from({ length: 5 }, () => everyone),
      "sub",
    );
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(true);
  });

  it("RF-067: one period circled for the whole call-up cannot get its five X, so it is impossible", () => {
    const marks = marksByPeriod(
      [[], [], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
      "sub",
    );
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(true);
  });
});

describe("isRuleImpossible, marks outside the window and other odd data", () => {
  it("RF-067 E-007: marks in the free period and in an overtime change nothing", () => {
    const marks: Marks = {
      ...marksByPeriod(E007_STARTERS),
      "1:P6": "starter",
      "2:P6": "starter",
      "3:OT1": "starter",
      "4:OT2": "sub",
    };
    expect(isRuleImpossible(makeGrid(6, 10, marks, 2))).toBe(false);
  });

  it("RF-004 RF-067 E-003: X in the free period P6 give Juan no extra rest, so it stays impossible", () => {
    const marks = marksByPeriod([[1], [1], [1], [1], [], [1, 2, 3, 4, 5]]);
    expect(isRuleImpossible(makeGrid(6, 10, marks))).toBe(true);
  });

  it("RF-004 RF-067: a complete window where Juan has 4 X and one possible rest is impossible", () => {
    const grid = makeGrid(
      6,
      12,
      marksByPeriod([
        [1, 2, 3, 4, 5],
        [1, 6, 7, 8, 9],
        [1, 10, 11, 12, 2],
        [1, 3, 4, 5, 6],
        [7, 8, 9, 10, 11],
      ]),
    );
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it("RF-067 E-006 E-007: the order of the call-up does not change the answer", () => {
    const possible = makeGrid(6, 10, marksByPeriod(E007_STARTERS));
    const impossible = makeGrid(6, 10, marksByPeriod([[1], [1], [1], [1]]));
    const reversed = (grid: MatchGrid): MatchGrid => ({
      ...grid,
      callUp: [...grid.callUp].reverse(),
    });
    expect([
      isRuleImpossible(reversed(possible)),
      isRuleImpossible(reversed(impossible)),
    ]).toEqual([false, true]);
  });

  it("RF-067 E-007: it does not change the grid and gives the same answer twice", () => {
    const grid = makeGrid(6, 10, marksByPeriod(E007_STARTERS));
    const before = JSON.stringify(grid);
    const first = isRuleImpossible(grid);
    expect(isRuleImpossible(grid)).toBe(first);
    expect(JSON.stringify(grid)).toBe(before);
  });
});
