// Call-up outside the range of the format (RF-005, RF-010, RF-068).
import { FORMAT_RULES, type Format } from "@/domain/format";

export interface CallUpRangeWarning {
  readonly format: Format;
  readonly min: number;
  readonly max: number;
  readonly count: number;
}

export function callUpRangeWarning(
  format: Format,
  count: number,
): CallUpRangeWarning | null {
  const { callUpMin: min, callUpMax: max } = FORMAT_RULES[format];
  if (count >= min && count <= max) return null;
  return { format, min, max, count };
}
