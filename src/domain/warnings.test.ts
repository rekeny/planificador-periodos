import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { evaluateWarnings } from "@/domain/warnings";

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
  marks: Marks = {},
  overtimeCount = 0,
): MatchGrid {
  return { format, overtimeCount, callUp: callUpOf(players), marks };
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

// 5 X in each of the first `periods` periods, given in cyclic order to the
// first `players` entries: nobody repeats inside a period.
function cyclicWindow(periods: number, players: number): Marks {
  const marks: Marks = {};
  for (let period = 0; period < periods; period += 1) {
    for (let slot = 0; slot < 5; slot += 1) {
      const entryId = ((period * 5 + slot) % players) + 1;
      marks[`${entryId}:P${period + 1}`] = "starter";
    }
  }
  return marks;
}

function sorted<T>(values: ReadonlySet<T>): T[] {
  return [...values].sort();
}

describe("evaluateWarnings, spec examples", () => {
  it("RF-005 RF-010 RF-065 RF-067 RF-068 E-015: 8 players in 6 periods with no marks show every call-up and period warning, but no red", () => {
    const warnings = evaluateWarnings(makeGrid(6, 8));
    expect(warnings.callUpRange).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 8,
    });
    expect(warnings.ruleImpossible).toBe(true);
    expect(warnings.periodWarnings).toStrictEqual({
      P1: "incomplete",
      P2: "incomplete",
      P3: "incomplete",
      P4: "incomplete",
      P5: "incomplete",
    });
    expect(sorted(warnings.playersInRed)).toEqual([]);
    expect(sorted(warnings.lightRedCells)).toEqual([]);
  });

  it("RF-005 RF-010 RF-065 RF-067 RF-068 E-030: 13 players in 6 periods with no marks show every call-up and period warning, but no red", () => {
    const warnings = evaluateWarnings(makeGrid(6, 13));
    expect(warnings.callUpRange).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 13,
    });
    expect(warnings.ruleImpossible).toBe(true);
    expect(Object.keys(warnings.periodWarnings).sort()).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
    ]);
    expect(sorted(warnings.playersInRed)).toEqual([]);
    expect(sorted(warnings.lightRedCells)).toEqual([]);
  });

  it("RF-062 RF-065 RF-066 RF-067 E-002: a sub in P3 gives light red P4 and P5, a «≠» on P3, «!» on the rest and nothing else", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2], [3])));
    expect(sorted(warnings.lightRedCells)).toEqual(["1:P4", "1:P5"]);
    expect(warnings.periodWarnings).toStrictEqual({
      P1: "incomplete",
      P2: "incomplete",
      P3: "inconsistent",
      P4: "incomplete",
      P5: "incomplete",
    });
    expect(sorted(warnings.playersInRed)).toEqual([]);
    expect(warnings.ruleImpossible).toBe(false);
    expect(warnings.callUpRange).toBeNull();
  });

  it("RF-062 RF-063 RF-067 E-003: 4 X in the first 5 periods put Juan in red, P5 light red and the rule impossible", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3, 4])));
    expect(sorted(warnings.lightRedCells)).toEqual(["1:P5"]);
    expect([...warnings.playersInRed]).toEqual([1]);
    expect(warnings.ruleImpossible).toBe(true);
    expect(warnings.callUpRange).toBeNull();
  });

  it("RF-062 RF-065 RF-067 E-001: X in P1, P2 and P3 gives light red P4 and P5, «!» on P1 to P5 and no red", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3])));
    expect(sorted(warnings.lightRedCells)).toEqual(["1:P4", "1:P5"]);
    expect(Object.keys(warnings.periodWarnings).sort()).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
    ]);
    expect(sorted(warnings.playersInRed)).toEqual([]);
    expect(warnings.ruleImpossible).toBe(false);
  });
});

describe("evaluateWarnings, a grid with nothing to warn about", () => {
  it.each<[string, number]>([
    ["12 players, six of them with 3 X and six with 2 X", 12],
    ["11 players, eight of them with 3 X and three with 2 X", 11],
    ["10 players, each with exactly 3 X", 10],
  ])(
    "RF-060 RF-061 RF-087: a complete 8-period window with %s and no sub reports nothing",
    (_label, players) => {
      const warnings = evaluateWarnings(
        makeGrid(8, players, cyclicWindow(6, players)),
      );
      expect(sorted(warnings.lightRedCells)).toEqual([]);
      expect(sorted(warnings.playersInRed)).toEqual([]);
      expect(warnings.periodWarnings).toStrictEqual({});
      expect(warnings.ruleImpossible).toBe(false);
      expect(warnings.callUpRange).toBeNull();
    },
  );
});
