// All the warnings of a grid in one result (RF-060, RF-061, RF-072).
import {
  callUpRangeWarning,
  type CallUpRangeWarning,
} from "@/domain/call-up-range";
import { columnKey, gridColumns, type ColumnKey } from "@/domain/column";
import {
  cellKey,
  type CallUpEntryId,
  type CellKey,
  type MatchGrid,
} from "@/domain/grid";
import { periodWarning, type PeriodWarning } from "@/domain/period-warnings";
import { isRuleImpossible } from "@/domain/rule-feasibility";
import { lightRedCells, playersInRed } from "@/domain/rule-window";

export interface Warnings {
  readonly lightRedCells: ReadonlySet<CellKey>;
  readonly playersInRed: ReadonlySet<CallUpEntryId>;
  // No key for a column without warning.
  readonly periodWarnings: Readonly<Partial<Record<ColumnKey, PeriodWarning>>>;
  readonly ruleImpossible: boolean;
  readonly callUpRange: CallUpRangeWarning | null;
}

export function evaluateWarnings(grid: MatchGrid): Warnings {
  const periodWarnings: Partial<Record<ColumnKey, PeriodWarning>> = {};
  for (const column of gridColumns(grid.format, grid.overtimeCount)) {
    const warning = periodWarning(grid, column);
    if (warning !== null) periodWarnings[columnKey(column)] = warning;
  }
  return {
    lightRedCells: new Set(lightRedCells(grid).map(cellKey)),
    playersInRed: new Set(playersInRed(grid)),
    periodWarnings,
    ruleImpossible: isRuleImpossible(grid),
    callUpRange: callUpRangeWarning(grid.format, grid.callUp.length),
  };
}
