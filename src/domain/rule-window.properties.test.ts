import {
  array,
  assert,
  constantFrom,
  integer,
  property,
  tuple,
} from "fast-check";
import {
  columnKey,
  isRuleWindowColumn,
  ruleWindowColumns,
} from "@/domain/column";
import { playerCounter } from "@/domain/counter";
import { FORMAT_RULES, type Format } from "@/domain/format";
import {
  cellKey,
  cellState,
  starterCount,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import {
  isRuleWindowComplete,
  lightRedCells,
  playersInRed,
  windowStats,
} from "@/domain/rule-window";

const MAX_PLAYERS = 13;
const MAX_COLUMNS = 8 + 3;

type Choice = Mark | undefined;
type Draft = readonly [Format, number, number, readonly Choice[]];

const draftArbitrary = tuple(
  constantFrom<Format>(4, 6, 8),
  integer({ min: 0, max: 3 }),
  integer({ min: 0, max: MAX_PLAYERS }),
  array(constantFrom<Choice>("starter", "sub", undefined, undefined), {
    minLength: MAX_PLAYERS * MAX_COLUMNS,
    maxLength: MAX_PLAYERS * MAX_COLUMNS,
  }),
);

// Builds a grid from the random choices, never putting a sixth X in a period (the only hard limit).
// With includeFree false, no mark goes outside the rule window.
function buildGrid(draft: Draft, includeFree: boolean): MatchGrid {
  const [format, overtimeCount, players, choices] = draft;
  const callUp = Array.from({ length: players }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
  const columns = [
    ...Array.from({ length: FORMAT_RULES[format].periodCount }, (_, i) => ({
      kind: "period" as const,
      number: i + 1,
    })),
    ...Array.from({ length: overtimeCount }, (_, i) => ({
      kind: "overtime" as const,
      number: i + 1,
    })),
  ];
  const marks: Partial<Record<CellKey, Mark>> = {};
  const starters = new Map<string, number>();
  callUp.forEach((entry, row) => {
    columns.forEach((column, col) => {
      const choice = choices[row * MAX_COLUMNS + col];
      const key = columnKey(column);
      const used = starters.get(key) ?? 0;
      if (!choice || (!includeFree && !isRuleWindowColumn(format, column)))
        return;
      if (choice === "starter" && used >= 5) return;
      if (choice === "starter") starters.set(key, used + 1);
      marks[cellKey({ entryId: entry.id, column })] = choice;
    });
  });
  return { format, overtimeCount, callUp, marks };
}

// Counted straight from the cells, so the properties do not lean on windowStats.
function ownStats(grid: MatchGrid, entryId: number) {
  const states = ruleWindowColumns(grid.format).map((column) =>
    cellState(grid, { entryId, column }),
  );
  return {
    played: states.filter((state) => state === "starter").length,
    possibleRests: states.filter((state) => state === "empty").length,
  };
}

describe("rule window properties", () => {
  it("RF-062 RF-004 RF-072: the light red cells are exactly the empty window cells of players with possible rests at or below the minimum", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft, true);
        const { minRested } = FORMAT_RULES[grid.format].ruleWindow;
        const expected: string[] = [];
        for (const entry of grid.callUp) {
          const { possibleRests } = ownStats(grid, entry.id);
          for (const column of ruleWindowColumns(grid.format)) {
            const cell = { entryId: entry.id, column };
            if (cellState(grid, cell) === "empty" && possibleRests <= minRested)
              expected.push(cellKey(cell));
          }
        }
        expect(lightRedCells(grid).map(cellKey).sort()).toEqual(
          expected.sort(),
        );
      }),
    );
  });

  it("RF-063 RF-064 RF-003 RF-004: a player is in red exactly when possible rests are below the minimum, or played is below the minimum in a complete window", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft, true);
        const { minPlayed, minRested } = FORMAT_RULES[grid.format].ruleWindow;
        const complete = ruleWindowColumns(grid.format).every(
          (column) => starterCount(grid, column) === 5,
        );
        const expected = grid.callUp
          .filter((entry) => {
            const stats = ownStats(grid, entry.id);
            return (
              stats.possibleRests < minRested ||
              (complete && stats.played < minPlayed)
            );
          })
          .map((entry) => entry.id);
        expect(isRuleWindowComplete(grid)).toBe(complete);
        expect([...playersInRed(grid)].sort((a, b) => a - b)).toEqual(expected);
      }),
    );
  });

  it("RF-072 RF-006: marks in free periods and overtimes never change the window stats, the light red cells or the players in red", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const withFree = buildGrid(draft, true);
        const windowOnly = buildGrid(draft, false);
        // The 5-X cap works per column, so the window columns get the same marks in both grids.
        expect(lightRedCells(withFree)).toEqual(lightRedCells(windowOnly));
        expect(playersInRed(withFree)).toEqual(playersInRed(windowOnly));
        expect(isRuleWindowComplete(withFree)).toBe(
          isRuleWindowComplete(windowOnly),
        );
        for (const entry of withFree.callUp) {
          expect(windowStats(withFree, entry.id)).toEqual(
            windowStats(windowOnly, entry.id),
          );
        }
      }),
    );
  });

  it("RF-007 RF-008 RF-009 RF-072: windowStats matches the cells, never exceeds the window length nor the whole-match counter", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft, true);
        const windowLength = FORMAT_RULES[grid.format].ruleWindow.periodCount;
        for (const entry of grid.callUp) {
          const stats = windowStats(grid, entry.id);
          expect(stats).toEqual(ownStats(grid, entry.id));
          const counter = playerCounter(grid, entry.id);
          expect(stats.played + stats.possibleRests).toBeLessThanOrEqual(
            windowLength,
          );
          expect(stats.played).toBeLessThanOrEqual(counter.played);
          expect(stats.possibleRests).toBeLessThanOrEqual(counter.rested);
        }
      }),
    );
  });
});
