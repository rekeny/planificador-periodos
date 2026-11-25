// T074: deactivating and reactivating a player, and no way to delete a single player (RF-020,
// RF-021, RF-022, RF-023, RF-024). Only the flag changes: the call-up entries and marks of saved
// matches stay. Failures are real SQLite triggers.
import * as callUpRepository from "@/data/call-up-repository";
import * as playerRepository from "@/data/player-repository";
import {
  listPlayers,
  setPlayerActive,
  updatePlayer,
} from "@/data/player-repository";
import * as teamRepository from "@/data/team-repository";
import { counts, failureOf } from "../../tests/data/schema-fixtures";
import {
  failPlayerUpdates,
  openWithJuan,
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";

describe("player repository, deactivating and reactivating", () => {
  it("RF-022: deactivating returns the record, inactive, with the same name and number", () => {
    const { db, teamId, juan } = openWithJuan();
    expect(setPlayerActive(db, juan.id, false)).toEqual({
      ...juan,
      isActive: false,
    });
    expect(listPlayers(db, teamId)).toEqual([{ ...juan, isActive: false }]);
  });

  it("RF-024: reactivating returns the record, active", () => {
    const { db, teamId, juan } = openWithJuan();
    setPlayerActive(db, juan.id, false);
    expect(setPlayerActive(db, juan.id, true)).toEqual(juan);
    expect(listPlayers(db, teamId)).toEqual([juan]);
  });

  it("RF-022 RF-024: deactivate, reactivate, deactivate leaves the player inactive, each step returning its own state", () => {
    const { db, teamId, juan } = openWithJuan();
    const flags = [false, true, false].map(
      (isActive) => setPlayerActive(db, juan.id, isActive)?.isActive,
    );
    expect(flags).toEqual([false, true, false]);
    expect(listPlayers(db, teamId)).toEqual([{ ...juan, isActive: false }]);
  });

  it("RF-022 RF-024: setting the state a player already has returns the record and changes nothing", () => {
    const { db, teamId, juan } = openWithJuan();
    expect(setPlayerActive(db, juan.id, true)).toEqual(juan);
    setPlayerActive(db, juan.id, false);
    expect(setPlayerActive(db, juan.id, false)).toEqual({
      ...juan,
      isActive: false,
    });
    expect(listPlayers(db, teamId)).toHaveLength(1);
  });

  it("RF-022: deactivating the only player of a team leaves the team with its inactive player", () => {
    const { db, teamId, juan } = openWithJuan();
    setPlayerActive(db, juan.id, false);
    expect(listPlayers(db, teamId).map((p) => p.isActive)).toEqual([false]);
    expect(counts(db)).toMatchObject({ teams: 1, players: 1 });
  });

  it("RF-022 RF-024: an unknown ID returns undefined and changes nothing", () => {
    const { db, teamId, juan } = openWithJuan();
    for (const id of [juan.id + 1, 0, -1]) {
      expect(setPlayerActive(db, id, false)).toBeUndefined();
      expect(setPlayerActive(db, id, true)).toBeUndefined();
    }
    expect(listPlayers(db, teamId)).toEqual([juan]);
  });

  it("RF-022 RF-023: deactivating a player changes only that flag: call-up entries and marks of saved matches stay", () => {
    const { db, first, second } = openWithTwoTeams();
    const before = counts(db);
    const firstBefore = rowsOfTeam(db, first.teamId);
    const secondBefore = rowsOfTeam(db, second.teamId);
    setPlayerActive(db, first.playerIds[0] as number, false);
    expect(counts(db)).toEqual(before);
    expect(rowsOfTeam(db, second.teamId)).toEqual(secondBefore);
    const after = rowsOfTeam(db, first.teamId);
    expect(after.entries).toEqual(firstBefore.entries);
    expect(after.marks).toEqual(firstBefore.marks);
    expect(after.players[0]).toMatchObject({ isActive: false });
    expect(after.players.slice(1)).toEqual(firstBefore.players.slice(1));
  });

  it("RF-020 RF-022: the same player data in two teams: deactivating one leaves the other active", () => {
    const { db, first, second } = openWithTwoTeams();
    setPlayerActive(db, first.playerIds[0] as number, false);
    expect(rowsOfTeam(db, second.teamId).players[0]).toMatchObject({
      name: "Juan",
      number: "7",
      isActive: true,
    });
  });

  it("RF-018 RF-024: an edit made while deactivated survives the reactivation", () => {
    const { db, juan } = openWithJuan();
    setPlayerActive(db, juan.id, false);
    updatePlayer(db, juan.id, { name: "Juan", number: "9" });
    expect(setPlayerActive(db, juan.id, true)).toEqual({
      ...juan,
      number: "9",
    });
  });

  it("RF-022 RF-082: a write that fails throws and leaves the flag as it was", () => {
    const { db, teamId, juan } = openWithJuan();
    failPlayerUpdates(db);
    expect(failureOf(() => setPlayerActive(db, juan.id, false))).toMatch(
      /disk full/,
    );
    expect(listPlayers(db, teamId)).toEqual([juan]);
  });
});

describe("player repository, no deleting of a single player", () => {
  it("RF-021: no repository module exports a function that deletes or removes a player", () => {
    const modules = [playerRepository, teamRepository, callUpRepository];
    const names = modules.flatMap((module) => Object.keys(module));
    expect(names).not.toContain("deletePlayer");
    expect(names).not.toContain("removePlayer");
    expect(
      names.filter((name) => /(delete|remove).*player/i.test(name)),
    ).toEqual([]);
  });
});
