// The rule window: statistics, light red cells and players in red (RF-062 to RF-064, RF-072).
import { ruleWindowColumns } from "@/domain/column";
import { FORMAT_RULES, MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import {
  cellState,
  starterCount,
  type Cell,
  type CallUpEntryId,
  type MatchGrid,
} from "@/domain/grid";

export interface WindowStats {
  readonly played: number; //        X in the window
  readonly possibleRests: number; // empty cells in the window (RF-062)
}

// Only rule-window columns count: free periods and overtimes never do (RF-072).
// A circled X counts as neither played nor rest.
export function windowStats(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): WindowStats {
  let played = 0;
  let possibleRests = 0;
  for (const column of ruleWindowColumns(grid.format)) {
    const state = cellState(grid, { entryId, column });
    if (state === "starter") played += 1;
    else if (state === "empty") possibleRests += 1;
  }
  return { played, possibleRests };
}

// Every window period has exactly 5 X; a call-up of fewer than 5 can never complete it.
export function isRuleWindowComplete(grid: MatchGrid): boolean {
  return ruleWindowColumns(grid.format).every(
    (column) => starterCount(grid, column) === MAX_STARTERS_PER_PERIOD,
  );
}

// Empty window cells of players whose possible rests are at or below the minimum (RF-062).
export function lightRedCells(grid: MatchGrid): readonly Cell[] {
  const { minRested } = FORMAT_RULES[grid.format].ruleWindow;
  const cells: Cell[] = [];
  for (const entry of grid.callUp) {
    if (windowStats(grid, entry.id).possibleRests > minRested) continue;
    for (const column of ruleWindowColumns(grid.format)) {
      const cell = { entryId: entry.id, column };
      if (cellState(grid, cell) === "empty") cells.push(cell);
    }
  }
  return cells;
}

// Possible rests below the minimum (RF-063), or played below the minimum once the window is complete (RF-064).
export function playersInRed(grid: MatchGrid): readonly CallUpEntryId[] {
  const { minRested, minPlayed } = FORMAT_RULES[grid.format].ruleWindow;
  const complete = isRuleWindowComplete(grid);
  return grid.callUp
    .filter((entry) => {
      const stats = windowStats(grid, entry.id);
      return (
        stats.possibleRests < minRested ||
        (complete && stats.played < minPlayed)
      );
    })
    .map((entry) => entry.id);
}
