// Marking the grid: what a tap on a cell does (RF-044 to RF-051, RF-055).
import {
  columnKey,
  gridColumns,
  isRuleWindowColumn,
  type Column,
} from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import {
  cellExists,
  cellKey,
  cellState,
  hasSub,
  starterCount,
  type Cell,
  type CallUpEntryId,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";

export type MarkingResult =
  | { readonly kind: "changed"; readonly grid: MatchGrid }
  | { readonly kind: "unchanged" }
  | { readonly kind: "askSubOrStarter" } //       RF-045
  | { readonly kind: "chooseReplacedStarter" } // RF-047 after "starter", RF-053
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

// Answer "sub" (RF-046): a circled X; the period keeps its X.
export function markSub(grid: MatchGrid, cell: Cell): MatchGrid {
  if (!cellExists(grid, cell)) return grid;
  return withMark(grid, cell, "sub");
}

// Long-press choice "starter" (RF-052): the cell takes an X.
export function markStarter(grid: MatchGrid, cell: Cell): MatchGrid {
  if (!cellExists(grid, cell)) return grid;
  return withMark(grid, cell, "starter");
}

// The entries with an X in the column, in call-up order (RF-047).
export function replaceableStarters(
  grid: MatchGrid,
  column: Column,
): readonly CallUpEntryId[] {
  const key = columnKey(column);
  const inGrid = gridColumns(grid.format, grid.overtimeCount).some(
    (gridColumn) => columnKey(gridColumn) === key,
  );
  if (!inGrid) return [];
  return grid.callUp
    .filter(
      (entry) => cellState(grid, { entryId: entry.id, column }) === "starter",
    )
    .map((entry) => entry.id);
}

// Answer "starter" (RF-047): the tapped cell takes an X and the chosen X is emptied.
export function replaceStarter(
  grid: MatchGrid,
  cell: Cell,
  replaced: CallUpEntryId,
): MatchGrid {
  if (!cellExists(grid, cell)) return grid;
  const replacedCell: Cell = { entryId: replaced, column: cell.column };
  if (cellState(grid, replacedCell) !== "starter") return grid;
  return withMark(withoutMark(grid, replacedCell), cell, "starter");
}

// "Remove anyway" (RF-054): empties the cell; circled Xs stay as they are.
export function removeMark(grid: MatchGrid, cell: Cell): MatchGrid {
  if (!cellExists(grid, cell)) return grid;
  return withoutMark(grid, cell);
}
