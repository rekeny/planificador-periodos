// Incomplete and inconsistent periods (RF-065, RF-066).
import { isRuleWindowColumn, type Column } from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import { hasSub, starterCount, type MatchGrid } from "@/domain/grid";

export type PeriodWarning = "incomplete" | "inconsistent";

// A column with enough X never warns. Below that, a circled X makes it
// inconsistent (any column); otherwise only rule-window columns are incomplete.
export function periodWarning(
  grid: MatchGrid,
  column: Column,
): PeriodWarning | null {
  if (starterCount(grid, column) >= MAX_STARTERS_PER_PERIOD) return null;
  if (hasSub(grid, column)) return "inconsistent";
  return isRuleWindowColumn(grid.format, column) ? "incomplete" : null;
}
