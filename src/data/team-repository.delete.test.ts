// T074: counting what a team holds and deleting the team (RF-015, RF-021). The cascades of the
// schema remove its players, matches, call-up entries and marks; nothing of another team goes.
// Failures are real SQLite triggers, so no repository is mocked (RF-085).
import { loadGridRecords } from "@/data/grid-repository";
import { createMatch, getMatch } from "@/data/match-repository";
import { createPlayer, listPlayers } from "@/data/player-repository";
import {
  countTeamContents,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
} from "@/data/team-repository";
import { counts, failureOf } from "../../tests/data/schema-fixtures";
import { entryOf, matchValues } from "../../tests/data/match-fixtures";
import {
  allowDeletesOf,
  failDeletesOf,
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

const NEW_TEAM = { name: "Nuevo", category: null, defaultFormat: 6 } as const;

describe("team repository, counting what a team holds", () => {
  it("RF-015: counts the players, inactive ones included, and the matches of the team", () => {
    const { db, first } = openWithTwoTeams();
    expect(countTeamContents(db, first.teamId)).toEqual({
      players: 3,
      matches: 2,
    });
  });

  it("RF-015: a team with nothing counts 0 and 0", () => {
    const db = createTestDatabase();
    const team = createTeam(db, NEW_TEAM);
    expect(countTeamContents(db, team.id)).toEqual({ players: 0, matches: 0 });
  });

  it("RF-015: a team with players and no matches, and one with matches and no players, count each side apart", () => {
    const db = createTestDatabase();
    const withPlayers = createTeam(db, NEW_TEAM);
    createPlayer(db, { teamId: withPlayers.id, name: "Ana", number: "1" });
    createPlayer(db, { teamId: withPlayers.id, name: "Eva", number: "2" });
    const withMatches = createTeam(db, NEW_TEAM);
    createMatch(db, matchValues(withMatches.id), []);
    expect(countTeamContents(db, withPlayers.id)).toEqual({
      players: 2,
      matches: 0,
    });
    expect(countTeamContents(db, withMatches.id)).toEqual({
      players: 0,
      matches: 1,
    });
  });

  it("RF-015: counts a match once however many players are called up, and never counts another team's rows", () => {
    const { db, first, second } = openWithTwoTeams();
    const extra = createPlayer(db, {
      teamId: second.teamId,
      name: "Luis",
      number: "3",
    });
    createMatch(db, matchValues(second.teamId), [entryOf(extra)]);
    expect(countTeamContents(db, first.teamId)).toEqual({
      players: 3,
      matches: 2,
    });
    expect(countTeamContents(db, second.teamId)).toEqual({
      players: 4,
      matches: 3,
    });
  });

  it("RF-015: counting only reads: no table changes", () => {
    const { db, first } = openWithTwoTeams();
    const before = counts(db);
    const rows = rowsOfTeam(db, first.teamId);
    countTeamContents(db, first.teamId);
    expect(counts(db)).toEqual(before);
    expect(rowsOfTeam(db, first.teamId)).toEqual(rows);
  });

  it("RF-015: an unknown team counts 0 and 0", () => {
    const { db, first, second } = openWithTwoTeams();
    const unknown = Math.max(first.teamId, second.teamId) + 1;
    expect(countTeamContents(db, unknown)).toEqual({ players: 0, matches: 0 });
    expect(countTeamContents(db, 0)).toEqual({ players: 0, matches: 0 });
  });
});

describe("team repository, deleting a team", () => {
  it("RF-015 RF-021: deleting a team removes it, its players, matches, call-up entries and marks", () => {
    const { db, first, second } = openWithTwoTeams();
    deleteTeam(db, first.teamId);
    expect(getTeam(db, first.teamId)).toBeUndefined();
    expect(listPlayers(db, first.teamId)).toEqual([]);
    for (const matchId of first.matchIds) {
      expect(getMatch(db, matchId)).toBeUndefined();
      expect(loadGridRecords(db, matchId)).toBeUndefined();
    }
    expect(rowsOfTeam(db, first.teamId)).toEqual({
      team: [],
      players: [],
      matches: [],
      entries: [],
      marks: [],
    });
    expect(counts(db)).toEqual({
      teams: 1,
      players: 3,
      matches: 2,
      call_up_entries: 6,
      marks: 6,
    });
    expect(listTeams(db).map((team) => team.id)).toEqual([second.teamId]);
  });

  it("RF-015: nothing of another team changes, row by row, in all five tables", () => {
    const { db, first, second } = openWithTwoTeams();
    const before = rowsOfTeam(db, second.teamId);
    const grids = second.matchIds.map((id) => loadGridRecords(db, id));
    deleteTeam(db, first.teamId);
    expect(rowsOfTeam(db, second.teamId)).toEqual(before);
    expect(second.matchIds.map((id) => loadGridRecords(db, id))).toEqual(grids);
  });

  it("RF-015: deleting the second team leaves the first one whole", () => {
    const { db, first, second } = openWithTwoTeams();
    const before = rowsOfTeam(db, first.teamId);
    deleteTeam(db, second.teamId);
    expect(rowsOfTeam(db, first.teamId)).toEqual(before);
    expect(counts(db).teams).toBe(1);
  });

  it("RF-015: a team with nothing in it is deleted, and so is one with only players", () => {
    const db = createTestDatabase();
    const empty = createTeam(db, NEW_TEAM);
    const withPlayer = createTeam(db, NEW_TEAM);
    createPlayer(db, { teamId: withPlayer.id, name: "Ana", number: "1" });
    deleteTeam(db, empty.id);
    expect(counts(db)).toMatchObject({ teams: 1, players: 1 });
    deleteTeam(db, withPlayer.id);
    expect(counts(db)).toMatchObject({ teams: 0, players: 0 });
  });

  it("RF-015: two teams with the same name and category: deleting one leaves the other", () => {
    const db = createTestDatabase();
    const a = createTeam(db, NEW_TEAM);
    const b = createTeam(db, NEW_TEAM);
    createPlayer(db, { teamId: b.id, name: "Ana", number: "1" });
    deleteTeam(db, a.id);
    expect(listTeams(db)).toEqual([b]);
    expect(listPlayers(db, b.id)).toHaveLength(1);
  });

  it("RF-015: an unknown ID deletes nothing, and so does 0", () => {
    const { db, first, second } = openWithTwoTeams();
    const before = counts(db);
    const rows = [first, second].map((t) => rowsOfTeam(db, t.teamId));
    deleteTeam(db, Math.max(first.teamId, second.teamId) + 1);
    deleteTeam(db, 0);
    expect(counts(db)).toEqual(before);
    expect([first, second].map((t) => rowsOfTeam(db, t.teamId))).toEqual(rows);
  });

  it("RF-015: deleting the same team twice does nothing the second time", () => {
    const { db, first, second } = openWithTwoTeams();
    deleteTeam(db, first.teamId);
    const after = counts(db);
    deleteTeam(db, first.teamId);
    expect(counts(db)).toEqual(after);
    expect(rowsOfTeam(db, second.teamId).players).toHaveLength(3);
  });

  it("RF-015: after deleting a team it counts 0 and 0, and deleting both teams empties the five tables", () => {
    const { db, first, second } = openWithTwoTeams();
    deleteTeam(db, first.teamId);
    expect(countTeamContents(db, first.teamId)).toEqual({
      players: 0,
      matches: 0,
    });
    deleteTeam(db, second.teamId);
    expect(counts(db)).toEqual({
      teams: 0,
      players: 0,
      matches: 0,
      call_up_entries: 0,
      marks: 0,
    });
  });

  it("RF-015: a team created after a deletion works and holds none of the old data", () => {
    const { db, first } = openWithTwoTeams();
    deleteTeam(db, first.teamId);
    const fresh = createTeam(db, NEW_TEAM);
    expect(countTeamContents(db, fresh.id)).toEqual({ players: 0, matches: 0 });
    expect(listPlayers(db, fresh.id)).toEqual([]);
  });

  it("RF-015: text that looks like SQL in the team name is stored as text and deletes only its team", () => {
    const { db, second } = openWithTwoTeams();
    const trap = createTeam(db, {
      name: "x'); DROP TABLE teams; --",
      category: "' OR 1=1 --",
      defaultFormat: 8,
    });
    expect(getTeam(db, trap.id)).toEqual(trap);
    deleteTeam(db, trap.id);
    expect(getTeam(db, trap.id)).toBeUndefined();
    expect(counts(db).teams).toBe(2);
    expect(getTeam(db, second.teamId)).toBeDefined();
  });
});

describe("team repository, a failure halfway through a team deletion", () => {
  it.each(["marks", "call_up_entries", "matches", "players", "teams"] as const)(
    "RF-015 RF-082: a failing delete of %s leaves the whole team, and every other team, as it was",
    (table) => {
      const { db, first, second } = openWithTwoTeams();
      const before = counts(db);
      const rows = [first, second].map((t) => rowsOfTeam(db, t.teamId));
      failDeletesOf(db, table);
      expect(failureOf(() => deleteTeam(db, first.teamId))).toMatch(
        /disk full/,
      );
      expect(counts(db)).toEqual(before);
      expect([first, second].map((t) => rowsOfTeam(db, t.teamId))).toEqual(
        rows,
      );
      expect(countTeamContents(db, first.teamId)).toEqual({
        players: 3,
        matches: 2,
      });
    },
  );

  it("RF-015 RF-082: after the failure goes away, deleting again removes the team whole", () => {
    const { db, first, second } = openWithTwoTeams();
    failDeletesOf(db, "marks");
    failureOf(() => deleteTeam(db, first.teamId));
    allowDeletesOf(db, "marks");
    deleteTeam(db, first.teamId);
    expect(rowsOfTeam(db, first.teamId).team).toEqual([]);
    expect(counts(db)).toMatchObject({ teams: 1, players: 3, marks: 6 });
    expect(rowsOfTeam(db, second.teamId).players).toHaveLength(3);
  });
});
