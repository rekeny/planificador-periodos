// The warning examples of the spec, in one table, through evaluateWarnings only.
// Rows that state the whole grid also assert that no other warning is shown (T019).
import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import type { PeriodWarning } from "@/domain/period-warnings";
import { evaluateWarnings, type Warnings } from "@/domain/warnings";

type Marks = Partial<Record<CellKey, Mark>>;
type PeriodEntries = readonly (readonly [number, readonly number[]])[];

interface Row {
  readonly name: string;
  readonly grid: MatchGrid;
  readonly check: (actual: Warnings) => void;
}

const NOTHING: Warnings = {
  lightRedCells: new Set<CellKey>(),
  playersInRed: new Set<number>(),
  periodWarnings: {},
  ruleImpossible: false,
  callUpRange: null,
};

// Juan is entry 1, Pedro too where the example names him; the others follow.
function callUpOf(count: number): CallUpEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

function marksOf(mark: Mark, entries: PeriodEntries): Marks {
  const marks: Marks = {};
  for (const [period, ids] of entries) {
    for (const id of ids) marks[`${id}:P${period}`] = mark;
  }
  return marks;
}

function gridOf(format: Format, players: number, marks: Marks): MatchGrid {
  return { format, overtimeCount: 0, callUp: callUpOf(players), marks };
}

// The same warning on a run of periods, as the examples say "P1–P5 show «!»".
function periodsWith(
  first: number,
  last: number,
  warning: PeriodWarning,
): Warnings["periodWarnings"] {
  const warnings: Partial<Record<`P${number}`, PeriodWarning>> = {};
  for (let number = first; number <= last; number += 1) {
    warnings[`P${number}`] = warning;
  }
  return warnings;
}

const JUAN = 1;

// Juan's cells in the given periods.
function juanIn(mark: Mark, periods: readonly number[]): Marks {
  return marksOf(
    mark,
    periods.map((period) => [period, [JUAN]] as const),
  );
}
const JUAN_P4_P5 = new Set<CellKey>(["1:P4", "1:P5"]);

// The spec states the whole grid: what it says is shown and nothing else is.
function whole(expected: Partial<Warnings>): Row["check"] {
  return (actual) => {
    expect(actual).toEqual({ ...NOTHING, ...expected });
  };
}

// The spec states only some warnings: those must be shown, the rest is not checked.
function stated(expected: Partial<Warnings>): Row["check"] {
  return (actual) => {
    for (const key of expected.lightRedCells ?? []) {
      expect(actual.lightRedCells).toContain(key);
    }
    for (const id of expected.playersInRed ?? []) {
      expect(actual.playersInRed).toContain(id);
    }
    expect(actual.ruleImpossible).toBe(expected.ruleImpossible);
  };
}

