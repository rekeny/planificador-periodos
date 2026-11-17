// Maps the domain's Warnings onto the match view (RF-060 to RF-067, RF-072, RF-087). It only
// looks results up: which cells are light red, who is in red and what the legend lists are decided
// by src/domain/, so the screen never computes a rule.
import type { ColumnKey } from "@/domain/column";
import type { CallUpEntryId, CellKey } from "@/domain/grid";
import { legendItems, type LegendItem } from "@/domain/legend";
import type { PeriodWarning } from "@/domain/period-warnings";
import type { Warnings } from "@/domain/warnings";

export interface WarningView {
  readonly ruleImpossible: boolean; // the general warning (RF-067)
  readonly legend: readonly LegendItem[]; // built from the whole grid, not the visible part (RF-087)
}

/** The «!» or «≠» of a column header, or null when it has none (RF-064, RF-065, RF-066). */
export function headerMarkOf(
  warnings: Warnings,
  key: ColumnKey,
): PeriodWarning | null {
  return warnings.periodWarnings[key] ?? null;
}

export function isLightRed(warnings: Warnings, key: CellKey): boolean {
  return warnings.lightRedCells.has(key);
}

export function isInRed(warnings: Warnings, entryId: CallUpEntryId): boolean {
  return warnings.playersInRed.has(entryId);
}

export function warningView(warnings: Warnings): WarningView {
  return {
    ruleImpossible: warnings.ruleImpossible,
    legend: legendItems(warnings),
  };
}
