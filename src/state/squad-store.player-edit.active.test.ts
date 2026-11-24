// T075: deactivating and reactivating a player in the squad store (RF-021, RF-022, RF-023, RF-024,
// RF-069, RF-082). `setPlayerActive(playerId, isActive)` saves at once, republishes the open
// team's players and duplicate numbers, and acts only on a player of the open team. Deactivated
// players leave the duplicate warning (RF-069). Failures are in squad-store.squad.failures.test.ts.
import { createPlayer, listPlayers } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import type { SquadStore } from "../../tests/support/squad-fixtures";
import {
  ALEVIN,
  CADETE,
  addPlayers,
  newSquad,
  playerLabels,
} from "../../tests/support/squad-fixtures";

function playerId(store: SquadStore, name: string): number {
  const found = store.getState().players.find((p) => p.name === name);
  if (found === undefined) {
    throw new Error(`The open team has no player named ${name}`);
  }
  return found.id;
}

function activeOf(store: SquadStore, name: string): boolean | undefined {
  return store.getState().players.find((p) => p.name === name)?.isActive;
}

/** The open team with Juan 7, Ana 8 and Eva 10. */
function openedSquad() {
  const squad = newSquad();
  const team = createTeam(squad.db, ALEVIN);
  squad.store.getState().openTeam(team.id);
  addPlayers(squad.store, [
    ["Juan", "7"],
    ["Ana", "8"],
    ["Eva", "10"],
  ]);
  return { ...squad, team };
}

/** The open team with Juan and Ana both wearing 7. */
function twoSevens() {
  const squad = newSquad();
  const team = createTeam(squad.db, ALEVIN);
  squad.store.getState().openTeam(team.id);
  addPlayers(squad.store, [
    ["Juan", "7"],
    ["Ana", "7"],
  ]);
  return { ...squad, team };
}

describe("squad store, deactivate and reactivate a player", () => {
  it("RF-022 RF-082: deactivating Ana saves at once and publishes her as deactivated, still in the list and in her place", () => {
    const { db, store, team } = openedSquad();
    const ana = playerId(store, "Ana");
    expect(store.getState().setPlayerActive(ana, false)).toEqual({
      kind: "saved",
    });
    expect(activeOf(store, "Ana")).toBe(false);
    expect(playerLabels(store)).toEqual(["Juan 7", "Ana 8", "Eva 10"]);
    expect(listPlayers(db, team.id).map((p) => [p.name, p.isActive])).toEqual([
      ["Juan", true],
      ["Ana", false],
      ["Eva", true],
    ]);
  });

  it("RF-024 RF-082: reactivating Ana saves at once and publishes her as active again", () => {
    const { db, store, team } = openedSquad();
    const ana = playerId(store, "Ana");
    store.getState().setPlayerActive(ana, false);
    expect(store.getState().setPlayerActive(ana, true)).toEqual({
      kind: "saved",
    });
    expect(activeOf(store, "Ana")).toBe(true);
    expect(listPlayers(db, team.id).every((p) => p.isActive)).toBe(true);
  });

  it("RF-022: deactivating changes only is_active: name and number stay, and the other players stay active", () => {
    const { db, store, team } = openedSquad();
    const before = listPlayers(db, team.id);
    store.getState().setPlayerActive(playerId(store, "Ana"), false);
    expect(listPlayers(db, team.id)).toEqual(
      before.map((p) => (p.name === "Ana" ? { ...p, isActive: false } : p)),
    );
  });

  it("RF-021: the store has no action that deletes a single player", () => {
    const { store } = openedSquad();
    const names = Object.keys(store.getState());
    expect(
      names.filter((key) => /(delete|remove|drop).*player/i.test(key)),
    ).toEqual([]);
    expect(names).toEqual(
      expect.arrayContaining(["addPlayer", "updatePlayer", "setPlayerActive"]),
    );
  });

  it("RF-022: a deactivated player can still be edited, and stays deactivated", () => {
    const { store } = openedSquad();
    const ana = playerId(store, "Ana");
    store.getState().setPlayerActive(ana, false);
    expect(
      store.getState().updatePlayer(ana, { name: "Anita", number: "4" }),
    ).toEqual({ kind: "saved" });
    expect(activeOf(store, "Anita")).toBe(false);
    expect(playerLabels(store)).toEqual(["Anita 4", "Juan 7", "Eva 10"]);
  });

  it("RF-022 RF-024: a new store on the same database sees the deactivation, and then the reactivation", () => {
    const { db, store, team } = openedSquad();
    const ana = playerId(store, "Ana");
    store.getState().setPlayerActive(ana, false);
    const reopened = createSquadStore(db);
    reopened.getState().openTeam(team.id);
    expect(activeOf(reopened, "Ana")).toBe(false);
    store.getState().setPlayerActive(ana, true);
    const again = createSquadStore(db);
    again.getState().openTeam(team.id);
    expect(activeOf(again, "Ana")).toBe(true);
  });
});

