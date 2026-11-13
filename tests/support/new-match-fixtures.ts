// Helpers of the new-match draft tests (T040). This file holds no test calls. The draft comes from
// src/state/new-match-draft.ts, which the Implementer writes in this task. Expected API:
//   createNewMatchDraft(db, now): a Zustand store (read it with `getState()`); `now` is a clock,
//     `() => Date`, read at every reset and never at import time. The state has format, date,
//     time (string | null), homeName, awayName, homeScore, awayScore and notes (the text as typed,
//     "" when empty), callUpSelection (readonly { player: Player; selected: boolean }[], sorted,
//     active players only) and callUpRange (CallUpRangeWarning | null).
//   Actions: reset(teamId), setFormat(format), setDate({ year, month, day }),
//     setTime({ hour, minute }), clearTime(), setMyTeamAs("home" | "away"), setHomeName(text),
//     setAwayName(text), setHomeScore(text), setAwayScore(text), setNotes(text),
//     toggle(playerId), and create() (T086): returns a SaveResult; on success it is
//     { kind: "saved", matchId: number }; the other kinds carry no matchId.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { createPlayer } from "@/data/player-repository";
import { callUpEntries, matches } from "@/data/schema";
import type { TeamValues } from "@/data/team-repository";
import { createTeam } from "@/data/team-repository";
import type { Format } from "@/domain/format";
import { createNewMatchDraft } from "@/state/new-match-draft";
import { createTestDatabase } from "./test-database";

export type NewMatchDraft = ReturnType<typeof createNewMatchDraft>;

/** A clock the test moves by hand; noon local time, so the day is the same in any time zone. */
export interface FixedClock {
  now: Date;
  readonly read: () => Date;
}

export function clockAt(year: number, month: number, day: number): FixedClock {
  const clock: FixedClock = {
    now: new Date(year, month - 1, day, 12, 0),
    read: () => clock.now,
  };
  return clock;
}

export function newDraft(clock: FixedClock = clockAt(2026, 11, 11)): {
  db: AppDatabase;
  store: NewMatchDraft;
  clock: FixedClock;
} {
  const db = createTestDatabase();
  return { db, store: createNewMatchDraft(db, clock.read), clock };
}

export const TEAM_ALEVIN: TeamValues = {
  name: "Alevín A",
  category: "2015",
  defaultFormat: 6,
};

export function teamOf(db: AppDatabase, values: Partial<TeamValues> = {}) {
  return createTeam(db, { ...TEAM_ALEVIN, ...values });
}

/** Adds players numbered 1 to `count` (names "Jugador 1"…) and returns their ids in that order. */
export function addSquad(
  db: AppDatabase,
  teamId: number,
  count: number,
): number[] {
  return Array.from(
    { length: count },
    (_, index) =>
      createPlayer(db, {
        teamId,
        name: `Jugador ${index + 1}`,
        number: String(index + 1),
      }).id,
  );
}

/** Deactivation arrives in D3, so the test writes it directly in the database. */
export function deactivate(db: AppDatabase, playerId: number): void {
  db.run(sql`UPDATE players SET is_active = 0 WHERE id = ${playerId}`);
}

/** A team of the default format with `count` active players, opened in a fresh draft. */
export function openedDraft(count: number, defaultFormat: Format = 6) {
  const draft = newDraft();
  const team = teamOf(draft.db, { defaultFormat });
  const ids = addSquad(draft.db, team.id, count);
  draft.store.getState().reset(team.id);
  return { ...draft, team, ids };
}

export function listedNumbers(store: NewMatchDraft): string[] {
  return store.getState().callUpSelection.map((row) => row.player.number);
}

export function selectedNumbers(store: NewMatchDraft): string[] {
  return store
    .getState()
    .callUpSelection.filter((row) => row.selected)
    .map((row) => row.player.number);
}

export function selectedCount(store: NewMatchDraft): number {
  return selectedNumbers(store).length;
}

/** Every match saved in the database, in creation order (T086). */
export function savedMatches(db: AppDatabase) {
  return db.select().from(matches).all();
}

/** The call-up entries of a match as "number name" text, sorted by number as a text (T086). */
export function savedEntryLabels(db: AppDatabase, matchId: number): string[] {
  return db
    .select()
    .from(callUpEntries)
    .all()
    .filter((entry) => entry.matchId === matchId)
    .map((entry) => `${entry.playerNumber} ${entry.playerName}`)
    .sort();
}

export function savedEntryCount(db: AppDatabase): number {
  return db.select().from(callUpEntries).all().length;
}

type MatchTable = "matches" | "call_up_entries";

/**
 * Every insert on the table fails, as a full device would make it (RF-085). With `onNumber`, only
 * the entry of the player with that number fails, so a match is half written before the failure.
 */
export function failInserts(
  db: AppDatabase,
  table: MatchTable,
  onNumber?: string,
): void {
  const when =
    onNumber === undefined ? "" : `WHEN NEW.player_number = '${onNumber}' `;
  db.run(
    sql.raw(
      `CREATE TRIGGER fail_insert_${table} BEFORE INSERT ON ${table} ${when}` +
        `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
    ),
  );
}

export function allowInserts(db: AppDatabase, table: MatchTable): void {
  db.run(sql.raw(`DROP TRIGGER fail_insert_${table}`));
}

/** The table cannot be found from now on, so any write to it throws. */
export function breakMatchTable(db: AppDatabase, table: MatchTable): void {
  db.run(sql.raw(`ALTER TABLE ${table} RENAME TO broken_${table}`));
}
