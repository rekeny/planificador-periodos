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

describe("evaluateWarnings, free periods and overtimes", () => {
  it("RF-072 E-008: X in P7, P8 and an overtime change neither the light red cells nor the players in red", () => {
    const window = juanMarks([1, 2, 3, 4]);
    const withFree: Marks = {
      ...window,
      "1:P7": "starter",
      "1:P8": "starter",
      "1:OT1": "starter",
    };
    const without = evaluateWarnings(makeGrid(8, 10, window, 1));
    const withMarks = evaluateWarnings(makeGrid(8, 10, withFree, 1));
    expect(sorted(without.lightRedCells)).toEqual(["1:P5", "1:P6"]);
    expect(sorted(withMarks.lightRedCells)).toEqual(["1:P5", "1:P6"]);
    expect(sorted(withMarks.playersInRed)).toEqual(
      sorted(without.playersInRed),
    );
  });

  it.each<[Format, number[]]>([
    [4, [4]],
    [6, [6]],
    [8, [7, 8]],
  ])(
    "RF-072 E-008: in %i periods, marks only in free periods and the overtime add no light red cell and no player in red",
    (format, freePeriods) => {
      const marks: Marks = { "1:OT1": "starter" };
      for (const n of freePeriods) marks[`1:P${n}`] = "starter";
      marks["2:OT1"] = "sub";
      const warnings = evaluateWarnings(makeGrid(format, 10, marks, 1));
      expect(sorted(warnings.lightRedCells)).toEqual([]);
      expect(sorted(warnings.playersInRed)).toEqual([]);
    },
  );

  it("RF-064 RF-072: a player with no X in a complete window stays in red whatever they play in free periods", () => {
    const window = cyclicWindow(6, 11); // entry 12 has no X in the window
    const free: Marks = {
      ...window,
      "12:P7": "starter",
      "12:P8": "starter",
      "12:OT1": "starter",
    };
    const bare = evaluateWarnings(makeGrid(8, 12, window, 1));
    const played = evaluateWarnings(makeGrid(8, 12, free, 1));
    expect([...bare.playersInRed]).toEqual([12]);
    expect([...played.playersInRed]).toEqual([12]);
    expect(sorted(played.lightRedCells)).toEqual([]);
    expect(played.ruleImpossible).toBe(true);
  });

  it("RF-065 RF-066 RF-072: free periods and overtimes are never incomplete, but a sub with fewer than 5 X is inconsistent", () => {
    const marks: Marks = { "1:P7": "starter", "2:P8": "sub", "3:OT1": "sub" };
    const warnings = evaluateWarnings(
      makeGrid(8, 12, { ...cyclicWindow(6, 12), ...marks }, 1),
    );
    expect(warnings.periodWarnings).toStrictEqual({
      P8: "inconsistent",
      OT1: "inconsistent",
    });
  });
});
