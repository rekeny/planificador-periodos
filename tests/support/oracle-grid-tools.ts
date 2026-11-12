// Small grid editors of the feasibility oracle (T022, T080): the cyclic window of the plan and the helpers
// that put or take away marks in the window periods. They only touch the marks of the grid.
import type { Format } from "@/domain/format";
import {
  cellKey,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { callUpOf } from "./grid-arbitraries";
import { RULES } from "./grid-reference";

export const X_PER_PERIOD = 5; // RF-055

export type Spot = readonly [period: number, row: number]; // period index from 0, row of the call-up

export function keyAt(
  grid: MatchGrid,
  [period, row]: Spot,
): CellKey | undefined {
  const entry = grid.callUp[row];
  if (!entry) return undefined;
  return cellKey({
    entryId: entry.id,
    column: { kind: "period", number: period + 1 },
  });
}

export function withMarks(
  grid: MatchGrid,
  spots: readonly Spot[],
  mark: Mark | undefined,
): MatchGrid {
  const marks = { ...grid.marks };
  for (const spot of spots) {
    const key = keyAt(grid, spot);
    if (key === undefined) continue;
    if (mark === undefined) delete marks[key];
    else marks[key] = mark;
  }
  return { ...grid, marks };
}

export function emptyGrid(format: Format, players: number): MatchGrid {
  return { format, overtimeCount: 0, callUp: callUpOf(players), marks: {} };
}

export function rowsOfPeriod(
  players: number,
  start: number,
  period: number,
): number[] {
  return Array.from(
    { length: X_PER_PERIOD },
    (_, slot) => (start + period * X_PER_PERIOD + slot) % players,
  );
}

// The cyclic window of the plan: 5 X per window period, handed out in turn from `start`. It is complete, and
// every player meets both minimums for 8 to 12 players (4 and 8 periods: up to 13; 6 periods: 9 to 12).
export function cyclicWindowGrid(
  format: Format,
  players: number,
  start = 0,
): MatchGrid {
  const spots: Spot[] = [];
  for (let period = 0; period < RULES[format].window; period += 1) {
    for (const row of rowsOfPeriod(players, start, period)) {
      spots.push([period, row]);
    }
  }
  return withMarks(emptyGrid(format, players), spots, "starter");
}

export const withoutX = (grid: MatchGrid, spots: readonly Spot[]): MatchGrid =>
  withMarks(grid, spots, undefined);

export const withCircled = (
  grid: MatchGrid,
  spots: readonly Spot[],
): MatchGrid => withMarks(grid, spots, "sub");
