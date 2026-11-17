// T039: addToCallUp and removeFromCallUp on a migrated in-memory database (RF-010, RF-019,
// RF-032, RF-033, RF-034, E-017). The repository never judges the call-up (no format, no range);
// a write that breaks the unique index throws, and the state layer turns that into saveFailed.
import { addToCallUp, removeFromCallUp } from "@/data/call-up-repository";
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch } from "@/data/match-repository";
import { createPlayer } from "@/data/player-repository";
import { players as playersTable } from "@/data/schema";
import { eq } from "drizzle-orm";
import {
  UNIQUE_FAILED,
  addMark,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  entryLines,
  openWithEmptyMatch,
} from "../../tests/data/call-up-fixtures";
import {
  entryOf,
  matchValues,
  openWithSquad,
} from "../../tests/data/match-fixtures";

describe("call-up repository, adding a player", () => {
  it("RF-019 RF-032: adding a player returns the new entry with its id, the match and the current name and number", () => {
    const { db, matchId, players } = openWithEmptyMatch(2);
    const [ana] = players;
    const entry = addToCallUp(db, matchId, entryOf(ana!));
    expect(entry).toEqual({
      id: expect.any(Number),
      matchId,
      playerId: ana?.id,
      playerName: "Jugador 1",
      playerNumber: "1",
    });
    expect(loadGridRecords(db, matchId)?.entries).toEqual([entry]);
  });

  it("RF-032: two players added one after the other get different ids and are both in the call-up", () => {
    const { db, matchId, players } = openWithEmptyMatch(2);
    const first = addToCallUp(db, matchId, entryOf(players[0]!));
    const second = addToCallUp(db, matchId, entryOf(players[1]!));
    expect(second.id).not.toBe(first.id);
    expect(counts(db).call_up_entries).toBe(2);
  });

  it("RF-019: the name and number given are stored as given, even when they differ from the player's current ones", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const entry = addToCallUp(db, matchId, {
      playerId: players[0]?.id ?? 0,
      name: "Ana María",
      number: "99",
    });
    expect([entry.playerName, entry.playerNumber]).toEqual(["Ana María", "99"]);
    expect(entryLines(db, matchId)[0]).toEqual([
      entry.playerId,
      "Ana María",
      "99",
    ]);
  });

  it("RF-019: renaming the player afterwards leaves the entry as it was", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const ana = players[0]!;
    addToCallUp(db, matchId, entryOf(ana));
    db.update(playersTable)
      .set({ name: "Otro", number: "50" })
      .where(eq(playersTable.id, ana.id))
      .run();
    expect(entryLines(db, matchId)).toEqual([[ana.id, "Jugador 1", "1"]]);
  });

  it("RF-019: the number 00 is snapshotted as the text 00, and 0 as 0", () => {
    const { db, teamId, matchId } = openWithEmptyMatch(0);
    const zero = createPlayer(db, { teamId, name: "Cero", number: "0" });
    const double = createPlayer(db, { teamId, name: "Doble", number: "00" });
    const entries = [zero, double].map((p) =>
      addToCallUp(db, matchId, entryOf(p)),
    );
    expect(entries.map((entry) => entry.playerNumber)).toEqual(["0", "00"]);
    expect(entryLines(db, matchId).map((line) => line[2])).toEqual(["0", "00"]);
  });
});

describe("call-up repository, the call-up is never judged", () => {
  it("RF-010: adding the 13th player is saved, the repository does not limit", () => {
    const { db, matchId, players } = openWithEmptyMatch(13);
    for (const player of players) addToCallUp(db, matchId, entryOf(player));
    expect(loadGridRecords(db, matchId)?.entries).toHaveLength(13);
  });

  it("RF-010: a 4-period match accepts 13 entries and a 6-period one accepts 3, the format is not looked at", () => {
    const { db, teamId, players } = openWithSquad(13);
    const four = createMatch(db, matchValues(teamId, { format: 4 }), []);
    const six = createMatch(db, matchValues(teamId, { format: 6 }), []);
    for (const p of players) addToCallUp(db, four.id, entryOf(p));
    for (const p of players.slice(0, 3)) addToCallUp(db, six.id, entryOf(p));
    expect(loadGridRecords(db, four.id)?.entries).toHaveLength(13);
    expect(loadGridRecords(db, six.id)?.entries).toHaveLength(3);
  });

  it("RF-019 RF-032: adding the same player twice throws on the unique index and leaves only the first entry", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const ana = players[0]!;
    const first = addToCallUp(db, matchId, entryOf(ana));
    const failure = failureOf(() => addToCallUp(db, matchId, entryOf(ana)));
    expect(failure).toMatch(UNIQUE_FAILED);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([first]);
  });

  it("RF-032: the same player can be added to two different matches", () => {
    const { db, teamId, matchId, players } = openWithEmptyMatch(1);
    const other = createMatch(db, matchValues(teamId), []);
    const one = addToCallUp(db, matchId, entryOf(players[0]!));
    const two = addToCallUp(db, other.id, entryOf(players[0]!));
    expect(two.id).not.toBe(one.id);
    expect(counts(db).call_up_entries).toBe(2);
  });

  it("RF-032 RF-085: a player that does not exist, or a match that does not exist, throws and writes nothing", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const ghost = { playerId: 9999, name: "Fantasma", number: "1" };
    expect(failureOf(() => addToCallUp(db, matchId, ghost))).toMatch(
      /FOREIGN KEY/,
    );
    expect(
      failureOf(() => addToCallUp(db, matchId + 1, entryOf(players[0]!))),
    ).toMatch(/FOREIGN KEY/);
    expect(counts(db).call_up_entries).toBe(0);
  });
});

describe("call-up repository, removing an entry", () => {
  it("RF-033: removing an entry deletes it and nothing else from the call-up", () => {
    const { db, matchId, players } = openWithEmptyMatch(3);
    const [ana, luis, eva] = players.map((p) =>
      addToCallUp(db, matchId, entryOf(p)),
    );
    removeFromCallUp(db, luis!.id);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([ana, eva]);
    expect(counts(db).players).toBe(3);
  });

  it("RF-033: removing the last player of the call-up leaves it empty, and the match stays", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const entry = addToCallUp(db, matchId, entryOf(players[0]!));
    removeFromCallUp(db, entry.id);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([]);
    expect(counts(db)).toMatchObject({ matches: 1, call_up_entries: 0 });
  });

  it("RF-033: removing from one match leaves the player in the other matches", () => {
    const { db, teamId, matchId, players } = openWithEmptyMatch(1);
    const other = createMatch(db, matchValues(teamId), []);
    const one = addToCallUp(db, matchId, entryOf(players[0]!));
    const two = addToCallUp(db, other.id, entryOf(players[0]!));
    removeFromCallUp(db, one.id);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([]);
    expect(loadGridRecords(db, other.id)?.entries).toEqual([two]);
  });

  it("RF-033: removing an entry that does not exist, or one already removed, changes nothing and does not throw", () => {
    const { db, matchId, players } = openWithEmptyMatch(2);
    const [ana, luis] = players.map((p) =>
      addToCallUp(db, matchId, entryOf(p)),
    );
    addMark(db, ana!.id);
    removeFromCallUp(db, luis!.id);
    const before = counts(db);
    expect(() => removeFromCallUp(db, luis!.id)).not.toThrow();
    expect(() => removeFromCallUp(db, 9999)).not.toThrow();
    expect(() => removeFromCallUp(db, 0)).not.toThrow();
    expect(counts(db)).toEqual(before);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([ana]);
  });
});
