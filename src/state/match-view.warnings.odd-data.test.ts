// T058: free periods, overtimes, header marks of mixed periods and the legend in the match view
// (RF-006, RF-061, RF-065, RF-066, RF-072, RF-087, E-027). The view is built from the whole grid, so
// what is on screen never changes it. Real buildMatchView, real domain; expected values by hand.
import {
  calmGrid,
  incompleteUpTo,
  JUAN,
  marksIn,
  type Marks,
  NOTHING,
  warningsOf,
} from "../../tests/support/match-view-warnings";
import { gridWith, viewOf } from "../../tests/support/match-view-grid";

describe("match view, nothing to warn about", () => {
  it("RF-061 RF-087: a grid with no warning has every flag false or null by default, no general warning and an empty legend", () => {
    const view = viewOf(calmGrid());
    expect(view.columns.map((c) => c.headerMark)).toEqual(Array(8).fill(null));
    expect(view.rows.map((r) => r.isInRed)).toEqual(Array(12).fill(false));
    for (const row of view.rows) {
      expect(row.cells.map((c) => c.isLightRed)).toEqual(Array(8).fill(false));
    }
    expect(view.ruleImpossible).toBe(false);
    expect(view.legend).toEqual([]);
  });
});

describe("match view, free periods and overtimes", () => {
  it("RF-006 RF-072: X in P7, P8 and the overtimes never colour or mark anything", () => {
    const extra = {
      ...marksIn(JUAN, ["P7", "P8", "OT1", "OT2"]),
      ...marksIn(101, ["P7", "OT1", "OT3"]),
    };
    const view = viewOf(calmGrid(extra, 3));
    expect(view.columns).toHaveLength(11);
    expect(warningsOf(calmGrid(extra, 3))).toEqual(NOTHING);
  });

  it("RF-006 RF-065 RF-072 E-008: with 3 overtimes Juan's light red P5 and P6 stay in the grid and in the legend, and P7, P8 and the overtimes have no colour or mark", () => {
    const grid = gridWith({
      players: 10,
      format: 8,
      overtimeCount: 3,
      marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
    });
    const view = viewOf(grid);
    expect(view.columns).toHaveLength(11);
    expect(warningsOf(grid)).toEqual({
      ...NOTHING,
      lightRed: ["100:P5", "100:P6"],
      headerMarks: incompleteUpTo(6),
      legend: ["lightRedCell", "incompletePeriod"],
    });
  });

  it("RF-066 RF-072: a sub with fewer than 5 X marks the free period and the overtime «≠», and only them", () => {
    const grid = calmGrid({ "100:P7": "sub", "101:OT2": "sub" }, 3);
    expect(warningsOf(grid)).toEqual({
      ...NOTHING,
      headerMarks: { P7: "inconsistent", OT2: "inconsistent" },
      legend: ["inconsistentPeriod"],
    });
  });

  it("RF-065 RF-066: a free period with 5 X and a sub is not inconsistent and shows no mark", () => {
    const grid = calmGrid({
      ...marksIn(100, ["P7"]),
      ...marksIn(101, ["P7"]),
      ...marksIn(102, ["P7"]),
      ...marksIn(103, ["P7"]),
      ...marksIn(104, ["P7"]),
      "105:P7": "sub",
    });
    expect(warningsOf(grid)).toEqual(NOTHING);
  });
});

describe("match view, header marks of mixed periods", () => {
  it("RF-065 RF-066: a window period with a sub and 4 X shows only «≠», never «!» as well, and the other window periods show «!»", () => {
    const marks: Marks = {
      ...marksIn(100, ["P3"]),
      ...marksIn(101, ["P3"]),
      ...marksIn(102, ["P3"]),
      ...marksIn(103, ["P3"]),
      "104:P3": "sub",
    };
    const grid = gridWith({ players: 10, marks });
    expect(warningsOf(grid).headerMarks).toEqual(
      incompleteUpTo(5, { P3: "inconsistent" }),
    );
  });
});

describe("match view, legend", () => {
  it("RF-087 E-027: in the situation of E-002 the legend explains the light red cell, «!» and «≠», in that order, and not the player in red", () => {
    const grid = gridWith({
      players: 10,
      marks: { ...marksIn(JUAN, ["P1", "P2"]), "100:P3": "sub" },
    });
    const view = viewOf(grid);
    expect(view.legend).toEqual([
      "lightRedCell",
      "incompletePeriod",
      "inconsistentPeriod",
    ]);
    expect(view.rows.some((row) => row.isInRed)).toBe(false);
  });

  it("RF-087: with only a light red cell in the grid the legend never explains the player in red", () => {
    const grid = gridWith({
      players: 10,
      marks: marksIn(JUAN, ["P1", "P2", "P3"]),
    });
    expect(viewOf(grid).legend).not.toContain("playerInRed");
    expect(viewOf(grid).legend).toContain("lightRedCell");
  });
});

describe("match view, flags follow the entry", () => {
  it("RF-062 RF-063 E-003: the light red cell and the player in red belong to the fourth row when it is the fourth row that has the X", () => {
    const grid = gridWith({
      players: 10,
      marks: marksIn(103, ["P1", "P2", "P3", "P4"]),
    });
    const view = viewOf(grid);
    expect(view.rows.map((row) => row.isInRed)).toEqual(
      Array.from({ length: 10 }, (_, row) => row === 3),
    );
    expect(warningsOf(grid).lightRed).toEqual(["103:P5"]);
  });
});
