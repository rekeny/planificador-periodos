// Helpers of the T074 tests (edit player, deactivate, delete team). This file holds no test calls.
// Failures are real SQLite triggers, so no repository is mocked (RF-085).
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { callUpEntries, marks, matches, players, teams } from "@/data/schema";
import type { PlayerRecord, TeamRecord } from "@/data/records";
import { createPlayer } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import { createTestDatabase } from "../support/test-database";
import { row, seedMarks } from "./grid-write-fixtures";
import { addEntry, addMatch, addPlayer, addTeam } from "./schema-fixtures";

/** One team with its players, matches, call-up entries and marks, as the tests need to find them. */
export interface SeededTeam {
  readonly teamId: number;
  readonly playerIds: number[];
  readonly matchIds: number[];
  readonly entryIds: number[];
}

/**
 * A team with 3 players (the third inactive), 2 matches, one entry per player and match, and
 * marks on every entry, one of them in an overtime.
 */
export function seedTeam(db: AppDatabase, name: string): SeededTeam {
  const teamId = addTeam(db, { name });
  const playerIds = [
    addPlayer(db, teamId, { name: "Juan", number: "7" }),
    addPlayer(db, teamId, { name: "Ana", number: "8" }),
    addPlayer(db, teamId, { name: "Eva", number: "00", isActive: false }),
  ];
  const matchIds = [
    addMatch(db, teamId, { overtimeCount: 1 }),
    addMatch(db, teamId, { date: "2026-12-02" }),
  ];
  const entryIds = matchIds.flatMap((matchId) =>
    playerIds.map((playerId) => addEntry(db, matchId, playerId)),
  );
  seedMarks(
    db,
    entryIds.map((entryId, index) =>
      row(entryId, index === 0 ? "OT1" : "P1", index % 2 ? "sub" : "starter"),
    ),
  );
  return { teamId, playerIds, matchIds, entryIds };
}

/** Two seeded teams in one new migrated in-memory database. */
export function openWithTwoTeams(): {
  db: AppDatabase;
  first: SeededTeam;
  second: SeededTeam;
} {
  const db = createTestDatabase();
  return {
    db,
    first: seedTeam(db, "Alevín A"),
    second: seedTeam(db, "Cadete B"),
  };
}

/** Every row that belongs to one team, from each of the five tables, in primary-key order. */
export function rowsOfTeam(db: AppDatabase, teamId: number) {
  const matchRows = db
    .select()
    .from(matches)
    .all()
    .filter((m) => m.teamId === teamId);
  const matchIds = matchRows.map((m) => m.id);
  const entries = db
    .select()
    .from(callUpEntries)
    .all()
    .filter((e) => matchIds.includes(e.matchId));
  const entryIds = entries.map((e) => e.id);
  return {
    team: db
      .select()
      .from(teams)
      .all()
      .filter((t) => t.id === teamId),
    players: db
      .select()
      .from(players)
      .all()
      .filter((p) => p.teamId === teamId),
    matches: matchRows,
    entries,
    marks: db
      .select()
      .from(marks)
      .all()
      .filter((m) => entryIds.includes(m.callUpEntryId)),
  };
}

type Table = "teams" | "players" | "matches" | "call_up_entries" | "marks";

/** Every delete from that table fails, also the ones the cascades make, as a full device would. */
export function failDeletesOf(db: AppDatabase, table: Table): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_delete_${table} BEFORE DELETE ON ${table} ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

export function allowDeletesOf(db: AppDatabase, table: Table): void {
  db.run(sql.raw(`DROP TRIGGER fail_delete_${table}`));
}

/** Every update of players fails. */
export function failPlayerUpdates(db: AppDatabase): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_update_players BEFORE UPDATE ON players ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

/** A new database with one team and one active player, Juan 7. */
export function openWithJuan(): {
  db: AppDatabase;
  teamId: TeamRecord["id"];
  juan: PlayerRecord;
} {
  const db = createTestDatabase();
  const team = createTeam(db, {
    name: "Alevín A",
    category: null,
    defaultFormat: 6,
  });
  const juan = createPlayer(db, { teamId: team.id, name: "Juan", number: "7" });
  return { db, teamId: team.id, juan };
}
