import { columnKey } from "@/domain/column";
import { cellKey, type CellKey, type MatchGrid } from "@/domain/grid";

// RF-058: one more empty overtime column after the last one.
export function addOvertime(grid: MatchGrid): MatchGrid {
  return { ...grid, overtimeCount: grid.overtimeCount + 1 };
}

// RF-059: only the last overtime counts; periods and earlier overtimes do not.
function lastOvertimeKeys(grid: MatchGrid): readonly CellKey[] {
  if (grid.overtimeCount === 0) return [];
  const column = { kind: "overtime", number: grid.overtimeCount } as const;
  return grid.callUp.map((row) => cellKey({ entryId: row.id, column }));
}

export function lastOvertimeHasMarks(grid: MatchGrid): boolean {
  return lastOvertimeKeys(grid).some((key) => grid.marks[key] !== undefined);
}

// RF-059: removes the last overtime and its marks; no overtimes, same grid.
export function removeLastOvertime(grid: MatchGrid): MatchGrid {
  if (grid.overtimeCount === 0) return grid;
  const suffix = `:${columnKey({ kind: "overtime", number: grid.overtimeCount })}`;
  const marks = Object.fromEntries(
    Object.entries(grid.marks).filter(([key]) => !key.endsWith(suffix)),
  );
  return { ...grid, overtimeCount: grid.overtimeCount - 1, marks };
}
