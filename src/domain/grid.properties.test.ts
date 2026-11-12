import { assert, property } from "fast-check";
import { evaluateWarnings } from "@/domain/warnings";
import { gridArbitrary } from "../../tests/support/grid-arbitraries";
import {
  RULES,
  columnsOf,
  expectedInRed,
  expectedLightRed,
  feasibilityBounds,
  isWindowComplete,
  startersIn,
  stateAt,
  warningAt,
  withoutFreeMarks,
} from "../../tests/support/grid-reference";

describe("grid properties: the warnings", () => {
  it("RF-060 RF-061: evaluateWarnings is deterministic, does not modify the grid and reports nothing but the five known warnings", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const before = JSON.stringify(grid);
        const first = evaluateWarnings(grid);
        expect(evaluateWarnings(grid)).toEqual(first);
        expect(JSON.stringify(grid)).toBe(before);
        expect(Object.keys(first).sort()).toEqual([
          "callUpRange",
          "lightRedCells",
          "periodWarnings",
          "playersInRed",
          "ruleImpossible",
        ]);
      }),
    );
  });

  it("RF-062 RF-004 RF-072: every light red cell is an empty rule-window cell of a player with possible rests at or below the minimum, and no such cell is missing", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const shown = [...evaluateWarnings(grid).lightRedCells].sort();
        const free = columnsOf(grid).filter((c) => !c.inWindow);
        expect(shown).toEqual(expectedLightRed(grid));
        for (const c of free) {
          expect(shown.some((cell) => cell.endsWith(`:${c.key}`))).toBe(false);
        }
      }),
    );
  });

  it("RF-063 RF-064 RF-003 RF-004: a player is in red exactly when possible rests are below the minimum, or played is below the minimum once every window period has 5 X", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const shown = [...evaluateWarnings(grid).playersInRed].sort(
          (a, b) => a - b,
        );
        expect(shown).toEqual(expectedInRed(grid));
      }),
    );
  });

  it("RF-065 RF-066 RF-072: a period warns only below 5 X, with «inconsistent» when it has a sub and «incomplete» only in the rule window", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const { periodWarnings } = evaluateWarnings(grid);
        const expected: Record<string, string> = {};
        for (const c of columnsOf(grid)) {
          const hasSub = grid.callUp.some(
            (e) => stateAt(grid, e.id, c.key) === "sub",
          );
          if (startersIn(grid, c.key) >= 5) continue;
          if (hasSub) expected[c.key] = "inconsistent";
          else if (c.inWindow) expected[c.key] = "incomplete";
        }
        expect(periodWarnings).toEqual(expected);
        for (const c of columnsOf(grid).filter((col) => !col.inWindow)) {
          expect(warningAt(periodWarnings, c.key)).not.toBe("incomplete");
        }
      }),
    );
  });

  it("RF-067 RF-060: when the rule is not reported as impossible, the window can still reach 5 X per period and every player their minimums", () => {
    assert(
      property(gridArbitrary, (grid) => {
        if (evaluateWarnings(grid).ruleImpossible) return;
        const { lowest, highest, someoneCannot } = feasibilityBounds(grid);
        const total = 5 * RULES[grid.format].window;
        expect(grid.callUp.length).toBeGreaterThanOrEqual(5);
        expect(someoneCannot).toBe(false);
        expect(lowest).toBeLessThanOrEqual(total);
        expect(highest).toBeGreaterThanOrEqual(total);
      }),
    );
  });

  it("RF-067 RF-063 RF-064: a player in red always comes with the rule-impossible warning, and a complete window is impossible exactly when someone is in red", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const warnings = evaluateWarnings(grid);
        if (warnings.playersInRed.size > 0) {
          expect(warnings.ruleImpossible).toBe(true);
        }
        if (isWindowComplete(grid)) {
          expect(warnings.ruleImpossible).toBe(expectedInRed(grid).length > 0);
        }
      }),
    );
  });

  it("RF-005 RF-068 RF-010: the call-up range warning is present exactly when the number of players is outside the range of the format", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const [min, max] = RULES[grid.format].callUp;
        const count = grid.callUp.length;
        const { callUpRange } = evaluateWarnings(grid);
        if (count >= min && count <= max) expect(callUpRange).toBeNull();
        else
          expect(callUpRange).toEqual({ format: grid.format, min, max, count });
      }),
    );
  });

  it("RF-072 RF-006: marks in free periods and overtimes never change the light red cells, the players in red, the rule-impossible warning or the window period warnings", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const whole = evaluateWarnings(grid);
        const window = evaluateWarnings(withoutFreeMarks(grid));
        expect(whole.lightRedCells).toEqual(window.lightRedCells);
        expect(whole.playersInRed).toEqual(window.playersInRed);
        expect(whole.ruleImpossible).toBe(window.ruleImpossible);
        for (const c of columnsOf(grid).filter((col) => col.inWindow)) {
          expect(warningAt(whole.periodWarnings, c.key)).toBe(
            warningAt(window.periodWarnings, c.key),
          );
        }
      }),
    );
  });
});
