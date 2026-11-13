// Helpers of the match and grid repository tests (T038). This file holds no test calls.
import type { AppDatabase } from "@/data/database-types";
import type { NewMatchValues } from "@/data/match-repository";
import type { PlayerRecord } from "@/data/records";
import { createPlayer } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import { createTestDatabase } from "../support/test-database";

/** The snapshot line of one call-up entry: the name and number the player has right now. */
export interface EntryValues {
  readonly playerId: number;
  readonly name: string;
  readonly number: string;
}

export function entryOf(player: PlayerRecord): EntryValues {
  return { playerId: player.id, name: player.name, number: player.number };
}

/** A match with only the required data (format and date); every other field is empty. */
export function matchValues(
  teamId: number,
  values: Partial<NewMatchValues> = {},
): NewMatchValues {
  return {
    teamId,
    format: 6,
    date: "2026-11-11",
    time: null,
    homeName: null,
    awayName: null,
    notes: null,
    homeScore: null,
    awayScore: null,
    ...values,
  };
}

/** A new migrated in-memory database with one 6-period team and `count` players, numbered 1.. */
export function openWithSquad(count: number): {
  db: AppDatabase;
  teamId: number;
  players: PlayerRecord[];
} {
  const db = createTestDatabase();
  const team = createTeam(db, {
    name: "Alevín A",
    category: null,
    defaultFormat: 6,
  });
  const players = Array.from({ length: count }, (_, index) =>
    createPlayer(db, {
      teamId: team.id,
      name: `Jugador ${index + 1}`,
      number: String(index + 1),
    }),
  );
  return { db, teamId: team.id, players };
}
