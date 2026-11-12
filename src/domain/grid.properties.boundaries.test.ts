import { assert, property } from "fast-check";
import { playerCounter } from "@/domain/counter";
import type { CellKey, Mark, MatchGrid } from "@/domain/grid";
import { evaluateWarnings } from "@/domain/warnings";
import {
  balancedWindowGridArbitrary,
  callUpOf,
  fullColumnsGridArbitrary,
  gridArbitrary,
  minimumsGridArbitrary,
} from "../../tests/support/grid-arbitraries";
import {
  RULES,
  columnsOf,
  expectedLightRed,
  isWindowComplete,
  startersIn,
  stateAt,
  windowStats,
} from "../../tests/support/grid-reference";

describe("grid properties: complete windows", () => {
  it("RF-061 RF-065: a complete 8-period window spread over 10 to 12 players with no sub reports nothing at all", () => {
    assert(
      property(balancedWindowGridArbitrary, (grid) => {
        const warnings = evaluateWarnings(grid);
        expect(warnings.lightRedCells.size).toBe(0);
        expect(warnings.playersInRed.size).toBe(0);
        expect(warnings.periodWarnings).toEqual({});
        expect(warnings.ruleImpossible).toBe(false);
        expect(warnings.callUpRange).toBeNull();
      }),
    );
  });

  it("RF-061 RF-072: a complete 8-period window with 12 players, each with 2 or 3 X and no sub, reports no warning at all", () => {
    const callUp = callUpOf(12);
    const marks: Partial<Record<CellKey, Mark>> = {};
    for (let period = 1; period <= 6; period += 1) {
      for (let slot = 0; slot < 5; slot += 1) {
        const entry = callUp[((period - 1) * 5 + slot) % 12];
        marks[`${entry?.id}:P${period}` as CellKey] = "starter";
      }
    }
    const grid: MatchGrid = { format: 8, overtimeCount: 0, callUp, marks };
    for (const entry of callUp) {
      const { played } = windowStats(grid, entry.id);
      expect([2, 3]).toContain(played);
    }
    const warnings = evaluateWarnings(grid);
    expect([...warnings.lightRedCells]).toEqual([]);
    expect([...warnings.playersInRed]).toEqual([]);
    expect(warnings.periodWarnings).toEqual({});
    expect(warnings.ruleImpossible).toBe(false);
    expect(warnings.callUpRange).toBeNull();
  });
});

describe("grid properties: the boundaries", () => {
  it("RF-055 RF-064 RF-065: with exactly 5 X in every column the window is complete and no period is incomplete", () => {
    assert(
      property(fullColumnsGridArbitrary, (grid) => {
        for (const c of columnsOf(grid)) {
          expect(startersIn(grid, c.key)).toBe(5);
        }
        expect(isWindowComplete(grid)).toBe(true);
        const { periodWarnings } = evaluateWarnings(grid);
        expect(Object.values(periodWarnings)).not.toContain("incomplete");
      }),
    );
  });

  it("RF-062 RF-063 RF-003 RF-004: players exactly at a minimum are light red when it is their rests, and never in red for rests alone", () => {
    assert(
      property(minimumsGridArbitrary, (grid) => {
        const { minPlayed, minRested } = RULES[grid.format];
        const { lightRedCells, playersInRed } = evaluateWarnings(grid);
        for (const entry of grid.callUp) {
          const { played, possibleRests } = windowStats(grid, entry.id);
          expect(played === minPlayed || possibleRests === minRested).toBe(
            true,
          );
          if (possibleRests === minRested) {
            expect(playersInRed.has(entry.id)).toBe(
              isWindowComplete(grid) && played < minPlayed,
            );
          }
        }
        expect([...lightRedCells].sort()).toEqual(expectedLightRed(grid));
      }),
    );
  });
});

describe("grid properties: the counter", () => {
  it("RF-070 RF-071 RF-072: played + rested + circled X equals the number of columns for every player, overtimes included", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const columns = columnsOf(grid);
        for (const entry of grid.callUp) {
          const states = columns.map((c) => stateAt(grid, entry.id, c.key));
          const counter = playerCounter(grid, entry.id);
          const circled = states.filter((s) => s === "sub").length;
          expect(counter.played).toBe(
            states.filter((s) => s === "starter").length,
          );
          expect(counter.played + counter.rested + circled).toBe(
            columns.length,
          );
        }
      }),
    );
  });
});