const ROWS: readonly Row[] = [
  {
    name: "E-001 RF-002 RF-004 RF-008 RF-062 RF-065 RF-067: 6 periods, Juan with X in P1-P3 has P4 and P5 in light red",
    grid: gridOf(6, 10, juanIn("starter", [1, 2, 3])),
    check: whole({
      lightRedCells: JUAN_P4_P5,
      periodWarnings: periodsWith(1, 5, "incomplete"),
    }),
  },
  {
    name: "E-002 RF-004 RF-009 RF-062 RF-065 RF-066 RF-067: 6 periods, Juan with a sub in P3 still has P4 and P5 in light red and P3 is inconsistent",
    grid: gridOf(6, 10, {
      ...juanIn("starter", [1, 2]),
      ...juanIn("sub", [3]),
    }),
    check: whole({
      lightRedCells: JUAN_P4_P5,
      periodWarnings: {
        ...periodsWith(1, 5, "incomplete"),
        P3: "inconsistent",
      },
    }),
  },
  {
    name: "E-003 RF-004 RF-062 RF-063 RF-067: 6 periods, Juan with X in P1-P4 is in red, P5 is light red and the rule is impossible",
    grid: gridOf(6, 10, juanIn("starter", [1, 2, 3, 4])),
    check: stated({
      playersInRed: new Set([JUAN]),
      lightRedCells: new Set<CellKey>(["1:P5"]),
      ruleImpossible: true,
    }),
  },
  {
    // Pedro is entry 1; the other nine rotate through the remaining places.
    name: "E-004 RF-003 RF-007 RF-064 RF-067: 6 periods, full window and Pedro with one X is in red and the rule is impossible",
    grid: gridOf(
      6,
      10,
      marksOf("starter", [
        [1, [1, 2, 3, 4, 5]],
        [2, [2, 3, 4, 5, 6]],
        [3, [6, 7, 8, 9, 10]],
        [4, [2, 7, 8, 9, 10]],
        [5, [3, 4, 5, 6, 7]],
      ]),
    ),
    check: stated({ playersInRed: new Set([1]), ruleImpossible: true }),
  },
  {
    // Pedro is entry 1, with one X in P1; each of the other 11 has exactly 2 X in P1-P5.
    name: "E-005 RF-064 RF-065 RF-067: 6 periods, window not complete, Pedro with one X is not in red and only P5 is incomplete",
    grid: gridOf(
      6,
      12,
      marksOf("starter", [
        [1, [1, 2, 3, 4, 5]],
        [2, [6, 7, 8, 9, 10]],
        [3, [11, 12, 2, 3, 4]],
        [4, [5, 6, 7, 8, 9]],
        [5, [10, 11, 12]],
      ]),
    ),
    check: whole({ periodWarnings: { P5: "incomplete" } }),
  },
  {
    // Pedro is entry 1 and Luis entry 2: one X each, both in P1-P4 and neither in P5.
    name: "E-006 RF-003 RF-067: 6 periods, one place left in P5 for Pedro and Luis who both need it makes the rule impossible",
    grid: gridOf(
      6,
      10,
      marksOf("starter", [
        [1, [1, 3, 4, 5, 6]],
        [2, [2, 3, 4, 5, 6]],
        [3, [3, 7, 8, 9, 10]],
        [4, [4, 7, 8, 9, 10]],
        [5, [5, 6, 7, 8]],
      ]),
    ),
    check: stated({ ruleImpossible: true }),
  },
  {
    // The spec states the grid: no subs, each player 2 X in P1-P4, P5 and P6 empty.
    name: "E-007 RF-062 RF-065 RF-067: 6 periods, 10 players with 2 X each in P1-P4 and P5 empty shows only the incomplete P5",
    grid: gridOf(
      6,
      10,
      marksOf("starter", [
        [1, [1, 2, 3, 4, 5]],
        [2, [6, 7, 8, 9, 10]],
        [3, [1, 2, 3, 4, 5]],
        [4, [6, 7, 8, 9, 10]],
      ]),
    ),
    check: whole({ periodWarnings: { P5: "incomplete" } }),
  },
  {
    name: "E-008 RF-002 RF-004 RF-006 RF-062 RF-065 RF-067 RF-072: 8 periods, Juan with X in P1-P4 has P5 and P6 in light red and P7 and P8 stay free",
    grid: gridOf(8, 10, juanIn("starter", [1, 2, 3, 4])),
    check: whole({
      lightRedCells: new Set<CellKey>(["1:P5", "1:P6"]),
      periodWarnings: periodsWith(1, 6, "incomplete"),
    }),
  },
  {
    name: "E-009 RF-002 RF-004 RF-006 RF-062 RF-065 RF-067: 4 periods, Juan with X in P1 and P2 has P3 in light red and P4 stays free",
    grid: gridOf(4, 10, juanIn("starter", [1, 2])),
    check: whole({
      lightRedCells: new Set<CellKey>(["1:P3"]),
      periodWarnings: periodsWith(1, 3, "incomplete"),
    }),
  },
  {
    name: "E-010 RF-009 RF-062 RF-065 RF-066 RF-067: 4 periods, Juan with X in P1 and a sub in P2 has P3 in light red and P2 is inconsistent",
    grid: gridOf(4, 10, {
      ...juanIn("starter", [1]),
      ...juanIn("sub", [2]),
    }),
    check: whole({
      lightRedCells: new Set<CellKey>(["1:P3"]),
      periodWarnings: {
        P1: "incomplete",
        P2: "inconsistent",
        P3: "incomplete",
      },
    }),
  },
  {
    name: "E-015 RF-005 RF-010 RF-065 RF-067 RF-068: 6 periods, 8 players and no marks is below the call-up minimum and the rule is impossible",
    grid: gridOf(6, 8, {}),
    check: whole({
      callUpRange: { format: 6, min: 9, max: 12, count: 8 },
      ruleImpossible: true,
      periodWarnings: periodsWith(1, 5, "incomplete"),
    }),
  },
  {
    name: "E-030 RF-005 RF-010 RF-065 RF-067 RF-068: 6 periods, 13 players and no marks is above the call-up maximum and the rule is impossible",
    grid: gridOf(6, 13, {}),
    check: whole({
      callUpRange: { format: 6, min: 9, max: 12, count: 13 },
      ruleImpossible: true,
      periodWarnings: periodsWith(1, 5, "incomplete"),
    }),
  },
];

describe("spec examples, warnings of a grid", () => {
  it.each(ROWS)(
    "E-001 E-002 E-003 E-004 E-005 E-006 E-007 E-008 E-009 E-010 E-015 E-030 (spec example): $name",
    ({ grid, check }) => {
      check(evaluateWarnings(grid));
    },
  );
});
