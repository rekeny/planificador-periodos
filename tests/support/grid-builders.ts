// Building blocks of the grid and action generators (T020, T021, T080): the limits, the call-up, the
// board that keeps the 5 X per column of RF-055, and the small arbitraries shared by every generator.
import { array, constantFrom, integer, type Arbitrary } from "fast-check";
import { columnKey, type Column } from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD, type Format } from "@/domain/format";
import {
  cellKey,
  type CallUp,
  type CallUpEntryId,
  type CellKey,
  type Mark,
} from "@/domain/grid";

export const MAX_PLAYERS = 15; // above the call-up maximum of 12, to cover RF-068
export const MAX_OVERTIMES = 3;
export const MAX_COLUMNS = 8 + MAX_OVERTIMES;
export const MAX_WINDOW = 6;
export const CALL_UP_MAX = 12;

// Ids are not 1..n on purpose: nothing may mistake an entry id for a row position.
export function callUpOf(players: number): CallUp {
  return Array.from({ length: players }, (_, row) => ({
    id: row * 3 + 1,
    playerId: row + 100,
    name: `Player ${row + 1}`,
    number: String(row + 1),
  }));
}

export interface Board {
  readonly marks: Partial<Record<CellKey, Mark>>;
  // A starter beyond the fifth of its column becomes `overflow` instead (an empty cell by default).
  put(
    entryId: CallUpEntryId,
    column: Column,
    mark: Mark | undefined,
    overflow?: Mark,
  ): void;
}

export function createBoard(): Board {
  const marks: Partial<Record<CellKey, Mark>> = {};
  const starters = new Map<string, number>();
  return {
    marks,
    put(entryId, column, mark, overflow) {
      const key = columnKey(column);
      const used = starters.get(key) ?? 0;
      let final = mark;
      if (mark === "starter" && used >= MAX_STARTERS_PER_PERIOD) {
        final = overflow;
      } else if (mark === "starter") {
        starters.set(key, used + 1);
      }
      if (final !== undefined) marks[cellKey({ entryId, column })] = final;
    },
  };
}

export const formatArbitrary = constantFrom<Format>(4, 6, 8);
export const overtimesArbitrary = integer({ min: 0, max: MAX_OVERTIMES });
export const rolls = (length: number): Arbitrary<number[]> =>
  array(integer({ min: 0, max: 99 }), { minLength: length, maxLength: length });
export const cellRolls = rolls(MAX_PLAYERS * MAX_COLUMNS);

export function rollAt(
  all: readonly number[],
  row: number,
  col: number,
): number {
  return all[row * MAX_COLUMNS + col] ?? 0;
}

// Starter below `density`, sub in the top `subShare` rolls, empty in between.
export function markOf(roll: number, density: number, subShare: number) {
  if (roll < density) return "starter" as const;
  return roll >= 100 - subShare ? ("sub" as const) : undefined;
}
