// Helpers of the call-up tests of the match session (T042). This file holds no test calls. It adds
// to match-session-fixtures.ts without changing it. Writes fail through real SQLite triggers, so no
// repository is mocked. Expected API of the session store, on top of the T041 one (all
// synchronous, all returning a SaveResult of src/state/save-result.ts):
//   addToCallUp(playerId: number), removeFromCallUp(entryId: number),
//   createPlayerInMatch(input: { name: string; number: string }), and the view field
//   `playersToAdd: readonly Player[]` (src/state/match-view.ts).
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { createPlayer, listPlayers } from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import type { UndoEntry } from "@/domain/undo";
import { sessionWith } from "./match-session-fixtures";
import type { PlayerSpec, SessionOptions } from "./match-session-fixtures";

/** A session whose call-up holds `calledUp`, plus team players who are not in the call-up. */
export function sessionWithBench(
  calledUp: readonly PlayerSpec[],
  bench: readonly PlayerSpec[],
  options: SessionOptions = {},
) {
  const session = sessionWith(calledUp, options);
  const benched = bench.map(([name, number]) =>
    createPlayer(session.db, { teamId: session.teamId, name, number }),
  );
  return { ...session, benched };
}

/** The call-up of the match as the database holds it, "number name", sorted as text. */
export function savedCallUp(db: AppDatabase, matchId: number): string[] {
  return (loadGridRecords(db, matchId)?.entries ?? [])
    .map((e) => `${e.playerNumber} ${e.playerName}`)
    .sort();
}

/** The ids of the call-up entries of the match, as the database holds them. */
export function savedEntryIds(db: AppDatabase, matchId: number): number[] {
  return (loadGridRecords(db, matchId)?.entries ?? []).map((e) => e.id);
}

/** The marks of the match in the database as "entryId:column", sorted. */
export function savedMarkKeys(db: AppDatabase, matchId: number): string[] {
  return (loadGridRecords(db, matchId)?.marks ?? [])
    .map(
      (m) =>
        `${m.callUpEntryId}:${m.columnKind === "period" ? "P" : "OT"}${m.columnNumber}`,
    )
    .sort();
}

/** The players of the team as the database holds them, "number name", sorted as text. */
export function savedTeam(db: AppDatabase, teamId: number): string[] {
  return listPlayers(db, teamId)
    .map((p: PlayerRecord) => `${p.number} ${p.name}`)
    .sort();
}

/** Marks a team player as deactivated (RF-017). */
export function deactivatePlayer(db: AppDatabase, playerId: number): void {
  db.run(sql`UPDATE players SET is_active = 0 WHERE id = ${playerId}`);
}

type Table = "call_up_entries" | "players";

/** Every write of that kind on the table fails from now on, as a full device would (RF-085). */
export function failWrites(
  db: AppDatabase,
  table: Table,
  operation: "INSERT" | "DELETE",
): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_${operation}_${table} BEFORE ${operation} ON ${table} ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

/** Undoes `failWrites`: the device has space again. */
export function allowWrites(
  db: AppDatabase,
  table: Table,
  operation: "INSERT" | "DELETE",
): void {
  db.run(sql.raw(`DROP TRIGGER fail_${operation}_${table}`));
}

/** An undo entry that would restore empty cells in the given periods of one call-up entry. */
export function undoEntryOf(
  entryId: number,
  ...periods: readonly number[]
): UndoEntry {
  return periods.map((number) => ({
    cell: { entryId, column: { kind: "period", number } },
    state: "empty",
  }));
}
