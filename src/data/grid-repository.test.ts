// T038: loadGridRecords on a migrated in-memory database (RF-019, RF-025, RF-058). It returns
// the match, its call-up entries and its marks as plain records, or nothing for an unknown
// match; marks here are rows written directly by the test (the writes arrive in T049).
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch } from "@/data/match-repository";
import {
  addEntry,
  addMark,
  addMatch,
  counts,
} from "../../tests/data/schema-fixtures";
import {
  entryOf,
  matchValues,
  openWithSquad,
} from "../../tests/data/match-fixtures";

describe("grid records, reading a match", () => {
  it("RF-025: a new match gives its record, its entries and no marks", () => {
    const { db, teamId, players } = openWithSquad(2);
    const match = createMatch(db, matchValues(teamId), players.map(entryOf));
    const records = loadGridRecords(db, match.id);
    expect(records?.match).toEqual(match);
    expect(records?.entries).toEqual(
      players.map((player) => ({
        id: expect.any(Number),
        matchId: match.id,
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
      })),
    );
    expect(records?.marks).toEqual([]);
  });

  it("RF-025: a match with no call-up gives no entries and no marks", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(db, matchValues(teamId), []);
    const records = loadGridRecords(db, match.id);
    expect(records?.entries).toEqual([]);
    expect(records?.marks).toEqual([]);
  });

  it("RF-025: an unknown match returns nothing, without throwing, also on an empty database", () => {
    const { db, teamId } = openWithSquad(1);
    const match = createMatch(db, matchValues(teamId), []);
    expect(loadGridRecords(db, match.id + 1)).toBeUndefined();
    expect(loadGridRecords(db, 0)).toBeUndefined();
    expect(counts(db).matches).toBe(1);
  });

  it("RF-025: scores of 0-0 come back as numbers, not as nulls", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(
      db,
      matchValues(teamId, { homeScore: 0, awayScore: 0 }),
      [],
    );
    const loaded = loadGridRecords(db, match.id)?.match;
    expect(loaded?.homeScore).toBe(0);
    expect(loaded?.awayScore).toBe(0);
  });
});

describe("grid records, marks and overtimes", () => {
  it("RF-058: marks written directly come back with their entry, kind and column, overtime ones included, and so does the overtime count", () => {
    const { db, teamId, players } = openWithSquad(2);
    const matchId = addMatch(db, teamId, { overtimeCount: 2 });
    const [anaId, luisId] = players.map((player) =>
      addEntry(db, matchId, player.id, {
        playerName: player.name,
        playerNumber: player.number,
      }),
    );
    addMark(db, anaId ?? 0, { columnKind: "period", columnNumber: 1 });
    addMark(db, anaId ?? 0, {
      columnKind: "period",
      columnNumber: 4,
      mark: "sub",
    });
    addMark(db, luisId ?? 0, {
      columnKind: "overtime",
      columnNumber: 2,
      mark: "starter",
    });
    const records = loadGridRecords(db, matchId);
    expect(records?.match.overtimeCount).toBe(2);
    expect(records?.marks).toHaveLength(3);
    expect(records?.marks).toEqual(
      expect.arrayContaining([
        {
          callUpEntryId: anaId,
          columnKind: "period",
          columnNumber: 1,
          mark: "starter",
        },
        {
          callUpEntryId: anaId,
          columnKind: "period",
          columnNumber: 4,
          mark: "sub",
        },
        {
          callUpEntryId: luisId,
          columnKind: "overtime",
          columnNumber: 2,
          mark: "starter",
        },
      ]),
    );
  });

  it("RF-025: the marks and entries of another match are never mixed in", () => {
    const { db, teamId, players } = openWithSquad(2);
    const [ana, luis] = players;
    const one = addMatch(db, teamId);
    const two = addMatch(db, teamId);
    const anaEntry = addEntry(db, one, ana?.id ?? 0);
    const luisEntry = addEntry(db, two, luis?.id ?? 0, { playerName: "Luis" });
    addMark(db, anaEntry);
    addMark(db, luisEntry);
    const records = loadGridRecords(db, one);
    expect(records?.entries.map((entry) => entry.id)).toEqual([anaEntry]);
    expect(records?.marks.map((mark) => mark.callUpEntryId)).toEqual([
      anaEntry,
    ]);
  });

  it("RF-019: an entry keeps its snapshot in the records after the player is renamed", () => {
    const { db, teamId, players } = openWithSquad(1);
    const match = createMatch(db, matchValues(teamId), players.map(entryOf));
    const entry = loadGridRecords(db, match.id)?.entries[0];
    expect([entry?.playerName, entry?.playerNumber]).toEqual([
      "Jugador 1",
      "1",
    ]);
  });
});
