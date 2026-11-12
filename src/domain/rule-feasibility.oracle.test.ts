// Brute-force oracle for "rule impossible to meet" (RF-067): every filling of the empty cells of the rule
// window is enumerated and checked against the minimums of RF-003 and RF-004. `isRuleImpossible` must agree.
// The oracle and the generators live in tests/support/feasibility-oracle.ts.
import { assert, property, sample } from "fast-check";
import { FORMAT_RULES, type Format } from "@/domain/format";
import { cellKey, type MatchGrid } from "@/domain/grid";
import { isRuleImpossible } from "@/domain/rule-feasibility";
import {
  cyclicWindowGrid,
  isPossibleByBruteForce,
  mixedFeasibilityGridArbitrary,
  possibleFeasibilityGridArbitrary,
  withCircled,
  withoutX,
} from "../../tests/support/feasibility-oracle";

const keyOf = (grid: MatchGrid, period: number, row: number): string =>
  cellKey({
    entryId: grid.callUp[row]?.id ?? -1,
    column: { kind: "period", number: period + 1 },
  });

// The grid with an X at (period index, row).
function withMarkOf(grid: MatchGrid, period: number, row: number): MatchGrid {
  return {
    ...grid,
    marks: { ...grid.marks, [keyOf(grid, period, row)]: "starter" },
  };
}

function expectAgreement(grid: MatchGrid): void {
  expect(isRuleImpossible(grid)).toBe(!isPossibleByBruteForce(grid));
}

const CALL_UPS: readonly [Format, number][] = ([4, 6, 8] as const).flatMap(
  (format) =>
    Array.from(
      { length: 13 - FORMAT_RULES[format].callUpMin + 1 },
      (_, index): [Format, number] => [
        format,
        FORMAT_RULES[format].callUpMin + index,
      ],
    ),
);

