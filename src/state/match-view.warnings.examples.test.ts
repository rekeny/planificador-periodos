// T058: the colours, header marks, general warning and legend of the match view for the spec examples
// that state the whole grid (RF-060 to RF-067, RF-072, RF-087). The grids go straight to the real
// buildMatchView with the warnings of the real domain, so what is tested is the mapping only. The
// expected values are written by hand from spec.md, never taken from the domain.
import type { MatchGrid } from "@/domain/grid";
import {
  calmGrid,
  fillPeriods,
  incompleteUpTo,
  JUAN,
  marksIn,
  NOTHING,
  pedroGrid,
  poolOf,
  warningsOf,
  type WarningReading,
} from "../../tests/support/match-view-warnings";
import { gridWith } from "../../tests/support/match-view-grid";

const JUAN_IN_P1_P2_P3 = marksIn(JUAN, ["P1", "P2", "P3"]);

type Row = readonly [name: string, grid: MatchGrid, expected: WarningReading];

const ROWS: readonly Row[] = [
  [
    "E-001 (Juan with X in P1-P3)",
    gridWith({ players: 10, marks: JUAN_IN_P1_P2_P3 }),
    {
      ...NOTHING,
      lightRed: ["100:P4", "100:P5"],
      headerMarks: incompleteUpTo(5),
      legend: ["lightRedCell", "incompletePeriod"],
    },
  ],
  [
    "E-002 (Juan with X in P1-P2 and a sub in P3)",
    gridWith({
      players: 10,
      marks: { ...marksIn(JUAN, ["P1", "P2"]), "100:P3": "sub" },
    }),
    {
      ...NOTHING,
      lightRed: ["100:P4", "100:P5"],
      headerMarks: incompleteUpTo(5, { P3: "inconsistent" }),
      legend: ["lightRedCell", "incompletePeriod", "inconsistentPeriod"],
    },
  ],
  [
    "E-005 (Pedro not in red while P5 has 3 X)",
    pedroGrid(3),
    {
      ...NOTHING,
      headerMarks: { P5: "incomplete" },
      legend: ["incompletePeriod"],
    },
  ],
  [
    "E-007 (no subs, P5 and P6 empty)",
    gridWith({
      players: 10,
      marks: fillPeriods([5, 5, 5, 5], poolOf(10)),
    }),
    {
      ...NOTHING,
      headerMarks: { P5: "incomplete" },
      legend: ["incompletePeriod"],
    },
  ],
  [
    "E-008 (8 periods, Juan with X in P1-P4)",
    gridWith({
      players: 10,
      format: 8,
      marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
    }),
    {
      ...NOTHING,
      lightRed: ["100:P5", "100:P6"],
      headerMarks: incompleteUpTo(6),
      legend: ["lightRedCell", "incompletePeriod"],
    },
  ],
  [
    "E-009 (4 periods, Juan with X in P1-P2)",
    gridWith({
      players: 10,
      format: 4,
      marks: marksIn(JUAN, ["P1", "P2"]),
    }),
    {
      ...NOTHING,
      lightRed: ["100:P3"],
      headerMarks: incompleteUpTo(3),
      legend: ["lightRedCell", "incompletePeriod"],
    },
  ],
  [
    "E-010 (4 periods, Juan with X in P1 and a sub in P2)",
    gridWith({
      players: 10,
      format: 4,
      marks: { "100:P1": "starter", "100:P2": "sub" },
    }),
    {
      ...NOTHING,
      lightRed: ["100:P3"],
      headerMarks: incompleteUpTo(3, { P2: "inconsistent" }),
      legend: ["lightRedCell", "incompletePeriod", "inconsistentPeriod"],
    },
  ],
  [
    "E-015 (8 players, nothing marked)",
    gridWith({ players: 8 }),
    {
      ...NOTHING,
      headerMarks: incompleteUpTo(5),
      ruleImpossible: true,
      legend: ["incompletePeriod"],
    },
  ],
  [
    "E-030 (13 players, nothing marked)",
    gridWith({ players: 13 }),
    {
      ...NOTHING,
      headerMarks: incompleteUpTo(5),
      ruleImpossible: true,
      legend: ["incompletePeriod"],
    },
  ],
  [
    "a grid with no warning (8 periods, 12 players, window complete and met)",
    calmGrid(),
    NOTHING,
  ],
];

describe("match view, warnings of the spec examples", () => {
  it.each(ROWS)(
    "RF-060 RF-061 RF-062 RF-063 RF-064 RF-065 RF-066 RF-067 RF-072 RF-087 E-001 E-002 E-005 E-007 E-008 E-009 E-010 E-015 E-027 E-030: the view of %s shows exactly its light red cells, players in red, header marks, general warning and legend",
    (_name, grid, expected) => {
      expect(warningsOf(grid)).toEqual(expected);
    },
  );
});
