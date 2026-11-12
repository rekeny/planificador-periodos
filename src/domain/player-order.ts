// Order of the players in the call-up (RF-016, E-020).
import type { Player } from "@/domain/squad";

const spanish = new Intl.Collator("es");

// A number that is not numeric (never valid, but never a reason to throw) goes last.
function numericValue(number: string): number {
  const value = Number(number);
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
}

// Numeric value, then "0" before "00" (shorter first), then name in Spanish order.
// Equal players compare as 0, so Array.prototype.sort keeps their order (stable).
export function comparePlayers(
  a: Pick<Player, "name" | "number">,
  b: Pick<Player, "name" | "number">,
): number {
  const valueA = numericValue(a.number);
  const valueB = numericValue(b.number);
  if (valueA !== valueB) {
    return valueA < valueB ? -1 : 1;
  }
  if (a.number.length !== b.number.length) {
    return a.number.length - b.number.length;
  }
  return spanish.compare(a.name, b.name);
}
