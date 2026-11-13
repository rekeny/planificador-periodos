// T039: removing an entry deletes only its own marks (RF-034, E-017) and createPlayerInMatch
// (RF-019, RF-035) creates the player and the entry in one transaction, or nothing.
import {
  addToCallUp,
  createPlayerInMatch,
  removeFromCallUp,
} from "@/data/call-up-repository";
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch } from "@/data/match-repository";
import { listPlayers } from "@/data/player-repository";
import { players as playersTable } from "@/data/schema";
import { eq } from "drizzle-orm";
import {
  FOREIGN_KEY_FAILED,
  addMark,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  entryLines,
  openWithEmptyMatch,
} from "../../tests/data/call-up-fixtures";
import { entryOf, matchValues } from "../../tests/data/match-fixtures";

describe("call-up repository, marks go with their entry", () => {
  it("RF-034 E-017: removing Ana deletes all her marks, periods and overtimes, and keeps those of the other entries", () => {
    const { db, matchId, players } = openWithEmptyMatch(2);
    const [ana, luis] = players.map((p) =>
      addToCallUp(db, matchId, entryOf(p)),
    );
    const anaId = ana?.id ?? 0;
    const luisId = luis?.id ?? 0;
    addMark(db, anaId, { columnNumber: 1 });
    addMark(db, anaId, { columnNumber: 2, mark: "sub" });
    addMark(db, anaId, { columnKind: "overtime", columnNumber: 1 });
    addMark(db, luisId, { columnNumber: 1 });
    addMark(db, luisId, {
      columnKind: "overtime",
      columnNumber: 1,
      mark: "sub",
    });
    removeFromCallUp(db, anaId);
    const marks = loadGridRecords(db, matchId)?.marks;
    expect(marks).toHaveLength(2);
    expect(marks?.every((mark) => mark.callUpEntryId === luisId)).toBe(true);
    expect(counts(db).marks).toBe(2);
  });

  it("RF-034: removing an entry with no marks removes only the entry", () => {
    const { db, matchId, players } = openWithEmptyMatch(2);
    const [ana, luis] = players.map((p) =>
      addToCallUp(db, matchId, entryOf(p)),
    );
    addMark(db, luis?.id ?? 0);
    removeFromCallUp(db, ana?.id ?? 0);
    expect(counts(db)).toMatchObject({ call_up_entries: 1, marks: 1 });
  });

  it("RF-034: the marks of the same player in another match stay when she is removed from this one", () => {
    const { db, teamId, matchId, players } = openWithEmptyMatch(1);
    const other = createMatch(db, matchValues(teamId), []);
    const one = addToCallUp(db, matchId, entryOf(players[0]!));
    const two = addToCallUp(db, other.id, entryOf(players[0]!));
    addMark(db, one.id);
    addMark(db, two.id);
    removeFromCallUp(db, one.id);
    expect(loadGridRecords(db, other.id)?.marks).toEqual([
      expect.objectContaining({ callUpEntryId: two.id }),
    ]);
    expect(counts(db).marks).toBe(1);
  });

  it("RF-034 E-017: removing Ana with marks and adding her again gives a new entry id and an empty row, with no old marks", () => {
    const { db, matchId, players } = openWithEmptyMatch(1);
    const ana = players[0]!;
    const old = addToCallUp(db, matchId, entryOf(ana));
    addMark(db, old.id);
    removeFromCallUp(db, old.id);
    const again = addToCallUp(db, matchId, entryOf(ana));
    expect(again.id).not.toBe(old.id);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([again]);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([]);
  });
});

describe("call-up repository, creating a player from the match", () => {
  it("RF-035 RF-019: it returns the player and an entry with the same name and number, and the player is in the team", () => {
    const { db, teamId, matchId } = openWithEmptyMatch(0);
    const created = createPlayerInMatch(db, matchId, {
      teamId,
      name: "Nora",
      number: "15",
    });
    expect(created.player).toEqual({
      id: expect.any(Number),
      teamId,
      name: "Nora",
      number: "15",
      isActive: true,
    });
    expect(created.entry).toEqual({
      id: expect.any(Number),
      matchId,
      playerId: created.player.id,
      playerName: "Nora",
      playerNumber: "15",
    });
    expect(listPlayers(db, teamId)).toEqual([created.player]);
    expect(loadGridRecords(db, matchId)?.entries).toEqual([created.entry]);
  });

  it("RF-035 RF-017: the numbers 0 and 00 and a number already used are accepted and snapshotted as typed", () => {
    const { db, teamId, matchId, players } = openWithEmptyMatch(1);
    const numbers = ["0", "00", players[0]?.number ?? ""];
    const created = numbers.map((number) =>
      createPlayerInMatch(db, matchId, { teamId, name: "Nuevo", number }),
    );
    expect(created.map((c) => c.entry.playerNumber)).toEqual(numbers);
    expect(counts(db)).toMatchObject({ players: 4, call_up_entries: 3 });
  });

  it("RF-035 RF-019: renaming the new player afterwards leaves its entry as it was", () => {
    const { db, teamId, matchId } = openWithEmptyMatch(0);
    const { player } = createPlayerInMatch(db, matchId, {
      teamId,
      name: "Nora",
      number: "15",
    });
    db.update(playersTable)
      .set({ name: "Norma", number: "16" })
      .where(eq(playersTable.id, player.id))
      .run();
    expect(entryLines(db, matchId)).toEqual([[player.id, "Nora", "15"]]);
  });

  it("RF-035 RF-010: creating the 13th player from the match is saved, the repository does not limit", () => {
    const { db, teamId, matchId, players } = openWithEmptyMatch(12);
    for (const p of players) addToCallUp(db, matchId, entryOf(p));
    createPlayerInMatch(db, matchId, { teamId, name: "Doce", number: "13" });
    expect(loadGridRecords(db, matchId)?.entries).toHaveLength(13);
  });

  it("RF-035 RF-085: a match that does not exist throws and no player is created either", () => {
    const { db, teamId, matchId } = openWithEmptyMatch(1);
    const failure = failureOf(() =>
      createPlayerInMatch(db, matchId + 1, {
        teamId,
        name: "Nora",
        number: "15",
      }),
    );
    expect(failure).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db)).toMatchObject({ players: 1, call_up_entries: 0 });
  });

  it("RF-035 RF-085: a team that does not exist throws and nothing is written, and the next valid creation works", () => {
    const { db, teamId, matchId } = openWithEmptyMatch(0);
    const failure = failureOf(() =>
      createPlayerInMatch(db, matchId, {
        teamId: teamId + 1,
        name: "Nora",
        number: "15",
      }),
    );
    expect(failure).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db)).toMatchObject({ players: 0, call_up_entries: 0 });
    createPlayerInMatch(db, matchId, { teamId, name: "Nora", number: "15" });
    expect(counts(db)).toMatchObject({ players: 1, call_up_entries: 1 });
  });
});