describe("squad store, deactivated players and the duplicate numbers", () => {
  it("RF-069: Juan and Ana both 7 publish [«7»]; Juan to 8 publishes none; both 7 again and Ana deactivated publish none", () => {
    const { store } = twoSevens();
    const juan = playerId(store, "Juan");
    const ana = playerId(store, "Ana");
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    store.getState().updatePlayer(juan, { name: "Juan", number: "8" });
    expect(store.getState().duplicateNumbers).toEqual([]);
    store.getState().updatePlayer(juan, { name: "Juan", number: "7" });
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    store.getState().setPlayerActive(ana, false);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-069 RF-024: reactivating Ana brings the duplicate number 7 back", () => {
    const { store } = twoSevens();
    const ana = playerId(store, "Ana");
    store.getState().setPlayerActive(ana, false);
    expect(store.getState().duplicateNumbers).toEqual([]);
    store.getState().setPlayerActive(ana, true);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
  });

  it("RF-069: with three players 7, deactivating one still leaves the duplicate and deactivating a second clears it", () => {
    const { store } = openedSquad();
    addPlayers(store, [
      ["Bea", "7"],
      ["Pau", "7"],
    ]);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    store.getState().setPlayerActive(playerId(store, "Bea"), false);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    store.getState().setPlayerActive(playerId(store, "Pau"), false);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-069: editing a deactivated player to the number of an active one gives no warning, until she is reactivated", () => {
    const { store } = openedSquad();
    const ana = playerId(store, "Ana");
    store.getState().setPlayerActive(ana, false);
    store.getState().updatePlayer(ana, { name: "Ana", number: "7" });
    expect(store.getState().duplicateNumbers).toEqual([]);
    store.getState().setPlayerActive(ana, true);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
  });
});

describe("squad store, setPlayerActive on a player that is not of the open team", () => {
  it("RF-022: with no team open, it returns unchanged and writes nothing", () => {
    const { db, store, team } = openedSquad();
    const juan = playerId(store, "Juan");
    const closed = createSquadStore(db);
    expect(closed.getState().setPlayerActive(juan, false)).toEqual({
      kind: "unchanged",
    });
    expect(listPlayers(db, team.id).every((p) => p.isActive)).toBe(true);
  });

  it("RF-022: with a team that was not found, it returns unchanged and writes nothing", () => {
    const { db, store, team } = openedSquad();
    const juan = playerId(store, "Juan");
    store.getState().openTeam(999);
    expect(store.getState().setPlayerActive(juan, false)).toEqual({
      kind: "unchanged",
    });
    expect(listPlayers(db, team.id).every((p) => p.isActive)).toBe(true);
  });

  it("RF-022: an unknown player ID is unchanged and nothing is published", () => {
    const { store } = openedSquad();
    const before = store.getState();
    expect(store.getState().setPlayerActive(98765, false)).toEqual({
      kind: "unchanged",
    });
    expect(store.getState()).toBe(before);
  });

  it("RF-022: a player of another team is unchanged: she stays active and the open team's list does not change", () => {
    const { db, store } = openedSquad();
    const other = createTeam(db, CADETE);
    const stranger = createPlayer(db, {
      teamId: other.id,
      name: "Luz",
      number: "5",
    });
    const before = store.getState();
    expect(store.getState().setPlayerActive(stranger.id, false)).toEqual({
      kind: "unchanged",
    });
    expect(listPlayers(db, other.id)).toEqual([stranger]);
    expect(store.getState()).toBe(before);
  });
});
