// The long-press menu on a marked cell (RF-052, RF-053).
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import {
  cellExists,
  cellState,
  hasSub,
  starterCount,
  type Cell,
  type MatchGrid,
} from "@/domain/grid";
import {
  markStarter,
  markSub,
  removeMark,
  type MarkingResult,
} from "@/domain/marking";

export type CellMenuChoice = "starter" | "sub" | "remove";

const CHOICE_STATE = {
  starter: "starter",
  sub: "sub",
  remove: "empty",
} as const;

// A long press on an empty cell, or outside the grid, opens nothing (RF-052).
export function canOpenCellMenu(grid: MatchGrid, cell: Cell): boolean {
  return cellExists(grid, cell) && cellState(grid, cell) !== "empty";
}

export function chooseCellMenuOption(
  grid: MatchGrid,
  cell: Cell,
  choice: CellMenuChoice,
): MarkingResult {
  if (!canOpenCellMenu(grid, cell)) return { kind: "unchanged" };
  if (cellState(grid, cell) === CHOICE_STATE[choice]) {
    return { kind: "unchanged" };
  }

  switch (choice) {
    case "starter":
      if (starterCount(grid, cell.column) >= MAX_STARTERS_PER_PERIOD) {
        return { kind: "chooseReplacedStarter" };
      }
      return { kind: "changed", grid: markStarter(grid, cell) };
    case "sub":
      return { kind: "changed", grid: markSub(grid, cell) };
    case "remove":
      if (cellState(grid, cell) === "starter" && hasSub(grid, cell.column)) {
        return { kind: "confirmRemoveStarter" };
      }
      return { kind: "changed", grid: removeMark(grid, cell) };
  }
}
