// Periods and overtimes as grid columns, and the rule window (RF-002, RF-006, RF-042).
import { FORMAT_RULES, type Format } from "@/domain/format";

export interface Period {
  readonly kind: "period";
  readonly number: number; // from 1
}

export interface Overtime {
  readonly kind: "overtime";
  readonly number: number; // from 1
}

export type Column = Period | Overtime;
export type ColumnKey = `P${number}` | `OT${number}`;

export function columnKey(column: Column): ColumnKey {
  return column.kind === "period" ? `P${column.number}` : `OT${column.number}`;
}

function periods(count: number): Period[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: "period" as const,
    number: index + 1,
  }));
}

// Periods first, then overtimes.
export function gridColumns(
  format: Format,
  overtimeCount: number,
): readonly Column[] {
  const overtimes: Overtime[] = Array.from(
    { length: overtimeCount },
    (_, index) => ({ kind: "overtime", number: index + 1 }),
  );
  return [...periods(FORMAT_RULES[format].periodCount), ...overtimes];
}

export function ruleWindowColumns(format: Format): readonly Period[] {
  return periods(FORMAT_RULES[format].ruleWindow.periodCount);
}

// False means a free period (RF-006): after the window, or any overtime.
export function isRuleWindowColumn(format: Format, column: Column): boolean {
  return (
    column.kind === "period" &&
    column.number >= 1 &&
    column.number <= FORMAT_RULES[format].ruleWindow.periodCount
  );
}
