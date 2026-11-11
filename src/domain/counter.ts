// The player counter: periods played and rested over the whole match (RF-070, RF-071).
import { gridColumns } from "@/domain/column";
import { cellState, type CallUpEntryId, type MatchGrid } from "@/domain/grid";

export interface PlayerCounter {
  readonly played: number; // X in every column, overtimes included (RF-070)
  readonly rested: number; // empty cells in every column; circled X adds to neither (RF-071)
}

export function playerCounter(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): PlayerCounter {
  if (!grid.callUp.some((entry) => entry.id === entryId)) {
    return { played: 0, rested: 0 };
  }
  let played = 0;
  let rested = 0;
  for (const column of gridColumns(grid.format, grid.overtimeCount)) {
    const state = cellState(grid, { entryId, column });
    if (state === "starter") played += 1;
    else if (state === "empty") rested += 1;
  }
  return { played, rested };
}
