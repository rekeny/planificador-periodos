// Helpers of the squad store tests (T032). This file holds no test calls. The store comes from
// src/state/squad-store.ts, which the Implementer writes in this task. Expected API of the store:
//   createSquadStore(db): a Zustand store (read it with `getState()`), whose state has
//     teams, players, duplicateNumbers, team (the open team or null) and
//     status ("closed" | "open" | "notFound"), and the synchronous actions loadTeams(),
//     openTeam(id), createTeam(input), updateTeam(id, input) and addPlayer(input).
// Writes and reads fail through real SQLite triggers and renamed tables, so no repository is mocked.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { listTeams } from "@/data/team-repository";
import type { Format } from "@/domain/format";
import { createSquadStore } from "@/state/squad-store";
import { createTestDatabase } from "./test-database";

export type SquadStore = ReturnType<typeof createSquadStore>;

export interface TeamInput {
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: Format;
}

export const ALEVIN: TeamInput = {
  name: "Alevín A",
  category: "2015",
  defaultFormat: 6,
};

export const CADETE: TeamInput = {
  name: "Cadete B",
  category: null,
  defaultFormat: 8,
};

export function newSquad(): { db: AppDatabase; store: SquadStore } {
  const db = createTestDatabase();
  return { db, store: createSquadStore(db) };
}

/** Every write of that kind on that table fails, as a full device would make it fail (RF-085). */
export function failWrites(
  db: AppDatabase,
  table: "teams" | "players",
  operation: "INSERT" | "UPDATE",
): void {
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_${operation}_${table} BEFORE ${operation} ON ${table} ` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

export function allowWrites(
  db: AppDatabase,
  table: "teams" | "players",
  operation: "INSERT" | "UPDATE",
): void {
  db.run(sql.raw(`DROP TRIGGER fail_${operation}_${table}`));
}

/** Every read of the table throws from now on ("no such table"). */
export function breakReads(db: AppDatabase, table: "teams" | "players"): void {
  db.run(sql.raw(`ALTER TABLE ${table} RENAME TO broken_${table}`));
}

export function idOf(db: AppDatabase, teamName: string): number {
  const team = listTeams(db).find((candidate) => candidate.name === teamName);
  if (team === undefined) {
    throw new Error(`The test database has no team named ${teamName}`);
  }
  return team.id;
}

export function teamNames(store: SquadStore): string[] {
  return store.getState().teams.map((team) => team.name);
}

export function playerLabels(store: SquadStore): string[] {
  return store.getState().players.map((p) => `${p.name} ${p.number}`);
}

/** Adds the players one by one to the open team, as the coach would. */
export function addPlayers(
  store: SquadStore,
  players: readonly (readonly [string, string])[],
): void {
  for (const [name, number] of players) {
    store.getState().addPlayer({ name, number });
  }
}
