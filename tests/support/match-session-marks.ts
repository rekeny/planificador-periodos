// Helpers of the mark tests of the match session (T051). This file holds no test calls. It adds to
// match-session-fixtures.ts and match-session-call-up.ts without changing them. Expected API of the
// session store, on top of the T041 and T042 ones (all synchronous, all returning a SaveResult of
// src/state/save-result.ts): tapCell(cell: Cell), addOvertime() and removeLastOvertime().
// Writes fail through real SQLite triggers, so no repository is mocked (RF-085).
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { gridColumns, type ColumnKey } from "@/domain/column";
import {
  starterCount,
  type Cell,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { gridFromRecords } from "@/state/match-session-grid";
import {
  sessionWith,
  squadSpecs,
  writeMark,
  type MatchSessionStore,
  type PlayerSpec,
  type SessionOptions,
} from "./match-session-fixtures";

/** The cell of an entry in a column written as "P3" or "OT1". */
export function cellAt(entryId: number, key: ColumnKey): Cell {
  const number = Number(key.replace(/^(P|OT)/, ""));
  return {
    entryId,
    column: { kind: key.startsWith("OT") ? "overtime" : "period", number },
  };
}

/** A mark written before the match is opened: the entry's position in the call-up, column, mark. */
export type SeedMark = readonly [row: number, key: ColumnKey, mark: Mark];

/** `count` players ("Jugador 1"..), the given marks already in the database, and the match open. */
export function openedSession(
  count: number,
  seeds: readonly SeedMark[] = [],
  options: SessionOptions = {},
) {
  const specs: PlayerSpec[] = squadSpecs(count);
  const session = sessionWith(specs, options);
  for (const [row, key, mark] of seeds) {
    const { column } = cellAt(0, key);
    writeMark(
      session.db,
      session.entryIds[row] ?? 0,
      column.kind === "period" ? "P" : "OT",
      column.number,
      mark,
    );
  }
  session.store.getState().openMatch(session.matchId);
  return session;
}

/** `rows` positions of the call-up, all with the same mark in one column, as seeds. */
export function fillColumn(
  key: ColumnKey,
  rows: readonly number[],
  mark: Mark = "starter",
): SeedMark[] {
  return rows.map((row) => [row, key, mark]);
}

/** The grid exactly as the database holds it, read the way `openMatch` reads it. */
export function savedGrid(db: AppDatabase, matchId: number): MatchGrid {
  const records = loadGridRecords(db, matchId);
  if (records === undefined) {
    throw new Error("The match is not in the database");
  }
  return gridFromRecords(records);
}

/** The marks of the match in the database as "entryId:column=mark", sorted. */
export function savedMarks(db: AppDatabase, matchId: number): string[] {
  return (loadGridRecords(db, matchId)?.marks ?? [])
    .map(
      (m) =>
        `${m.callUpEntryId}:${m.columnKind === "period" ? "P" : "OT"}${m.columnNumber}=${m.mark}`,
    )
    .sort();
}

export function savedOvertimes(db: AppDatabase, matchId: number): number {
  return loadGridRecords(db, matchId)?.match.overtimeCount ?? -1;
}

/** Everything a failed or empty action must leave alone: the published state and the database. */
export function snapshotOf(
  store: MatchSessionStore,
  db: AppDatabase,
  matchId: number,
) {
  const { grid, warnings, view, history } = store.getState();
  return {
    grid,
    warnings,
    view,
    history,
    marks: savedMarks(db, matchId),
    overtimes: savedOvertimes(db, matchId),
  };
}

/** The most X any column of the grid has (RF-055: never above 5). */
export function mostStarters(grid: MatchGrid): number {
  return Math.max(
    0,
    ...gridColumns(grid.format, grid.overtimeCount).map((column) =>
      starterCount(grid, column),
    ),
  );
}

type Operation = "INSERT" | "DELETE";

/** Every write of that kind into marks fails from now on, as a full device would (RF-085). */
export function failMarkWrites(db: AppDatabase, operation: Operation): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_${operation}_marks BEFORE ${operation} ON marks ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

/** Undoes `failMarkWrites`: the device has space again. */
export function allowMarkWrites(db: AppDatabase, operation: Operation): void {
  db.run(sql.raw(`DROP TRIGGER fail_${operation}_marks`));
}

/** The overtime count cannot be written from now on (add and remove both update it). */
export function failOvertimeWrites(db: AppDatabase): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_update_overtimes BEFORE UPDATE ON matches ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

export function allowOvertimeWrites(db: AppDatabase): void {
  db.run(sql.raw(`DROP TRIGGER fail_update_overtimes`));
}

/** Back to the match as created: no marks, no overtimes. Lets a property reuse one database. */
export function resetMatch(db: AppDatabase, matchId: number): void {
  db.run(sql`DELETE FROM marks`);
  db.run(sql`UPDATE matches SET overtime_count = 0 WHERE id = ${matchId}`);
}
