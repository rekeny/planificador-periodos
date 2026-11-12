import type { Format } from "@/domain/format";
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

function makeGrid(format: Format, players: number, marks: Marks): MatchGrid {
  return { format, overtimeCount: 0, callUp: callUpOf(players), marks };
}

// Index 0 lists the entries with an X in P1, index 1 those with an X in P2, and so on.
function startersByPeriod(periods: readonly (readonly number[])[]): Marks {
  const marks: Marks = {};
  periods.forEach((entries, index) => {
    for (const id of entries) marks[`${id}:P${index + 1}`] = "starter";
  });
  return marks;
}

// Complete window with X handed out in cyclic order: five different players per period.
function cyclicWindow(players: number, periods: number): Marks {
  return startersByPeriod(
    Array.from({ length: periods }, (_, period) =>
      Array.from(
        { length: 5 },
        (_unused, slot) => ((period * 5 + slot) % players) + 1,
      ),
    ),
  );
}

// Entries 1 to 5 in P1 and P3, entries 6 to 10 in P2 and P4: everyone has 2 X, P5 and P6 empty.
const E007_STARTERS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];

// 12 players, P1-P4 complete. Pedro (1) and Luis (2) only play P1, everyone else has 2 or 3 X.
const E006_FIRST_FOUR = [
  [1, 2, 3, 4, 5],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 3, 4],
  [6, 7, 8, 9, 10],
];

describe("isRuleImpossible, spec examples that show the warning", () => {
  it.each([6, 9, 10, 12])(
    "RF-004 RF-067 E-003: Juan with X in P1-P4 of 6 periods is impossible with %i players",
    (players) => {
      const grid = makeGrid(6, players, startersByPeriod([[1], [1], [1], [1]]));
      expect(isRuleImpossible(grid)).toBe(true);
    },
  );

  it("RF-003 RF-067 E-004: P1-P5 complete and Pedro only in P1 is impossible (10 players)", () => {
    const grid = makeGrid(
      6,
      10,
      startersByPeriod([
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
      ]),
    );
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it("RF-003 RF-067 E-004: with 12 players where only Pedro is short, the complete window is still impossible", () => {
    const grid = makeGrid(
      6,
      12,
      startersByPeriod([
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 2, 3],
      ]),
    );
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it("RF-003 RF-067 E-006: P5 has 4 X and Pedro and Luis, with 1 X each, are not in it: one slot for two players", () => {
    const grid = makeGrid(
      6,
      12,
      startersByPeriod([...E006_FIRST_FOUR, [11, 12, 3, 5]]),
    );
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it("RF-005 RF-010 RF-065 RF-067 E-015: 8 players in 6 periods with nothing marked is impossible but evaluated", () => {
    expect(isRuleImpossible(makeGrid(6, 8, {}))).toBe(true);
  });

  it("RF-005 RF-010 RF-065 RF-067 E-030: 13 players in 6 periods with nothing marked is impossible but evaluated", () => {
    expect(isRuleImpossible(makeGrid(6, 13, {}))).toBe(true);
  });
});

describe("isRuleImpossible, spec examples that do not show the warning", () => {
  it("RF-062 RF-065 RF-067 E-007: 10 players with 2 X each in P1-P4 and P5 empty is possible", () => {
    expect(
      isRuleImpossible(makeGrid(6, 10, startersByPeriod(E007_STARTERS))),
    ).toBe(false);
  });

  it("RF-064 RF-065 RF-067 E-005: Pedro can still take one of the two places left in P5", () => {
    const grid = makeGrid(
      6,
      12,
      startersByPeriod([
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12],
      ]),
    );
    expect(isRuleImpossible(grid)).toBe(false);
  });

  it.each<readonly [string, Format, Marks]>([
    ["E-001", 6, startersByPeriod([[1], [1], [1]])],
    ["E-002", 6, { ...startersByPeriod([[1], [1]]), "1:P3": "sub" }],
    ["E-008", 8, startersByPeriod([[1], [1], [1], [1]])],
    ["E-009", 4, startersByPeriod([[1], [1]])],
    ["E-010", 4, { ...startersByPeriod([[1]]), "1:P2": "sub" }],
  ])(
    "RF-067 %s: Juan alone with a few marks and 10 players in the call-up is possible",
    (_example, format, marks) => {
      expect(isRuleImpossible(makeGrid(format, 10, marks))).toBe(false);
    },
  );

  it.each<readonly [Format, number]>([
    [4, 8],
    [4, 10],
    [4, 13],
    [6, 9],
    [6, 12],
    [8, 8],
    [8, 13],
  ])(
    "RF-003 RF-004 RF-067: a complete window in cyclic order is possible in %i periods with %i players",
    (format, players) => {
      const windowPeriods = { 4: 3, 6: 5, 8: 6 }[format];
      const grid = makeGrid(
        format,
        players,
        cyclicWindow(players, windowPeriods),
      );
      expect(isRuleImpossible(grid)).toBe(false);
    },
  );
});

describe("isRuleImpossible, boundaries", () => {
  it("RF-003 RF-067 E-006: exactly as many free slots as players who need them is possible", () => {
    // Same as E-006 but P5 has 3 X: two slots for Pedro and Luis.
    const grid = makeGrid(
      6,
      12,
      startersByPeriod([...E006_FIRST_FOUR, [11, 12, 3]]),
    );
    expect(isRuleImpossible(grid)).toBe(false);
  });

  it("RF-003 RF-067 E-006: putting a different player in the fourth place of P5 does not help Pedro or Luis", () => {
    const grid = makeGrid(
      6,
      12,
      startersByPeriod([...E006_FIRST_FOUR, [11, 12, 3, 4]]),
    );
    expect(isRuleImpossible(grid)).toBe(true);
  });

  it.each<readonly [Format, number, boolean]>([
    [4, 7, true],
    [4, 8, false],
    [4, 15, false],
    [4, 16, true],
    [6, 8, true],
    [6, 9, false],
    [6, 12, false],
    [6, 13, true],
    [8, 7, true],
    [8, 8, false],
    [8, 13, false],
  ])(
    "RF-003 RF-004 RF-010 RF-067 E-015 E-030: %i periods, empty grid, %i players: impossible is %s",
    (format, players, expected) => {
      expect(isRuleImpossible(makeGrid(format, players, {}))).toBe(expected);
    },
  );

  it("RF-004 RF-067 E-003: the fourth X of Juan in the first five periods is the one that makes it impossible", () => {
    const three = makeGrid(6, 10, startersByPeriod([[1], [1], [1]]));
    const four = makeGrid(6, 10, startersByPeriod([[1], [1], [1], [1]]));
    expect([isRuleImpossible(three), isRuleImpossible(four)]).toEqual([
      false,
      true,
    ]);
  });
});
