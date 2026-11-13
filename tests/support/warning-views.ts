// The grids of the spec examples and the pieces of their views, for the component tests of the
// warnings (T059). This file holds no test calls. Views come from the real buildMatchView through
// viewOf (match-view-grid.ts), so the components draw exactly what the state publishes. Juan is the
// call-up entry 100 («Jugador 1») and Pedro of E-004 is entry 100 too.
import type { ColumnKey } from "@/domain/column";
import type { MatchGrid } from "@/domain/grid";
import { gridWith, viewOf } from "./match-view-grid";
import {
  calmGrid,
  fillPeriods,
  JUAN,
  marksIn,
  pedroGrid,
  poolOf,
} from "./match-view-warnings";

export { calmGrid, JUAN, pedroGrid };

export const E001 = gridWith({
  players: 10,
  marks: marksIn(JUAN, ["P1", "P2", "P3"]),
});

/** E-002: the same as E-001 but P3 is a sub (the screen cannot mark it in D2, so it is a fixture). */
export const E002 = gridWith({
  players: 10,
  marks: { ...marksIn(JUAN, ["P1", "P2"]), ...marksIn(JUAN, ["P3"], "sub") },
});

export const E003 = gridWith({
  players: 10,
  marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
});

/** E-007: 10 players, no subs, 2 X each in P1-P4, P5 and P6 empty. */
export const E007 = gridWith({
  players: 10,
  marks: fillPeriods([5, 5, 5, 5], poolOf(10)),
});

/** E-008 with one overtime, so the free periods and an overtime are all there. */
export const E008 = gridWith({
  players: 10,
  format: 8,
  overtimeCount: 1,
  marks: marksIn(JUAN, ["P1", "P2", "P3", "P4"]),
});

export function cellViewOf(grid: MatchGrid, entryId: number, key: ColumnKey) {
  const row = viewOf(grid).rows.find((r) => r.entryId === entryId);
  const cell = row?.cells.find((c) => c.key === `${entryId}:${key}`);
  if (row === undefined || cell === undefined) {
    throw new Error(`no cell ${entryId}:${key}`);
  }
  return { cell, playerName: row.name };
}

export function columnViewOf(grid: MatchGrid, key: ColumnKey) {
  const column = viewOf(grid).columns.find((c) => c.key === key);
  if (column === undefined) throw new Error(`no column ${key}`);
  return column;
}

export function rowViewOf(grid: MatchGrid, entryId: number) {
  const row = viewOf(grid).rows.find((r) => r.entryId === entryId);
  if (row === undefined) throw new Error(`no row ${entryId}`);
  return row;
}
