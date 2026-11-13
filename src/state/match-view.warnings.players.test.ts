// T058: players in red and the general warning in the match view (RF-063, RF-064, RF-067). The
// examples that do not state the whole grid (E-003, E-004, E-006) are checked only on what they
// name, which holds whatever the rest of the grid is. Real buildMatchView, real domain.
import {
  fillPeriods,
  JUAN,
  marksIn,
  pedroGrid,
  poolOf,
  warningsOf,
} from "../../tests/support/match-view-warnings";
import { gridWith } from "../../tests/support/match-view-grid";

describe("match view, players in red", () => {
  it("RF-062 RF-063 RF-067 E-003: Juan with 4 X in the first 5 periods is the only player in red, P5 is light red and the general warning is on", () => {
    const view = warningsOf(
      gridWith({
        players: 10,
        marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
      }),
    );
    expect(view.inRed).toEqual([100]);
    expect(view.lightRed).toEqual(["100:P5"]);
    expect(view.ruleImpossible).toBe(true);
    expect(view.legend).toEqual([
      "lightRedCell",
      "playerInRed",
      "incompletePeriod",
    ]);
  });

  it("RF-063 E-003: with the third X Juan is not in red yet (two rests left), with the fourth he is", () => {
    const third = warningsOf(
      gridWith({ players: 10, marks: marksIn(JUAN, ["P1", "P2", "P3"]) }),
    );
    expect(third.inRed).toEqual([]);
    expect(third.ruleImpossible).toBe(false);
    const fourth = warningsOf(
      gridWith({
        players: 10,
        marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
      }),
    );
    expect(fourth.inRed).toEqual([100]);
  });

  it("RF-064 RF-067 E-004: with P1-P5 at 5 X each and Pedro only in P1, Pedro is in red and the general warning is on", () => {
    const view = warningsOf(pedroGrid(5));
    expect(view.inRed).toContain(100);
    expect(view.ruleImpossible).toBe(true);
    expect(view.headerMarks).toEqual({});
    expect(view.legend).toContain("playerInRed");
  });

  it("RF-064 RF-065 RF-067 E-005: with 3 X in P5 Pedro is not in red, nobody is, and only P5 has a header mark", () => {
    const view = warningsOf(pedroGrid(3));
    expect(view.inRed).toEqual([]);
    expect(view.headerMarks).toEqual({ P5: "incomplete" });
    expect(view.ruleImpossible).toBe(false);
    expect(view.legend).not.toContain("playerInRed");
  });

  it("RF-064 RF-065 RF-067 E-004 E-005: the same grid goes from not in red to in red, and from a mark on P5 to none, when P5 reaches 5 X", () => {
    const before = warningsOf(pedroGrid(3));
    const after = warningsOf(pedroGrid(5));
    expect(before.inRed.includes(100)).toBe(false);
    expect(after.inRed.includes(100)).toBe(true);
    expect(before.headerMarks.P5).toBe("incomplete");
    expect(after.headerMarks.P5).toBeUndefined();
    expect(before.ruleImpossible).toBe(false);
    expect(after.ruleImpossible).toBe(true);
  });
});

describe("match view, general warning", () => {
  it("RF-067 E-006: P1-P4 with 5 X, P5 with 4 and Pedro and Luis with 1 X each and neither in P5 turn the general warning on, with only P5 marked", () => {
    const marks = {
      ...marksIn(JUAN, ["P1"]),
      ...marksIn(101, ["P1"]),
      ...fillPeriods([3, 5, 5, 5, 4], poolOf(8, 2)),
    };
    const view = warningsOf(gridWith({ players: 10, marks }));
    expect(view.ruleImpossible).toBe(true);
    expect(view.headerMarks).toEqual({ P5: "incomplete" });
  });

  it("RF-067 E-001 E-007: the general warning is off in a grid that can still be filled", () => {
    const marks = marksIn(JUAN, ["P1", "P2", "P3"]);
    expect(warningsOf(gridWith({ players: 10, marks })).ruleImpossible).toBe(
      false,
    );
    expect(warningsOf(gridWith({ players: 10 })).ruleImpossible).toBe(false);
  });
});
