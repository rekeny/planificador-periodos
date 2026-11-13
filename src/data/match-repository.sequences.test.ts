// T038: sequences and failures of the match repository (RF-019, RF-025, RF-036, RF-037, RF-084).
import { eq } from "drizzle-orm";
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch, getMatch } from "@/data/match-repository";
import { listPlayers } from "@/data/player-repository";
import { players as playersTable } from "@/data/schema";
import { getTeam, updateTeam } from "@/data/team-repository";
import {
  FOREIGN_KEY_FAILED,
  CHECK_FAILED,
  UNIQUE_FAILED,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  entryOf,
  matchValues,
  openWithSquad,
} from "../../tests/data/match-fixtures";

describe("match repository, the team default and the player data", () => {
  it("RF-036 RF-037: changing the team default 6 to 8 leaves the existing match at 6 and a new one can be 8", () => {
    const { db, teamId } = openWithSquad(0);
    const before = createMatch(db, matchValues(teamId, { format: 6 }), []);
    updateTeam(db, teamId, {
      name: "Alevín A",
      category: null,
      defaultFormat: 8,
    });
    const after = createMatch(db, matchValues(teamId, { format: 8 }), []);
    expect(getMatch(db, before.id)?.format).toBe(6);
    expect(getMatch(db, after.id)?.format).toBe(8);
  });

  it("RF-036 RF-084: a match created with format 8 in a 6-period team keeps the team default at 6", () => {
    const { db, teamId } = openWithSquad(0);
    createMatch(db, matchValues(teamId, { format: 8 }), []);
    expect(getTeam(db, teamId)?.defaultFormat).toBe(6);
  });

  it("RF-019: renaming a player and changing the number afterwards leaves the old match entry as it was; a later match holds the new data", () => {
    const { db, teamId, players } = openWithSquad(3);
    const old = createMatch(db, matchValues(teamId), players.map(entryOf));
    const first = players[0]?.id ?? 0;
    db.update(playersTable)
      .set({ name: "Ana María", number: "99" })
      .where(eq(playersTable.id, first))
      .run();
    const current = listPlayers(db, teamId).filter((p) => p.id === first);
    const later = createMatch(db, matchValues(teamId), current.map(entryOf));
    const oldEntry = loadGridRecords(db, old.id)?.entries[0];
    const newEntry = loadGridRecords(db, later.id)?.entries[0];
    expect([oldEntry?.playerName, oldEntry?.playerNumber]).toEqual([
      "Jugador 1",
      "1",
    ]);
    expect([newEntry?.playerName, newEntry?.playerNumber]).toEqual([
      "Ana María",
      "99",
    ]);
  });

  it("RF-019: the same player in two matches is fine, each match with its own entry", () => {
    const { db, teamId, players } = openWithSquad(1);
    const entries = players.map(entryOf);
    const one = createMatch(db, matchValues(teamId), entries);
    const two = createMatch(db, matchValues(teamId), entries);
    const ids = [one, two].map(
      (match) => loadGridRecords(db, match.id)?.entries[0]?.id,
    );
    expect(ids[0]).not.toBe(ids[1]);
    expect(counts(db).call_up_entries).toBe(2);
  });
});

describe("match repository, failures leave nothing", () => {
  it("RF-019 RF-025: the same player twice in one call-up throws on the unique index and no match or entry is left", () => {
    const { db, teamId, players } = openWithSquad(3);
    const entries = players.map(entryOf);
    const failure = failureOf(() =>
      createMatch(db, matchValues(teamId), [
        ...entries,
        ...entries.slice(0, 1),
      ]),
    );
    expect(failure).toMatch(UNIQUE_FAILED);
    expect(counts(db)).toMatchObject({ matches: 0, call_up_entries: 0 });
  });

  it("RF-019 RF-025: an entry of a player that does not exist, after valid ones, rolls the whole match back", () => {
    const { db, teamId, players } = openWithSquad(3);
    const ghost = { playerId: 9999, name: "Ghost", number: "1" };
    const failure = failureOf(() =>
      createMatch(db, matchValues(teamId), [...players.map(entryOf), ghost]),
    );
    expect(failure).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db)).toMatchObject({ matches: 0, call_up_entries: 0 });
  });

  it("RF-025: a match for a team that does not exist throws and writes nothing", () => {
    const { db, teamId } = openWithSquad(0);
    const failure = failureOf(() =>
      createMatch(db, matchValues(teamId + 1), []),
    );
    expect(failure).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db).matches).toBe(0);
  });

  it.each([
    ["a format of 5", { format: 5 }],
    ["a score with only one side", { homeScore: 3, awayScore: null }],
  ])(
    "RF-025 RF-085: %s throws on the check constraint, leaves no match and the next valid one is saved",
    (_name, values) => {
      const { db, teamId, players } = openWithSquad(2);
      const failure = failureOf(() =>
        createMatch(db, matchValues(teamId, values), players.map(entryOf)),
      );
      expect(failure).toMatch(CHECK_FAILED);
      expect(counts(db)).toMatchObject({ matches: 0, call_up_entries: 0 });
      const saved = createMatch(db, matchValues(teamId), players.map(entryOf));
      expect(loadGridRecords(db, saved.id)?.entries).toHaveLength(2);
    },
  );
});
