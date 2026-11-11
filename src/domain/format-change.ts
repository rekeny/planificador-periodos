// Changing the match format keeps the marks of the columns that still exist (RF-038, RF-040).
import { columnKey, gridColumns } from "@/domain/column";
import type { Format } from "@/domain/format";
import type { CellKey, MatchGrid } from "@/domain/grid";

const columnKeyOf = (key: CellKey): string => key.slice(key.indexOf(":") + 1);

// Drops only the marks whose column is gone; overtimes and the call-up stay.
export function changeFormat(grid: MatchGrid, format: Format): MatchGrid {
  const columns = new Set<string>(
    gridColumns(format, grid.overtimeCount).map(columnKey),
  );
  const marks: Partial<Record<CellKey, MatchGrid["marks"][CellKey]>> = {};
  for (const [key, mark] of Object.entries(grid.marks) as [
    CellKey,
    NonNullable<MatchGrid["marks"][CellKey]>,
  ][]) {
    if (columns.has(columnKeyOf(key))) marks[key] = mark;
  }
  return { ...grid, format, marks };
}
