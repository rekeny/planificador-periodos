import { eq } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { PlayerRecord } from "./records";
import { players } from "./schema";

/** What a new player stores; the number is text so "0" and "00" stay different (RF-016). */
export interface NewPlayerValues {
  readonly teamId: number;
  readonly name: string;
  readonly number: string;
}

/** Saves a player as given (a repeated number or name is allowed, RF-017); starts active. */
export function createPlayer(
  db: AppDatabase,
  values: NewPlayerValues,
): PlayerRecord {
  return db.insert(players).values(values).returning().get();
}

/** The players of one team in database order; sorting is the state layer's (review P-01). */
export function listPlayers(db: AppDatabase, teamId: number): PlayerRecord[] {
  return db
    .select()
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(players.id)
    .all();
}
