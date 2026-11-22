// Steps of the match screen tests with the long-press menu (T065). This file holds no test calls. It
// adds to match-screen-grid.ts and match-screen-questions.ts without changing them. Assumed screen:
// the same ONE question dialog of T064 (a `Modal`), whose content for `pending.kind === "cellMenu"`
// is the cell's accessible label as its title (`grid.cell.starter|sub`, no new text, D3-5), the
// three buttons «Titular», «Entró de cambio» and «Quitar» in that order, and «Cancelar» after them.
// A long press reaches the cell through the gesture seam of tests/support/cell-long-press.ts.
import type { ColumnKey } from "@/domain/column";
import type { CellState } from "@/domain/grid";
import type { SeedMark } from "./match-session-marks";
import { fillColumn } from "./match-session-marks";
import { FULL_P2 } from "./match-session-questions";
import { cellState, openPlan } from "./match-screen-grid";
import { longPress } from "./cell-long-press";

export const STARTER_OPTION = "Titular";
export const SUB_OPTION = "Entró de cambio";
export const REMOVE_OPTION = "Quitar";

/** P2 with 4 X (rows 1 to 4) and Jugador 1's circled X: «Titular» is a plain change (RF-052). */
export const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
/** P2 with 4 X, Jugador 1's among them, and no sub. */
export const X_IN_4X: readonly SeedMark[] = fillColumn("P2", [0, 1, 2, 3]);
/** P2 with 5 X (rows 1 to 5) and Jugador 1's circled X: «Titular» must ask which X it replaces. */
export const CIRCLED_IN_5X: readonly SeedMark[] = [
  ...FULL_P2,
  [0, "P2", "sub"],
];

/** The accessible label a cell has in each state, which is also the title of its menu. */
export function labelOf(
  player: string,
  column: string,
  state: Exclude<CellState, "empty">,
): string {
  return state === "starter"
    ? `${player}, ${column}: X, titular`
    : `${player}, ${column}: X con círculo, entró de cambio`;
}

/** A match of 9 players with the seeds, opened, and a long press on the cell of a row and column. */
export async function openMenu(
  seeds: readonly SeedMark[],
  row = 0,
  key: ColumnKey = "P2",
  options: { overtimeCount?: number } = {},
) {
  const s = await openPlan(9, seeds, options);
  await longPress(s.entryIds[row] ?? 0, key);
  return s;
}

/** How many of Jugador 1 to Jugador 9 have an X (not a circled one) in the column. */
export function startersIn(column: string): number {
  return Array.from({ length: 9 }, (_, i) => `Jugador ${i + 1}`).filter(
    (player) => cellState(player, column) === "starter",
  ).length;
}
