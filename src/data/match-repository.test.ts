// T038: the match repository on a migrated in-memory database (RF-010, RF-019, RF-025, RF-026,
// RF-030, RF-036, RF-084). createMatch saves the match and its call-up snapshot in one
// transaction and returns the stored match; getMatch reads it back unchanged.
import { createMatch, getMatch } from "@/data/match-repository";
import { loadGridRecords } from "@/data/grid-repository";
import { counts } from "../../tests/data/schema-fixtures";
import {
  entryOf,
  matchValues,
  openWithSquad,
} from "../../tests/data/match-fixtures";

const FORTY = "Ñandú «Águila» \"x\" 'y' 🏀 ".padEnd(40, "é").slice(0, 40);
const FIVE_HUNDRED = "Notas 🏀 'a' \"b\" ".padEnd(500, "ñ").slice(0, 500);

describe("match repository, create and read", () => {
  it("RF-019 RF-025: create with 12 players stores the match and 12 entries holding each name and number", () => {
    const { db, teamId, players } = openWithSquad(12);
    const match = createMatch(db, matchValues(teamId), players.map(entryOf));
    expect(counts(db)).toMatchObject({ matches: 1, call_up_entries: 12 });
    const records = loadGridRecords(db, match.id);
    expect(records?.entries).toHaveLength(12);
    expect(
      records?.entries.map((entry) => [
        entry.playerId,
        entry.playerName,
        entry.playerNumber,
      ]),
    ).toEqual(players.map((p) => [p.id, p.name, p.number]));
    expect(records?.entries.every((entry) => entry.matchId === match.id)).toBe(
      true,
    );
  });

  it("RF-025 RF-026 RF-036: a match with only format and date has a null time, no names, no notes, no score and no overtimes", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(db, matchValues(teamId), []);
    expect(match).toEqual({
      id: expect.any(Number),
      teamId,
      format: 6,
      date: "2026-11-11",
      time: null,
      homeName: null,
      awayName: null,
      notes: null,
      homeScore: null,
      awayScore: null,
      overtimeCount: 0,
    });
  });

  it("RF-025: getMatch reads every field back unchanged", () => {
    const { db, teamId } = openWithSquad(0);
    const created = createMatch(
      db,
      matchValues(teamId, {
        format: 8,
        date: "2026-12-31",
        time: "09:30",
        homeName: "Alevín A",
        awayName: "Cadete B",
        notes: "Llevar petos",
        homeScore: 41,
        awayScore: 38,
      }),
      [],
    );
    expect(getMatch(db, created.id)).toEqual(created);
    expect(getMatch(db, created.id)).toMatchObject({
      format: 8,
      date: "2026-12-31",
      time: "09:30",
      homeName: "Alevín A",
      awayName: "Cadete B",
      notes: "Llevar petos",
      homeScore: 41,
      awayScore: 38,
      overtimeCount: 0,
    });
  });

  it("RF-025: getMatch of an unknown ID returns nothing and does not throw", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(db, matchValues(teamId), []);
    expect(getMatch(db, match.id + 1)).toBeUndefined();
  });

  it.each([4, 6, 8])(
    "RF-025 RF-036 RF-084: a match of format %i is stored with that format",
    (format) => {
      const { db, teamId, players } = openWithSquad(9);
      const match = createMatch(
        db,
        matchValues(teamId, { format }),
        players.map(entryOf),
      );
      expect(getMatch(db, match.id)?.format).toBe(format);
    },
  );

  it("RF-025: notes of 500 characters and names of 40, with emoji and quotes, come back unchanged", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(
      db,
      matchValues(teamId, {
        homeName: FORTY,
        awayName: `${FORTY.slice(0, 39)}'`,
        notes: FIVE_HUNDRED,
      }),
      [],
    );
    expect(getMatch(db, match.id)).toMatchObject({
      homeName: FORTY,
      awayName: `${FORTY.slice(0, 39)}'`,
      notes: FIVE_HUNDRED,
    });
  });

  it("RF-025: a score of 0-0 and one of 999-0 are stored as numbers, never as nulls", () => {
    const { db, teamId } = openWithSquad(0);
    const zero = createMatch(
      db,
      matchValues(teamId, { homeScore: 0, awayScore: 0 }),
      [],
    );
    const big = createMatch(
      db,
      matchValues(teamId, { homeScore: 999, awayScore: 0 }),
      [],
    );
    expect(getMatch(db, zero.id)?.homeScore).toBe(0);
    expect(getMatch(db, zero.id)?.awayScore).toBe(0);
    expect(getMatch(db, big.id)?.homeScore).toBe(999);
    expect(getMatch(db, big.id)?.awayScore).toBe(0);
  });

  it("RF-025: the time 00:00 is stored as the text 00:00, not as no time", () => {
    const { db, teamId } = openWithSquad(0);
    const match = createMatch(db, matchValues(teamId, { time: "00:00" }), []);
    expect(getMatch(db, match.id)?.time).toBe("00:00");
  });

  it("RF-025 RF-085: a text with a SQL injection attempt is stored as plain text", () => {
    const { db, teamId } = openWithSquad(0);
    const text = "x'); DROP TABLE matches; --";
    const match = createMatch(db, matchValues(teamId, { notes: text }), []);
    expect(getMatch(db, match.id)?.notes).toBe(text);
    expect(counts(db).matches).toBe(1);
  });

  it("RF-025: two matches of the same team and date are both stored, as different matches", () => {
    const { db, teamId } = openWithSquad(0);
    const first = createMatch(db, matchValues(teamId), []);
    const second = createMatch(db, matchValues(teamId), []);
    expect(second.id).not.toBe(first.id);
    expect(counts(db).matches).toBe(2);
  });
});

