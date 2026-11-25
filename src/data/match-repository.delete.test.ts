// T068: deleting a match (RF-029, RF-082). deleteMatch removes the match, its call-up entries and
// their marks (cascade) and nothing else.
import { loadGridRecords } from "@/data/grid-repository";
import {
  deleteMatch,
  getMatch,
  updateMatchDetails,
} from "@/data/match-repository";
import {
  addEntry,
  addMatch,
  addPlayer,
  addTeam,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  addSecondMatch,
  openWithMatch,
  row,
  seedMarks,
} from "../../tests/data/grid-write-fixtures";

describe("match repository, deleting a match", () => {
  it("RF-029: deleting a match removes it, its call-up entries and their marks", () => {
    const { db, matchId, entryIds } = openWithMatch(3, { overtimeCount: 1 });
    seedMarks(db, [
      row(entryIds[0] as number, "P1", "starter"),
      row(entryIds[1] as number, "P8", "sub"),
      row(entryIds[2] as number, "OT1", "starter"),
    ]);
    deleteMatch(db, matchId);
    expect(getMatch(db, matchId)).toBeUndefined();
    expect(loadGridRecords(db, matchId)).toBeUndefined();
    expect(counts(db)).toMatchObject({
      matches: 0,
      call_up_entries: 0,
      marks: 0,
    });
  });

  it("RF-029: deleting a match leaves the team and its players", () => {
    const { db, matchId } = openWithMatch(4);
    deleteMatch(db, matchId);
    expect(counts(db)).toMatchObject({ teams: 1, players: 4 });
  });

  it("RF-029: deleting one match leaves the team's other matches, with their entries and marks", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(2);
    const other = addSecondMatch(db, teamId, playerIds[0] as number, 1);
    seedMarks(db, [
      row(entryIds[0] as number, "P1", "starter"),
      row(other.entryId, "P1", "sub"),
      row(other.entryId, "OT1", "starter"),
    ]);
    const otherBefore = loadGridRecords(db, other.matchId);
    deleteMatch(db, matchId);
    expect(loadGridRecords(db, other.matchId)).toEqual(otherBefore);
    expect(counts(db)).toMatchObject({
      matches: 1,
      call_up_entries: 1,
      marks: 2,
    });
  });

  it("RF-029: deleting one match leaves the matches, entries and marks of another team", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const team = addTeam(db, { name: "Cadete B" });
    const player = addPlayer(db, team);
    const otherMatch = addMatch(db, team, { overtimeCount: 1 });
    const otherEntry = addEntry(db, otherMatch, player);
    seedMarks(db, [
      row(entryIds[0] as number, "P1", "starter"),
      row(otherEntry, "P1", "sub"),
      row(otherEntry, "OT1", "starter"),
    ]);
    const before = loadGridRecords(db, otherMatch);
    deleteMatch(db, matchId);
    expect(loadGridRecords(db, otherMatch)).toEqual(before);
    expect(counts(db)).toMatchObject({
      teams: 2,
      matches: 1,
      call_up_entries: 1,
      marks: 2,
    });
  });

  it("RF-029: an ID that does not exist deletes nothing", () => {
    const { db, matchId, entryIds } = openWithMatch(2);
    seedMarks(db, [row(entryIds[0] as number, "P1", "starter")]);
    const before = counts(db);
    failureOf(() => deleteMatch(db, matchId + 1));
    failureOf(() => deleteMatch(db, 0));
    expect(counts(db)).toEqual(before);
    expect(getMatch(db, matchId)).toBeDefined();
    deleteMatch(db, matchId);
    expect(counts(db)).toMatchObject({ matches: 0, marks: 0 });
  });

  it("RF-029: deleting the same match twice leaves the team's other match", () => {
    const { db, teamId, matchId, playerIds } = openWithMatch(1);
    const other = addSecondMatch(db, teamId, playerIds[0] as number);
    deleteMatch(db, matchId);
    failureOf(() => deleteMatch(db, matchId));
    expect(getMatch(db, other.matchId)).toBeDefined();
    expect(counts(db).matches).toBe(1);
  });

  it("RF-029 RF-082: after deleting a match its details cannot be edited and nothing is created", () => {
    const { db, matchId } = openWithMatch(0);
    deleteMatch(db, matchId);
    expect(
      updateMatchDetails(db, matchId, {
        date: "2026-12-24",
        time: null,
        homeName: null,
        awayName: null,
        homeScore: null,
        awayScore: null,
        notes: null,
      }),
    ).toBeUndefined();
    expect(counts(db).matches).toBe(0);
  });
});
