import { and, eq, gt, inArray } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { MatchRecord } from "./records";
import { callUpEntries, marks, matches } from "./schema";

export { listAllMatches, listTeamMatches } from "./match-list-repository";

/** What a new match stores; the overtime count always starts at 0. */
export interface NewMatchValues {
  readonly teamId: number;
  readonly format: number;
  readonly date: string;
  readonly time: string | null;
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly notes: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

/** The player's name and number as the match must remember them (RF-019). */
export interface NewCallUpEntryValues {
  readonly playerId: number;
  readonly name: string;
  readonly number: string;
}

/**
 * Saves a match and its call-up snapshot in one transaction: if any entry fails (for example the
 * same player twice, the unique index), nothing is left. Values are stored as given.
 */
export function createMatch(
  db: AppDatabase,
  values: NewMatchValues,
  entries: readonly NewCallUpEntryValues[],
): MatchRecord {
  return db.transaction((tx) => {
    const match = tx.insert(matches).values(values).returning().get();
    for (const entry of entries) {
      tx.insert(callUpEntries)
        .values({
          matchId: match.id,
          playerId: entry.playerId,
          playerName: entry.name,
          playerNumber: entry.number,
        })
        .run();
    }
    return match;
  });
}

export function getMatch(db: AppDatabase, id: number): MatchRecord | undefined {
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

/** What the details of a saved match hold; never the format, the overtime count or the team. */
export interface MatchDetailsValues {
  readonly date: string;
  readonly time: string | null;
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly notes: string | null;
}

/**
 * Writes the details of a match and returns the saved record, or `undefined` for an unknown id
 * (nothing is written). Each field is picked by name, so extra properties never reach the row.
 */
export function updateMatchDetails(
  db: AppDatabase,
  matchId: number,
  values: MatchDetailsValues,
): MatchRecord | undefined {
  return db
    .update(matches)
    .set({
      date: values.date,
      time: values.time,
      homeName: values.homeName,
      awayName: values.awayName,
      homeScore: values.homeScore,
      awayScore: values.awayScore,
      notes: values.notes,
    })
    .where(eq(matches.id, matchId))
    .returning()
    .get();
}

/** Deletes the match; the cascades remove its call-up entries and their marks. */
export function deleteMatch(db: AppDatabase, matchId: number): void {
  db.delete(matches).where(eq(matches.id, matchId)).run();
}

/**
 * Changes the format and deletes the period marks above the new count, keeping the overtime
 * marks, in one transaction. The database CHECK refuses a format that is not 4, 6 or 8.
 */
export function changeMatchFormat(
  db: AppDatabase,
  matchId: number,
  format: number,
): void {
  db.transaction((tx) => {
    tx.update(matches).set({ format }).where(eq(matches.id, matchId)).run();
    tx.delete(marks)
      .where(
        and(
          eq(marks.columnKind, "period"),
          gt(marks.columnNumber, format),
          inArray(
            marks.callUpEntryId,
            tx
              .select({ id: callUpEntries.id })
              .from(callUpEntries)
              .where(eq(callUpEntries.matchId, matchId)),
          ),
        ),
      )
      .run();
  });
}
