// Which legend items are shown (RF-087): only the kinds present, in a fixed order.
import type { Warnings } from "@/domain/warnings";

export type LegendItem =
  "lightRedCell" | "playerInRed" | "incompletePeriod" | "inconsistentPeriod";

export function legendItems(warnings: Warnings): readonly LegendItem[] {
  const kinds = Object.values(warnings.periodWarnings);
  const items: LegendItem[] = [];
  if (warnings.lightRedCells.size > 0) items.push("lightRedCell");
  if (warnings.playersInRed.size > 0) items.push("playerInRed");
  if (kinds.includes("incomplete")) items.push("incompletePeriod");
  if (kinds.includes("inconsistent")) items.push("inconsistentPeriod");
  return items;
}
