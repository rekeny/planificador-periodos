import { callUpRangeWarning } from "@/domain/call-up-range";
import { columnKey, gridColumns } from "@/domain/column";
import type { Format } from "@/domain/format";
import {
  cellKey,
  type CallUpEntry,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { periodWarning } from "@/domain/period-warnings";
import { isRuleImpossible } from "@/domain/rule-feasibility";
import { lightRedCells, playersInRed } from "@/domain/rule-window";
import { evaluateWarnings, type Warnings } from "@/domain/warnings";

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

function rangeOf(format: Format): { min: number; max: number } {
  return { min: format === 6 ? 9 : 8, max: 12 };
}

function keysOf(warnings: Warnings): string[] {
  return Object.keys(warnings.periodWarnings).sort();
}

describe("evaluateWarnings, combines the individual rules", () => {
  const grids: [string, MatchGrid][] = [
    [
      "6 periods with Juan short of rests",
      makeGrid(6, 10, juanMarks([1, 2, 3, 4])),
    ],
    ["4 periods with a sub", makeGrid(4, 13, juanMarks([1], [2]))],
    [
      "8 periods and 2 overtimes",
      makeGrid(8, 9, { ...juanMarks([1, 2, 3, 4]), "2:OT2": "sub" }, 2),
    ],
    ["6 periods with a complete window", makeGrid(6, 12, cyclicWindow(5, 12))],
  ];

  it.each(grids)(
    "RF-060: every field matches the single rule it comes from (%s)",
    (_label, grid) => {
      const warnings = evaluateWarnings(grid);
      expect(sorted(warnings.lightRedCells)).toEqual(
        lightRedCells(grid).map(cellKey).sort(),
      );
      expect(sorted(warnings.playersInRed)).toEqual(
        [...playersInRed(grid)].sort(),
      );
      expect(warnings.ruleImpossible).toBe(isRuleImpossible(grid));
      expect(warnings.callUpRange).toEqual(
        callUpRangeWarning(grid.format, grid.callUp.length),
      );
      for (const column of gridColumns(grid.format, grid.overtimeCount)) {
        expect(warnings.periodWarnings[columnKey(column)]).toBe(
          periodWarning(grid, column) ?? undefined,
        );
      }
    },
  );

  it("RF-060: a column with no warning has no entry in periodWarnings", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2], [3])));
    expect(keysOf(warnings)).toEqual(["P1", "P2", "P3", "P4", "P5"]);
    expect("P6" in warnings.periodWarnings).toBe(false);
  });
});

describe("evaluateWarnings, determinism", () => {
  it("RF-060: two evaluations of the same grid are equal", () => {
    const grid = makeGrid(6, 10, juanMarks([1, 2], [3]));
    expect(evaluateWarnings(grid)).toEqual(evaluateWarnings(grid));
  });

  it("RF-060: the order in which the marks were made does not change the result", () => {
    const forward = makeGrid(6, 10, {
      "1:P1": "starter",
      "1:P2": "starter",
      "2:P3": "sub",
    });
    const backward = makeGrid(6, 10, {
      "2:P3": "sub",
      "1:P2": "starter",
      "1:P1": "starter",
    });
    expect(evaluateWarnings(forward)).toEqual(evaluateWarnings(backward));
  });

  it("RF-060: evaluating never changes the grid it receives", () => {
    const grid = makeGrid(6, 10, juanMarks([1, 2, 3, 4], [5]));
    const before = JSON.stringify(grid);
    evaluateWarnings(grid);
    expect(JSON.stringify(grid)).toBe(before);
  });

  it("RF-060: after each change of the marks the warnings match the new state", () => {
    const lightRedAfter = (marks: Marks): string[] =>
      sorted(evaluateWarnings(makeGrid(6, 10, marks)).lightRedCells);
    expect(lightRedAfter(juanMarks([1, 2, 3]))).toEqual(["1:P4", "1:P5"]);
    expect(lightRedAfter(juanMarks([1, 2]))).toEqual([]);
    expect(lightRedAfter(juanMarks([1, 2, 3, 4]))).toEqual(["1:P5"]);
    const red = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3, 4])));
    expect([...red.playersInRed]).toEqual([1]);
    const calm = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2])));
    expect([...calm.playersInRed]).toEqual([]);
  });
});

describe("evaluateWarnings, outside the rules and odd data", () => {
  interface ThirteenPlayers {
    readonly format: Format;
    readonly marks: Marks;
    readonly lightRed: readonly string[];
    readonly inRed: readonly number[];
    readonly impossible: boolean;
    readonly periodKeys: readonly string[];
  }

  it.each<ThirteenPlayers>([
    {
      format: 4,
      marks: juanMarks([1, 2]),
      lightRed: ["1:P3"],
      inRed: [],
      impossible: false,
      periodKeys: ["P1", "P2", "P3"],
    },
    {
      format: 6,
      marks: juanMarks([1, 2, 3, 4]),
      lightRed: ["1:P5"],
      inRed: [1],
      impossible: true,
      periodKeys: ["P1", "P2", "P3", "P4", "P5"],
    },
    {
      format: 8,
      marks: juanMarks([1, 2, 3, 4]),
      lightRed: ["1:P5", "1:P6"],
      inRed: [],
      impossible: false,
      periodKeys: ["P1", "P2", "P3", "P4", "P5", "P6"],
    },
    {
      format: 8,
      marks: { ...juanMarks([1, 2, 3, 4]), "2:P7": "sub" },
      lightRed: ["1:P5", "1:P6"],
      inRed: [],
      impossible: false,
      periodKeys: ["P1", "P2", "P3", "P4", "P5", "P6", "P7"],
    },
  ])(
    "RF-010 RF-060 RF-068: 13 players in $format periods still give every other warning besides the call-up one",
    ({ format, marks, lightRed, inRed, impossible, periodKeys }) => {
      const warnings = evaluateWarnings(makeGrid(format, 13, marks));
      expect(warnings.callUpRange).toEqual({
        format,
        ...rangeOf(format),
        count: 13,
      });
      expect(sorted(warnings.lightRedCells)).toEqual(lightRed);
      expect([...warnings.playersInRed]).toEqual(inRed);
      expect(warnings.ruleImpossible).toBe(impossible);
      expect(keysOf(warnings)).toEqual(periodKeys);
    },
  );

  it.each<[Format, string[]]>([
    [4, ["P1", "P2", "P3"]],
    [6, ["P1", "P2", "P3", "P4", "P5"]],
    [8, ["P1", "P2", "P3", "P4", "P5", "P6"]],
  ])(
    "RF-010 RF-068 RF-067: 0 players in %i periods warn about the call-up and the rule, and every window period is incomplete",
    (format, periodKeys) => {
      const warnings = evaluateWarnings(makeGrid(format, 0));
      expect(warnings.callUpRange).toEqual({
        format,
        ...rangeOf(format),
        count: 0,
      });
      expect(warnings.ruleImpossible).toBe(true);
      expect(sorted(warnings.lightRedCells)).toEqual([]);
      expect(sorted(warnings.playersInRed)).toEqual([]);
      expect(keysOf(warnings)).toEqual(periodKeys);
    },
  );
});
