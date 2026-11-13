import {
  columnKey,
  gridColumns,
  type Column,
  type ColumnKey,
} from "@/domain/column";
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
}

export interface CellView {
  readonly key: CellKey;
  readonly cell: Cell; // what the screen hands back when the cell is tapped
  readonly state: CellState;
}

/** One column per period, then one per overtime, as the domain lists them (RF-042, RF-058). */
export function columnViews(grid: MatchGrid): readonly ColumnView[] {
  return gridColumns(grid.format, grid.overtimeCount).map((column) => ({
    key: columnKey(column),
    column,
  }));
}

/** The cells of one row in column order, each with its state taken from the domain (RF-043). */
export function cellViews(
  grid: MatchGrid,
  entryId: number,
  columns: readonly ColumnView[],
): readonly CellView[] {
  return columns.map(({ column }) => {
    const cell: Cell = { entryId, column };
    return { key: cellKey(cell), cell, state: cellState(grid, cell) };
  });
}
