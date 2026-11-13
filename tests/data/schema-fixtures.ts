// Helpers of the schema tests (T028). This file holds no test calls. The database comes from
// tests/support/test-database.ts, which the Implementer writes in this task; it is loaded at run
// time, so that until it exists the tests fail with a "Cannot find module" error instead of
// breaking `tsc`. Expected API of that helper:
//   createTestDatabase(): AppDatabase   a new in-memory database, migrated, foreign keys on
//   migrateTestDatabase(db): void       runs the migrations again on an already migrated database
import { sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "@/data/schema";
import { callUpEntries, marks, matches, players, teams } from "@/data/schema";

// The same type as `AppDatabase` of src/data/database-types.ts (that file is T028's too).
export type Db = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

type TestDatabaseModule = {
  createTestDatabase: () => Db;
  migrateTestDatabase: (db: Db) => void;
};

function helper(): TestDatabaseModule {
  return jest.requireActual<TestDatabaseModule>("../support/test-database");
}

export function openDatabase(): Db {
  return helper().createTestDatabase();
}

export function migrateAgain(db: Db): void {
  helper().migrateTestDatabase(db);
}

type Failure = { message?: unknown; cause?: unknown };

/**
 * The message of an error and of its causes: Drizzle wraps the SQLite error. Errors are read by
 * shape, not with `instanceof`, because the native driver's errors come from another realm.
 */
export function failureOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    const messages: string[] = [];
    let current: unknown = error;
    while (typeof current === "object" && current !== null) {
      const { message, cause } = current as Failure;
      messages.push(String(message));
      current = cause;
    }
    return messages.join(" | ");
  }
  return "";
}

export const CHECK_FAILED = /CHECK constraint failed/;
export const FOREIGN_KEY_FAILED = /FOREIGN KEY constraint failed/;
export const UNIQUE_FAILED = /UNIQUE constraint failed/;

export function addTeam(
  db: Db,
  values: Partial<typeof teams.$inferInsert> = {},
): number {
  return db
    .insert(teams)
    .values({ name: "Mini", defaultFormat: 6, ...values })
    .returning({ id: teams.id })
    .get().id;
}

export function addPlayer(
  db: Db,
  teamId: number,
  values: Partial<typeof players.$inferInsert> = {},
): number {
  return db
    .insert(players)
    .values({ teamId, name: "Juan", number: "7", ...values })
    .returning({ id: players.id })
    .get().id;
}

export function addMatch(
  db: Db,
  teamId: number,
  values: Partial<typeof matches.$inferInsert> = {},
): number {
  return db
    .insert(matches)
    .values({ teamId, format: 6, date: "2026-11-11", ...values })
    .returning({ id: matches.id })
    .get().id;
}

export function addEntry(
  db: Db,
  matchId: number,
  playerId: number,
  values: Partial<typeof callUpEntries.$inferInsert> = {},
): number {
  return db
    .insert(callUpEntries)
    .values({
      matchId,
      playerId,
      playerName: "Juan",
      playerNumber: "7",
      ...values,
    })
    .returning({ id: callUpEntries.id })
    .get().id;
}

export function addMark(
  db: Db,
  callUpEntryId: number,
  values: Partial<typeof marks.$inferInsert> = {},
): void {
  db.insert(marks)
    .values({
      callUpEntryId,
      columnKind: "period",
      columnNumber: 1,
      mark: "starter",
      ...values,
    })
    .run();
}

export const TABLE_NAMES = [
  "teams",
  "players",
  "matches",
  "call_up_entries",
  "marks",
] as const;

/** The row count of each of the five tables. */
export function counts(db: Db): Record<(typeof TABLE_NAMES)[number], number> {
  return {
    teams: db.select().from(teams).all().length,
    players: db.select().from(players).all().length,
    matches: db.select().from(matches).all().length,
    call_up_entries: db.select().from(callUpEntries).all().length,
    marks: db.select().from(marks).all().length,
  };
}

export function userTables(db: Db): string[] {
  return db
    .all<{
      name: string;
    }>(
      sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '%drizzle%' order by name`,
    )
    .map((row) => row.name);
}
