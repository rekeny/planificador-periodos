import { eq } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { NewCallUpEntryValues } from "./match-repository";
import type { NewPlayerValues } from "./player-repository";
import { createPlayer } from "./player-repository";
import type { CallUpEntryRecord, PlayerRecord } from "./records";
import { callUpEntries } from "./schema";

/**
 * Adds a player to a match's call-up with the name and number as given (RF-019). It never looks at
 * the format or the size of the call-up (RF-010); the unique index may throw if she is already in.
 */
export function addToCallUp(
  db: AppDatabase,
  matchId: number,
  entry: NewCallUpEntryValues,
): CallUpEntryRecord {
  return db
    .insert(callUpEntries)
    .values({
      matchId,
      playerId: entry.playerId,
      playerName: entry.name,
      playerNumber: entry.number,
    })
    .returning()
    .get();
}

/** Removes an entry; its marks go with it through the cascade. A missing entry changes nothing. */
export function removeFromCallUp(db: AppDatabase, entryId: number): void {
  db.delete(callUpEntries).where(eq(callUpEntries.id, entryId)).run();
}

/**
 * Creates a player in the team and in the match's call-up in one transaction: if either write
 * fails (unknown team or match), nothing is left.
 */
export function createPlayerInMatch(
  db: AppDatabase,
  matchId: number,
  values: NewPlayerValues,
): { player: PlayerRecord; entry: CallUpEntryRecord } {
  return db.transaction((tx) => {
    const player = createPlayer(tx, values);
    const entry = addToCallUp(tx, matchId, {
      playerId: player.id,
      name: player.name,
      number: player.number,
    });
    return { player, entry };
  });
}
