// Helpers of the grid repository write tests (T049). This file holds no test calls. Writes fail
// through real SQLite triggers, so no repository is mocked (RF-085).
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import type { GridRecords } from "@/data/grid-repository";
import type { MarkRecord } from "@/data/records";
import type { CellState } from "@/domain/grid";
import type { CellChange } from "@/domain/undo";
import { addEntry, addMark, addMatch } from "./schema-fixtures";
import { openWithSquad } from "./match-fixtures";

/** A change of one cell, from its entry and a column key such as "P4" or "OT2". */
export function change(
  entryId: number,
  key: `P${number}` | `OT${number}`,
  state: CellState,
): CellChange {
  const number = Number(key.replace(/^(P|OT)/, ""));
  const kind = key.startsWith("OT") ? "overtime" : "period";
  return { cell: { entryId, column: { kind, number } }, state };
}

/** A mark row as `loadGridRecords` returns it. */
export function row(
  callUpEntryId: number,
  key: `P${number}` | `OT${number}`,
  mark: "starter" | "sub",
): MarkRecord {
  return {
    callUpEntryId,
    columnKind: key.startsWith("OT") ? "overtime" : "period",
    columnNumber: Number(key.replace(/^(P|OT)/, "")),
    mark,
  };
}

/** A team of `count` players and one match of the given format and overtimes, all of them called up. */
export function openWithMatch(
  count: number,
  match: { format?: number; overtimeCount?: number } = {},
): {
  db: AppDatabase;
  teamId: number;
  matchId: number;
  entryIds: number[];
  playerIds: number[];
} {
  const { db, teamId, players } = openWithSquad(count);
  const matchId = addMatch(db, teamId, match);
  const entryIds = players.map((p) =>
    addEntry(db, matchId, p.id, {
      playerName: p.name,
      playerNumber: p.number,
    }),
  );
  return { db, teamId, matchId, entryIds, playerIds: players.map((p) => p.id) };
}

/** Another match of the same team with one called-up player, to prove it stays untouched. */
export function addSecondMatch(
  db: AppDatabase,
  teamId: number,
  playerId: number,
  overtimeCount = 0,
): { matchId: number; entryId: number } {
  const matchId = addMatch(db, teamId, { overtimeCount });
  const entryId = addEntry(db, matchId, playerId);
  return { matchId, entryId };
}

/** Marks the test writes directly, to start from a known state. */
export function seedMarks(db: AppDatabase, rows: readonly MarkRecord[]): void {
  for (const r of rows) {
    addMark(db, r.callUpEntryId, {
      columnKind: r.columnKind,
      columnNumber: r.columnNumber,
      mark: r.mark,
    });
  }
}

const byCell = (a: MarkRecord, b: MarkRecord): number =>
  a.callUpEntryId - b.callUpEntryId ||
  a.columnKind.localeCompare(b.columnKind) ||
  a.columnNumber - b.columnNumber;

/** The marks of a load in a stable order, so tests do not depend on database order. */
export function sortedMarks(records: GridRecords | undefined): MarkRecord[] {
  return [...(records?.marks ?? [])].sort(byCell);
}

export function sorted(rows: readonly MarkRecord[]): MarkRecord[] {
  return [...rows].sort(byCell);
}

/** Every insert into marks of the given column number fails, as a full device would (RF-085). */
export function failMarkInserts(db: AppDatabase, columnNumber: number): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_insert_marks BEFORE INSERT ON marks WHEN NEW.column_number = ${columnNumber} ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

/** Every delete of marks fails. */
export function failMarkDeletes(db: AppDatabase): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_delete_marks BEFORE DELETE ON marks ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

/** Every update of matches fails (the overtime count cannot be written). */
export function failMatchUpdates(db: AppDatabase): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_update_matches BEFORE UPDATE ON matches ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}
