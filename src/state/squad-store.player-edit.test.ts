// T075: editing a player in the squad store (RF-018, RF-019, RF-069, RF-082, RF-085, E-018).
// `updatePlayer(playerId, input)` validates like RF-016, saves the normalised value and republishes
// the open team's players and duplicate numbers. It acts only on a player of the open team. The
// store runs on the real in-memory database; failures are in squad-store.squad.failures.test.ts.
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

/** The open team «Alevín A» with Juan 7, Ana 8 and Eva 10 added as the coach would. */
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

describe("squad store, edit a player", () => {
  it("RF-018 E-018: renaming Juan «Juan Pérez» and renumbering him 9 saves it trimmed, republishes the players sorted and keeps him active", () => {
    const { db, store, team } = openedSquad();
    const juan = playerId(store, "Juan");
    expect(
      store
        .getState()
        .updatePlayer(juan, { name: " Juan Pérez ", number: "9" }),
    ).toEqual({ kind: "saved" });
    expect(playerLabels(store)).toEqual(["Ana 8", "Juan Pérez 9", "Eva 10"]);
    expect(listPlayers(db, team.id).find((p) => p.id === juan)).toEqual({
      id: juan,
      teamId: team.id,
      name: "Juan Pérez",
      number: "9",
      isActive: true,
    });
    expect(listPlayers(db, team.id)).toHaveLength(3);
  });

  it("RF-018: changing only the name keeps the number, and changing only the number keeps the name", () => {
    const { store } = openedSquad();
    const ana = playerId(store, "Ana");
    store.getState().updatePlayer(ana, { name: "Anita", number: "8" });
    expect(playerLabels(store)).toEqual(["Juan 7", "Anita 8", "Eva 10"]);
    store.getState().updatePlayer(ana, { name: "Anita", number: "3" });
    expect(playerLabels(store)).toEqual(["Anita 3", "Juan 7", "Eva 10"]);
  });

  it("RF-018: the other players of the team are not touched by an edit", () => {
    const { db, store, team } = openedSquad();
    const before = listPlayers(db, team.id).filter((p) => p.name !== "Juan");
    store.getState().updatePlayer(playerId(store, "Juan"), {
      name: "Juanito",
      number: "99",
    });
    expect(
      listPlayers(db, team.id).filter((p) => p.name !== "Juanito"),
    ).toEqual(before);
  });

  it("RF-018 RF-017: giving Juan the number Ana has is saved, never rejected, and the duplicate number is published", () => {
    const { store } = openedSquad();
    expect(
      store
        .getState()
        .updatePlayer(playerId(store, "Juan"), { name: "Juan", number: "8" }),
    ).toEqual({ kind: "saved" });
    expect(store.getState().duplicateNumbers).toEqual(["8"]);
  });

  it("RF-018 RF-069: Juan 7 and Ana 8 swap numbers in two edits, and no duplicate number is published at the end", () => {
    const { store } = openedSquad();
    const juan = playerId(store, "Juan");
    const ana = playerId(store, "Ana");
    store.getState().updatePlayer(juan, { name: "Juan", number: "8" });
    store.getState().updatePlayer(ana, { name: "Ana", number: "7" });
    expect(playerLabels(store)).toEqual(["Ana 7", "Juan 8", "Eva 10"]);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it.each([["0"], ["00"], ["9"], ["10"], ["99"]])(
    "RF-018 E-021: the number «%s» is saved",
    (number) => {
      const { db, store, team } = openedSquad();
      const juan = playerId(store, "Juan");
      expect(
        store.getState().updatePlayer(juan, { name: "Juan", number }),
      ).toEqual({ kind: "saved" });
      expect(listPlayers(db, team.id).find((p) => p.id === juan)?.number).toBe(
        number,
      );
    },
  );

  it("RF-018: a name of 40 characters is saved", () => {
    const { db, store, team } = openedSquad();
    const name = "Ñ".repeat(40);
    const juan = playerId(store, "Juan");
    expect(store.getState().updatePlayer(juan, { name, number: "7" })).toEqual({
      kind: "saved",
    });
    expect(listPlayers(db, team.id).find((p) => p.id === juan)?.name).toBe(
      name,
    );
  });

  it.each([
    ["Juan", "07", ["numberInvalid"]],
    ["Juan", "100", ["numberInvalid"]],
    ["Juan", "", ["numberInvalid"]],
    ["Juan", " 7", ["numberInvalid"]],
    ["", "7", ["nameRequired"]],
    ["   ", "7", ["nameRequired"]],
    ["", "07", ["nameRequired", "numberInvalid"]],
  ])(
    "RF-018 E-021: editing Juan to «%s» and «%s» gives the domain's errors and saves and publishes nothing",
    (name, number, errors) => {
      const { db, store, team } = openedSquad();
      const juan = playerId(store, "Juan");
      const saved = listPlayers(db, team.id);
      const before = store.getState();
      expect(store.getState().updatePlayer(juan, { name, number })).toEqual({
        kind: "invalid",
        errors,
      });
      expect(listPlayers(db, team.id)).toEqual(saved);
      expect(store.getState()).toBe(before);
    },
  );

  it("RF-018: a new store on the same database, with the team opened, shows the new name and number", () => {
    const { db, store, team } = openedSquad();
    store.getState().updatePlayer(playerId(store, "Juan"), {
      name: "Juan Pérez",
      number: "9",
    });
    const reopened = createSquadStore(db);
    reopened.getState().openTeam(team.id);
    expect(playerLabels(reopened)).toEqual(["Ana 8", "Juan Pérez 9", "Eva 10"]);
  });
});

describe("squad store, edit a player that is not of the open team", () => {
  it("RF-018: with no team open, updatePlayer returns unchanged and writes nothing", () => {
    const { db, store, team } = openedSquad();
    const juan = playerId(store, "Juan");
    const closed = createSquadStore(db);
    expect(closed.getState().status).toBe("closed");
    expect(
      closed.getState().updatePlayer(juan, { name: "Otro", number: "1" }),
    ).toEqual({ kind: "unchanged" });
    expect(listPlayers(db, team.id).map((p) => p.name)).toContain("Juan");
  });

  it("RF-018: with a team that was not found, updatePlayer returns unchanged and writes nothing", () => {
    const { db, store, team } = openedSquad();
    const juan = playerId(store, "Juan");
    store.getState().openTeam(999);
    expect(store.getState().status).toBe("notFound");
    expect(
      store.getState().updatePlayer(juan, { name: "Otro", number: "1" }),
    ).toEqual({ kind: "unchanged" });
    expect(listPlayers(db, team.id).map((p) => p.name)).toContain("Juan");
  });

  it("RF-018: an unknown player ID is unchanged: nothing is written and nothing is published", () => {
    const { db, store, team } = openedSquad();
    const saved = listPlayers(db, team.id);
    const before = store.getState();
    expect(
      store.getState().updatePlayer(98765, { name: "Otro", number: "1" }),
    ).toEqual({ kind: "unchanged" });
    expect(listPlayers(db, team.id)).toEqual(saved);
    expect(store.getState()).toBe(before);
  });

  it("RF-018: a player of another team is unchanged: the other team keeps its data and the open team's list does not change", () => {
    const { db, store } = openedSquad();
    const other = createTeam(db, CADETE);
    const stranger = createPlayer(db, {
      teamId: other.id,
      name: "Luz",
      number: "5",
    });
    const before = store.getState();
    expect(
      store.getState().updatePlayer(stranger.id, { name: "Otra", number: "6" }),
    ).toEqual({ kind: "unchanged" });
    expect(listPlayers(db, other.id)).toEqual([stranger]);
    expect(store.getState()).toBe(before);
  });

  it("RF-018: after opening team B, a player of team A is unchanged and a player of team B is saved", () => {
    const { db, store } = openedSquad();
    const juan = playerId(store, "Juan");
    const other = createTeam(db, CADETE);
    const luz = createPlayer(db, {
      teamId: other.id,
      name: "Luz",
      number: "5",
    });
    store.getState().openTeam(other.id);
    expect(
      store.getState().updatePlayer(juan, { name: "Otro", number: "1" }),
    ).toEqual({ kind: "unchanged" });
    expect(
      store.getState().updatePlayer(luz.id, { name: "Luz M", number: "6" }),
    ).toEqual({ kind: "saved" });
    expect(playerLabels(store)).toEqual(["Luz M 6"]);
  });
});
