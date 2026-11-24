// T075: counting what a team holds and deleting a team through the squad store (RF-015, RF-021,
// RF-082, RF-085). `teamContents(teamId)` only reads. `deleteTeam(teamId)` deletes, drops the team
// from `teams` and does NOT clear the open `team`: the store remembers it was deleted, so writes on
// it return `unchanged` until another team is opened (second phase 4 pass, N-3). Failures are in
// squad-store.squad.failures.delete.test.ts.
import { sql } from "drizzle-orm";
import { listPlayers } from "@/data/player-repository";
import { players as playersTable } from "@/data/schema";
import { listTeams } from "@/data/team-repository";
import { createMatchesStore } from "@/state/matches-store";
import { createSquadStore } from "@/state/squad-store";
import {
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";
import { breakReads as breakMatchReads } from "../../tests/support/match-session-fixtures";
import {
  CADETE,
  breakReads,
  idOf,
  teamNames,
} from "../../tests/support/squad-fixtures";

/** Alevín A (3 players, one inactive, 2 matches) and Cadete B, listed, with Alevín A open. */
function squadWithTwoTeams() {
  const seeded = openWithTwoTeams();
  const store = createSquadStore(seeded.db);
  store.getState().loadTeams();
  store.getState().openTeam(seeded.first.teamId);
  return { ...seeded, store };
}

describe("squad store, count what a team holds", () => {
  it("RF-015: teamContents of the open team counts its 3 players, the inactive one too, and its 2 matches", () => {
    const { store, first } = squadWithTwoTeams();
    expect(store.getState().teamContents(first.teamId)).toEqual({
      players: 3,
      matches: 2,
    });
  });

  it("RF-015: teamContents of a team that is not the open one counts that team's rows only", () => {
    const { db, store, second } = squadWithTwoTeams();
    db.run(sql`DELETE FROM players WHERE id = ${second.playerIds[0] ?? 0}`);
    expect(store.getState().teamContents(second.teamId)).toEqual({
      players: 2,
      matches: 2,
    });
  });

  it("RF-015: with no team open, teamContents still counts, and a team with no players and no matches counts 0 and 0", () => {
    const { db, first } = squadWithTwoTeams();
    const store = createSquadStore(db);
    expect(store.getState().status).toBe("closed");
    expect(store.getState().teamContents(first.teamId)).toEqual({
      players: 3,
      matches: 2,
    });
    store.getState().createTeam({ ...CADETE, name: "Vacío" });
    expect(store.getState().teamContents(idOf(db, "Vacío"))).toEqual({
      players: 0,
      matches: 0,
    });
  });

  it("RF-015: teamContents of a team that does not exist is null", () => {
    const { store } = squadWithTwoTeams();
    expect(store.getState().teamContents(98765)).toBeNull();
  });

  it("RF-015: teamContents only reads: no row changes and nothing is published", () => {
    const { db, store, first, second } = squadWithTwoTeams();
    const rows = [rowsOfTeam(db, first.teamId), rowsOfTeam(db, second.teamId)];
    const before = store.getState();
    store.getState().teamContents(first.teamId);
    store.getState().teamContents(second.teamId);
    store.getState().teamContents(98765);
    expect([
      rowsOfTeam(db, first.teamId),
      rowsOfTeam(db, second.teamId),
    ]).toEqual(rows);
    expect(store.getState()).toBe(before);
  });

  it.each([["players"], ["teams"], ["matches"]] as const)(
    "RF-015 RF-085: when reading the %s table throws, teamContents throws nothing and answers null",
    (table) => {
      const { db, store, first } = squadWithTwoTeams();
      if (table === "matches") {
        breakMatchReads(db, table);
      } else {
        breakReads(db, table);
      }
      expect(() => store.getState().teamContents(first.teamId)).not.toThrow();
      expect(store.getState().teamContents(first.teamId)).toBeNull();
    },
  );
});

describe("squad store, delete a team", () => {
  it("RF-015: deleting the team that is not open saves, drops it from the list and removes its players, matches, call-up entries and marks only", () => {
    const { db, store, first, second } = squadWithTwoTeams();
    const kept = rowsOfTeam(db, first.teamId);
    expect(store.getState().deleteTeam(second.teamId)).toEqual({
      kind: "saved",
    });
    expect(teamNames(store)).toEqual(["Alevín A"]);
    expect(listTeams(db).map((t) => t.name)).toEqual(["Alevín A"]);
    expect(rowsOfTeam(db, second.teamId)).toEqual({
      team: [],
      players: [],
      matches: [],
      entries: [],
      marks: [],
    });
    expect(rowsOfTeam(db, first.teamId)).toEqual(kept);
  });

  it("RF-015: deleting the open team drops it from the list but leaves the open team, its players and its status as they were", () => {
    const { db, store, first, second } = squadWithTwoTeams();
    const open = store.getState();
    expect(store.getState().deleteTeam(first.teamId)).toEqual({
      kind: "saved",
    });
    expect(teamNames(store)).toEqual(["Cadete B"]);
    expect(store.getState().status).toBe("open");
    expect(store.getState().team).toBe(open.team);
    expect(store.getState().players).toBe(open.players);
    expect(store.getState().duplicateNumbers).toBe(open.duplicateNumbers);
    expect(rowsOfTeam(db, first.teamId).players).toEqual([]);
    expect(rowsOfTeam(db, second.teamId).players).toHaveLength(3);
  });

  it("RF-015: deleting a team with no team open saves and drops it from the list", () => {
    const { db, first } = squadWithTwoTeams();
    const store = createSquadStore(db);
    store.getState().loadTeams();
    expect(store.getState().deleteTeam(first.teamId)).toEqual({
      kind: "saved",
    });
    expect(teamNames(store)).toEqual(["Cadete B"]);
    expect(store.getState().status).toBe("closed");
  });

  it("RF-015 RF-082: a new store sees the team gone and the other one whole", () => {
    const { db, store, first, second } = squadWithTwoTeams();
    store.getState().deleteTeam(first.teamId);
    const reopened = createSquadStore(db);
    reopened.getState().loadTeams();
    expect(teamNames(reopened)).toEqual(["Cadete B"]);
    reopened.getState().openTeam(first.teamId);
    expect(reopened.getState().status).toBe("notFound");
    reopened.getState().openTeam(second.teamId);
    expect(reopened.getState().players).toHaveLength(3);
  });

  it("RF-015 RF-074 RF-075: the match lists drop the team's matches at their next load, and the other team's stay", () => {
    const { db, store, first, second } = squadWithTwoTeams();
    const matches = createMatchesStore(db);
    matches.getState().loadAll();
    expect(matches.getState().allMatches).toHaveLength(4);
    store.getState().deleteTeam(first.teamId);
    matches.getState().loadAll();
    matches.getState().loadTeam(first.teamId);
    expect(matches.getState().allMatches.map((m) => m.id)).toEqual(
      expect.arrayContaining(second.matchIds),
    );
    expect(matches.getState().allMatches).toHaveLength(2);
    expect(matches.getState().teamMatches).toEqual({
      teamId: first.teamId,
      items: [],
    });
  });
});

describe("squad store, writes on a team that was deleted while open", () => {
  function deletedOpenTeam() {
    const squad = squadWithTwoTeams();
    const players = listPlayers(squad.db, squad.first.teamId);
    squad.store.getState().deleteTeam(squad.first.teamId);
    return { ...squad, players };
  }

  it("RF-015 RF-085: addPlayer, updatePlayer and setPlayerActive on it return unchanged, write nothing and publish nothing", () => {
    const { db, store, players, first, second } = deletedOpenTeam();
    const rows = [rowsOfTeam(db, first.teamId), rowsOfTeam(db, second.teamId)];
    const before = store.getState();
    const juan = players[0]?.id ?? 0;
    expect(store.getState().addPlayer({ name: "Nuevo", number: "5" })).toEqual({
      kind: "unchanged",
    });
    expect(
      store.getState().updatePlayer(juan, { name: "Juan", number: "9" }),
    ).toEqual({ kind: "unchanged" });
    expect(store.getState().setPlayerActive(juan, false)).toEqual({
      kind: "unchanged",
    });
    expect([
      rowsOfTeam(db, first.teamId),
      rowsOfTeam(db, second.teamId),
    ]).toEqual(rows);
    expect(db.select().from(playersTable).all()).toHaveLength(3);
    expect(store.getState()).toBe(before);
  });

  it("RF-015: invalid input on it is unchanged too, and nothing is written", () => {
    const { db, store } = deletedOpenTeam();
    expect(store.getState().addPlayer({ name: "", number: "07" })).toEqual({
      kind: "unchanged",
    });
    expect(db.select().from(playersTable).all()).toHaveLength(3);
  });

  it("RF-015: once another team is opened the store writes again, and a player of the deleted team stays unreachable", () => {
    const { db, store, second, players } = deletedOpenTeam();
    store.getState().openTeam(second.teamId);
    expect(store.getState().addPlayer({ name: "Nuevo", number: "5" })).toEqual({
      kind: "saved",
    });
    expect(
      store
        .getState()
        .updatePlayer(players[0]?.id ?? 0, { name: "Juan", number: "9" }),
    ).toEqual({ kind: "unchanged" });
    expect(listPlayers(db, second.teamId)).toHaveLength(4);
  });

  it("RF-015: opening the deleted team again publishes not found, and addPlayer is unchanged", () => {
    const { store, first } = deletedOpenTeam();
    store.getState().openTeam(first.teamId);
    expect(store.getState().status).toBe("notFound");
    expect(store.getState().team).toBeNull();
    expect(store.getState().addPlayer({ name: "Nuevo", number: "5" })).toEqual({
      kind: "unchanged",
    });
  });
});
