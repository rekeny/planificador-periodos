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

/** What editing a player changes; the state layer passes it already validated (RF-018). */
export interface PlayerEditValues {
  readonly name: string;
  readonly number: string;
}

/**
 * Replaces the name and number of one player and nothing else. Call-up snapshots keep what they
 * stored (RF-019). An unknown ID changes nothing and returns `undefined`.
 */
export function updatePlayer(
  db: AppDatabase,
  playerId: number,
  values: PlayerEditValues,
): PlayerRecord | undefined {
  return db
    .update(players)
    .set({ name: values.name, number: values.number })
    .where(eq(players.id, playerId))
    .returning()
    .get();
}

/** Deactivates or reactivates a player; the row stays, so old matches keep it (RF-021, RF-022). */
export function setPlayerActive(
  db: AppDatabase,
  playerId: number,
  isActive: boolean,
): PlayerRecord | undefined {
  return db
    .update(players)
    .set({ isActive })
    .where(eq(players.id, playerId))
    .returning()
    .get();
}
