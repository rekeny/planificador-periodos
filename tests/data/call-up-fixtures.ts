// Helpers of the call-up repository tests (T039). This file holds no test calls.
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch } from "@/data/match-repository";
import type { PlayerRecord } from "@/data/records";
import { matchValues, openWithSquad } from "./match-fixtures";

/** A team with `count` players (numbered 1..) and one empty match: nobody is called up yet. */
export function openWithEmptyMatch(count: number): {
  db: AppDatabase;
  teamId: number;
  matchId: number;
  players: PlayerRecord[];
} {
  const { db, teamId, players } = openWithSquad(count);
  const match = createMatch(db, matchValues(teamId), []);
  return { db, teamId, matchId: match.id, players };
}

/** The call-up of a match as `[playerId, name, number]` lines, in database order. */
export function entryLines(
  db: AppDatabase,
  matchId: number,
): [number, string, string][] {
  const entries = loadGridRecords(db, matchId)?.entries ?? [];
  return entries.map((e) => [e.playerId, e.playerName, e.playerNumber]);
}