describe("isRuleImpossible against brute force, one grid at a time", () => {
  // Format 6 has no valid window for 13 players: they need 26 played periods and the window has 25 X.
  it.each(
    CALL_UPS.filter(([format, players]) => !(format === 6 && players === 13)),
  )(
    "RF-003 RF-004 RF-067: a valid complete window of %i periods with %i players, with up to 4 X removed, is possible",
    (format, players) => {
      const valid = cyclicWindowGrid(format, players, 0);
      expect(isRuleImpossible(valid)).toBe(false);
      expect(isPossibleByBruteForce(valid)).toBe(true);
      const spots = [
        [0, 0],
        [1, 1],
        [2, 2],
        [0, 4],
      ] as const;
      for (let removed = 1; removed <= 4; removed += 1) {
        const grid = withoutX(valid, spots.slice(0, removed));
        expect(isPossibleByBruteForce(grid)).toBe(true);
        expect(isRuleImpossible(grid)).toBe(false);
      }
      // All four removed from one period.
      const onePeriod = withoutX(valid, [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ]);
      expect(isPossibleByBruteForce(onePeriod)).toBe(true);
      expect(isRuleImpossible(onePeriod)).toBe(false);
    },
  );

  it.each([
    [4, 8],
    [8, 8],
    [6, 9],
  ] as const)(
    "RF-003 RF-004 RF-005 RF-067: the smallest call-up of %i periods, %i players, is possible",
    (format, players) => {
      expect(players).toBe(FORMAT_RULES[format].callUpMin);
      const grid = cyclicWindowGrid(format, players, 0);
      expect(isPossibleByBruteForce(grid)).toBe(true);
      expect(isRuleImpossible(grid)).toBe(false);
    },
  );

  it("RF-003 RF-004 RF-067: one player at exactly 2 played and 2 rested is fine, one rest less is not", () => {
    // 9 players in 6 periods: the window has 25 X, players 7 and 8 have 2 X and 3 empty cells.
    const valid = cyclicWindowGrid(6, 9, 0);
    const empty = [0, 1, 2, 3, 4].filter(
      (period) => valid.marks[keyOf(valid, period, 7) as never] === undefined,
    );
    expect(empty).toHaveLength(3);
    const exact = withCircled(valid, [[empty[0] as number, 7]]);
    expect(isPossibleByBruteForce(exact)).toBe(true);
    expect(isRuleImpossible(exact)).toBe(false);
    const short = withCircled(valid, [
      [empty[0] as number, 7],
      [empty[1] as number, 7],
    ]);
    expect(isPossibleByBruteForce(short)).toBe(false);
    expect(isRuleImpossible(short)).toBe(true);
  });

  it("RF-003 RF-004 RF-067: a player at the played minimum is fine until the X they need goes to someone else", () => {
    // 8 players in 8 periods: the window has 30 X, players 0-5 have 4 X (2 rested, exactly the minimum)
    // and players 6 and 7 have 3 X. Take one X off player 6: they are left with 2, exactly the minimum.
    const valid = cyclicWindowGrid(8, 8, 0);
    const given = [0, 1, 2, 3, 4, 5].find(
      (period) => valid.marks[keyOf(valid, period, 6) as never] === "starter",
    ) as number;
    const removed = withoutX(valid, [[given, 6]]);
    expect(isPossibleByBruteForce(removed)).toBe(true);
    expect(isRuleImpossible(removed)).toBe(false);
    // The same X given to a player with 4 X and an empty cell there: complete window, but that player now
    // has only 1 rested period, below the minimum of 2.
    const taker = [0, 1, 2, 3, 4, 5].find(
      (row) => removed.marks[keyOf(removed, given, row) as never] === undefined,
    ) as number;
    const taken = withMarkOf(removed, given, taker);
    expect(isPossibleByBruteForce(taken)).toBe(false);
    expect(isRuleImpossible(taken)).toBe(true);
  });

  it.each([4, 6, 8] as const)(
    "RF-003 RF-067: 13 players in %i periods, a valid-looking window with 4 X missing, agrees with brute force",
    (format) => {
      const grid = withoutX(cyclicWindowGrid(format, 13, 0), [
        [0, 0],
        [1, 6],
        [2, 11],
        [0, 3],
      ]);
      expectAgreement(grid);
      // 13 players need 26 played periods in the 6-period window of 25 X (E-030): never possible.
      if (format === 6) expect(isRuleImpossible(grid)).toBe(true);
    },
  );

  it("RF-067: circled X in most empty cells of a period leave too few cells for the X missing", () => {
    // Period 1 of 8 players in 4 periods has 3 empty cells and 5 X: take 3 X off P1 and circle 3 cells.
    const valid = cyclicWindowGrid(4, 8, 0);
    const grid = withCircled(
      withoutX(valid, [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ]),
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 5],
      ],
    );
    expect(isPossibleByBruteForce(grid)).toBe(false);
    expect(isRuleImpossible(grid)).toBe(true);
  });
});

describe("isRuleImpossible against brute force, on random realistic grids", () => {
  it("RF-003 RF-004 RF-067: agrees on the mixed generator", () => {
    assert(property(mixedFeasibilityGridArbitrary, expectAgreement));
  });

  it("RF-003 RF-004 RF-067: agrees on the possible-by-construction generator, and says possible", () => {
    assert(
      property(possibleFeasibilityGridArbitrary, (grid) => {
        expect(isPossibleByBruteForce(grid)).toBe(true);
        expect(isRuleImpossible(grid)).toBe(false);
      }),
    );
  });

  it("RF-067: the mixed generator gives at least 20 % of each outcome (fixed seed)", () => {
    const grids = sample(mixedFeasibilityGridArbitrary, { seed: 20261111 });
    const possible = grids.filter(isPossibleByBruteForce).length;
    expect(possible / grids.length).toBeGreaterThanOrEqual(0.2);
    expect((grids.length - possible) / grids.length).toBeGreaterThanOrEqual(
      0.2,
    );
  });
});
