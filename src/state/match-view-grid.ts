import {
  columnKey,
  gridColumns,
  type Column,
  type ColumnKey,
} from "@/domain/column";
import type { PeriodWarning } from "@/domain/period-warnings";
import type { Warnings } from "@/domain/warnings";
import { headerMarkOf, isLightRed } from "@/state/match-view-warnings";
import {
  cellKey,
  cellState,
  type Cell,
  type CellKey,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";

export interface ColumnView {
  readonly key: ColumnKey;
  readonly column: Column;
  readonly headerMark: PeriodWarning | null; // «!» or «≠» (RF-064, RF-065, RF-066)
}

export interface CellView {
  readonly key: CellKey;
  readonly cell: Cell; // what the screen hands back when the cell is tapped
  readonly state: CellState;
  readonly isLightRed: boolean; // RF-060, RF-061
}

/** One column per period, then one per overtime, as the domain lists them (RF-042, RF-058). */
export function columnViews(
  grid: MatchGrid,
  warnings: Warnings,
): readonly ColumnView[] {
  return gridColumns(grid.format, grid.overtimeCount).map((column) => {
    const key = columnKey(column);
    return { key, column, headerMark: headerMarkOf(warnings, key) };
  });
}

/** The cells of one row in column order, each with its state taken from the domain (RF-043). */
export function cellViews(
  grid: MatchGrid,
  entryId: number,
  columns: readonly ColumnView[],
  warnings: Warnings,
): readonly CellView[] {
  return columns.map(({ column }) => {
    const cell: Cell = { entryId, column };
    const key = cellKey(cell);
    return {
      key,
      cell,
      state: cellState(grid, cell),
      isLightRed: isLightRed(warnings, key),
    };
  });
}
