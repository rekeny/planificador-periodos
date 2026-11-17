import { eq } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { MatchRecord } from "./records";
import { callUpEntries, matches } from "./schema";

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
