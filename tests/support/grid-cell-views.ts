// Helpers of the tests of the grid column headers and cells (T054). This file holds no test calls.
// The views come from the real buildMatchView (src/state/match-view.ts), so the tests draw exactly
// what the state publishes. The call-up entry is always the one with id 7.
import type { ColumnKey } from "@/domain/column";
import type { Format } from "@/domain/format";
import type { CellState } from "@/domain/grid";
import type { CellView, ColumnView } from "@/state/match-view-grid";
import { gridWith, viewOf } from "./match-view-grid";

export interface CellOptions {
  readonly state?: CellState;
  readonly column?: ColumnKey;
  readonly name?: string;
  readonly number?: string;
  readonly format?: Format;
  readonly overtimeCount?: number;
}

/** The view of one cell of one player, and the name the screen would pass beside it. */
export function cellOf(options: CellOptions = {}): {
  readonly view: CellView;
  readonly name: string;
} {
  const {
    state = "empty",
    column = "P2",
    name = "Ana",
    number = "4",
    format = 6,
    overtimeCount = 3,
  } = options;
  const marks = state === "empty" ? {} : { [`7:${column}` as const]: state };
  const grid = gridWith({
    format,
    overtimeCount,
    marks,
    callUp: [{ id: 7, playerId: 1, name, number }],
  });
  const [row] = viewOf(grid).rows;
  if (row === undefined) throw new Error("no row");
  const view = row.cells.find((cell) => cell.key === `7:${column}`);
  if (view === undefined) throw new Error(`no cell in column ${column}`);
  return { view, name: row.name };
}

/** The headers of a grid with this format and this many overtimes, in column order. */
export function columnsOf(format: Format, overtimeCount: number) {
  return viewOf(gridWith({ format, overtimeCount })).columns;
}

export function columnOf(
  key: ColumnKey,
  format: Format = 6,
  overtimeCount = 3,
): ColumnView {
  const found = columnsOf(format, overtimeCount).find((c) => c.key === key);
  if (found === undefined) throw new Error(`no column ${key}`);
  return found;
}

/** What is drawn, without the accessible label: two drawings differ when their trees differ. */
export function drawing(tree: unknown): string {
  return JSON.stringify(tree, (key, value: unknown) =>
    key === "accessibilityLabel" || key === "aria-label" ? undefined : value,
  );
}