describe("match repository, the call-up is never judged", () => {
  it("RF-010 RF-030: a call-up of 0 entries is saved, and so is one of 12 and one of 13", () => {
    const { db, teamId, players } = openWithSquad(13);
    const none = createMatch(db, matchValues(teamId), []);
    const twelve = createMatch(
      db,
      matchValues(teamId),
      players.slice(0, 12).map(entryOf),
    );
    const thirteen = createMatch(db, matchValues(teamId), players.map(entryOf));
    const sizes = [none, twelve, thirteen].map(
      (match) => loadGridRecords(db, match.id)?.entries.length,
    );
    expect(sizes).toEqual([0, 12, 13]);
  });

  it("RF-010: 8 entries in a 6-period match, and 13 in a 4-period one, are saved", () => {
    const { db, teamId, players } = openWithSquad(13);
    const eight = createMatch(
      db,
      matchValues(teamId, { format: 6 }),
      players.slice(0, 8).map(entryOf),
    );
    const thirteen = createMatch(
      db,
      matchValues(teamId, { format: 4 }),
      players.map(entryOf),
    );
    expect(loadGridRecords(db, eight.id)?.entries).toHaveLength(8);
    expect(loadGridRecords(db, thirteen.id)?.entries).toHaveLength(13);
  });

  it("RF-030: only the players handed in are in the call-up; the deselected ones are not", () => {
    const { db, teamId, players } = openWithSquad(12);
    const picked = players.filter((_, index) => index !== 3 && index !== 8);
    const match = createMatch(db, matchValues(teamId), picked.map(entryOf));
    const ids = loadGridRecords(db, match.id)?.entries.map((e) => e.playerId);
    expect(ids).toEqual(picked.map((player) => player.id));
    expect(ids).not.toContain(players[3]?.id);
    expect(ids).not.toContain(players[8]?.id);
  });

  it("RF-019: the numbers 0 and 00 stay two different texts in the snapshot", () => {
    const { db, teamId, players } = openWithSquad(2);
    const typed = ["0", "00"];
    const match = createMatch(
      db,
      matchValues(teamId),
      players.map((player, index) => ({
        ...entryOf(player),
        number: typed[index] ?? "",
      })),
    );
    const numbers = loadGridRecords(db, match.id)?.entries.map(
      (entry) => entry.playerNumber,
    );
    expect(numbers).toEqual(["0", "00"]);
  });
});
