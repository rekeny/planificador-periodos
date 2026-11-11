// Marking the grid: what a tap on a cell does (RF-044 to RF-051, RF-055).
import { isRuleWindowColumn } from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import {
  cellExists,
  cellKey,
  cellState,
  hasSub,
  starterCount,
  type Cell,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

export type MarkingResult =
  | { readonly kind: "changed"; readonly grid: MatchGrid }
  | { readonly kind: "unchanged" }
  | { readonly kind: "askSubOrStarter" } //       RF-045
  | { readonly kind: "confirmRemoveStarter" }; // RF-050 reminder

function withMark(grid: MatchGrid, cell: Cell, mark: Mark): MatchGrid {
  return { ...grid, marks: { ...grid.marks, [cellKey(cell)]: mark } };
}

function withoutMark(grid: MatchGrid, cell: Cell): MatchGrid {
  const key = cellKey(cell);
  const marks = Object.fromEntries(
    Object.entries(grid.marks).filter(([markKey]) => markKey !== key),
  );
  return { ...grid, marks };
}

export function tapCell(grid: MatchGrid, cell: Cell): MarkingResult {
  if (!cellExists(grid, cell)) return { kind: "unchanged" };

  switch (cellState(grid, cell)) {
    case "empty":
      if (starterCount(grid, cell.column) < MAX_STARTERS_PER_PERIOD) {
        return { kind: "changed", grid: withMark(grid, cell, "starter") };
      }
      if (isRuleWindowColumn(grid.format, cell.column)) {
        return { kind: "askSubOrStarter" };
      }
      return { kind: "changed", grid: withMark(grid, cell, "sub") };
    case "starter":
      if (hasSub(grid, cell.column)) return { kind: "confirmRemoveStarter" };
      return { kind: "changed", grid: withoutMark(grid, cell) };
    case "sub":
      return { kind: "changed", grid: withoutMark(grid, cell) };
  }
}
