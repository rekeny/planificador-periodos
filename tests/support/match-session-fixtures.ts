// Helpers of the match session tests (T041). This file holds no test calls. The store comes from
// src/state/match-session-store.ts and the view builder from src/state/match-view.ts, which the
// Implementer writes in this task. Expected API:
//   createMatchSessionStore(db): a Zustand store (read it with `getState()`, `setState()`), whose
//     state has status ("closed" | "open" | "notFound"), grid (MatchGrid | null), warnings
//     (Warnings | null), view (MatchView | null), history (readonly UndoEntry[]) and saveFailed
//     (boolean), and the synchronous actions openMatch(id) and closeMatch().
//   buildMatchView(source): MatchView with matchId, format, rows (entryId, number, name,
//     hasMarks) and callUpRange; the source is { matchId, grid, warnings, history, teamPlayers }.
// Reads fail through a real SQLite table renamed away, so no repository is mocked.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch } from "@/data/match-repository";
import { createPlayer } from "@/data/player-repository";
import { marks } from "@/data/schema";
import { createTeam } from "@/data/team-repository";
import type { Format } from "@/domain/format";
import { createMatchSessionStore } from "@/state/match-session-store";
import { createTestDatabase } from "./test-database";
import { entryOf, matchValues } from "../data/match-fixtures";

export type MatchSessionStore = ReturnType<typeof createMatchSessionStore>;

/** `[name, number]` of a player of the team, who is also called up. */
export type PlayerSpec = readonly [name: string, number: string];

export interface SessionOptions {
  readonly format?: Format;
  readonly overtimeCount?: number;
}

/** A team, its players, one match that calls all of them up (snapshot), and a closed store. */
export function sessionWith(
  specs: readonly PlayerSpec[],
  { format = 6, overtimeCount = 0 }: SessionOptions = {},
) {
  const db = createTestDatabase();
  const team = createTeam(db, {
    name: "Alevín A",
    category: null,
    defaultFormat: 6,
  });
  const players = specs.map(([name, number]) =>
    createPlayer(db, { teamId: team.id, name, number }),
  );
  const match = createMatch(
    db,
    matchValues(team.id, { format }),
    players.map(entryOf),
  );
  if (overtimeCount > 0) {
    db.run(
      sql`UPDATE matches SET overtime_count = ${overtimeCount} WHERE id = ${match.id}`,
    );
  }
  const entryIds = (loadGridRecords(db, match.id)?.entries ?? []).map(
    (e) => e.id,
  );
  return {
    db,
    store: createMatchSessionStore(db),
    teamId: team.id,
    matchId: match.id,
    players,
    entryIds,
  };
}

/** `count` players "Jugador 1".. numbered 1.. */
export function squadSpecs(count: number): PlayerSpec[] {
  return Array.from({ length: count }, (_, i) => [
    `Jugador ${i + 1}`,
    String(i + 1),
  ]);
}

/** Writes a mark straight into the database, as T049 will do (period or overtime column). */
export function writeMark(
  db: AppDatabase,
  entryId: number,
  column: "P" | "OT",
  columnNumber: number,
  mark: "starter" | "sub",
): void {
  db.insert(marks)
    .values({
      callUpEntryId: entryId,
      columnKind: column === "P" ? "period" : "overtime",
      columnNumber,
      mark,
    })
    .run();
}

/** Every read of the table throws from now on ("no such table"). */
export function breakReads(
  db: AppDatabase,
  table: "matches" | "call_up_entries" | "marks" | "players",
): void {
  db.run(sql.raw(`ALTER TABLE ${table} RENAME TO broken_${table}`));
}

/** The rows of the published view as "number name" text, in the order they are drawn. */
export function rowLabels(store: MatchSessionStore): string[] {
  return (store.getState().view?.rows ?? []).map(
    (r) => `${r.number} ${r.name}`,
  );
}
