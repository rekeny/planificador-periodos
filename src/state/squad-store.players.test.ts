// T032: the players side of the squad store (RF-016, RF-017, RF-069, RF-085, E-020). The open team,
// its players sorted with the domain's comparePlayers and the duplicate numbers it publishes.
import { createPlayer, listPlayers } from "@/data/player-repository";
import { createTeam } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import {
  ALEVIN,
  CADETE,
  addPlayers,
  allowWrites,
  breakReads,
  failWrites,
  newSquad,
  playerLabels,
} from "../../tests/support/squad-fixtures";

function openedTeam() {
  const squad = newSquad();
  const team = createTeam(squad.db, ALEVIN);
  squad.store.getState().openTeam(team.id);
  return { ...squad, team };
}

describe("squad store, open a team", () => {
  it("RF-016: the open team publishes its players sorted by number, so 9, 4 and 7 come out as 4, 7, 9", () => {
    const { store, team } = openedTeam();
    addPlayers(store, [
      ["Iván", "9"],
      ["Dani", "4"],
      ["Sara", "7"],
    ]);
    expect(store.getState().status).toBe("open");
    expect(store.getState().team).toEqual(team);
    expect(playerLabels(store)).toEqual(["Dani 4", "Sara 7", "Iván 9"]);
  });

  it("RF-016 E-020: Luis 00, Ana 0, Eva 10, Bea 7 and Carla 0 are published as Ana 0, Carla 0, Luis 00, Bea 7, Eva 10", () => {
    const { store } = openedTeam();
    addPlayers(store, [
      ["Luis", "00"],
      ["Ana", "0"],
      ["Eva", "10"],
      ["Bea", "7"],
      ["Carla", "0"],
    ]);
    expect(playerLabels(store)).toEqual([
      "Ana 0",
      "Carla 0",
      "Luis 00",
      "Bea 7",
      "Eva 10",
    ]);
  });

  it("RF-016: opening a team that already has players publishes them sorted, and only that team's", () => {
    const { db, store } = newSquad();
    const mine = createTeam(db, ALEVIN);
    const other = createTeam(db, CADETE);
    createPlayer(db, { teamId: mine.id, name: "Zoe", number: "12" });
    createPlayer(db, { teamId: mine.id, name: "Ana", number: "3" });
    createPlayer(db, { teamId: other.id, name: "Otro", number: "1" });
    store.getState().openTeam(mine.id);
    expect(playerLabels(store)).toEqual(["Ana 3", "Zoe 12"]);
  });

  it("RF-016: a team with no players publishes an empty list and no duplicate numbers", () => {
    const { store } = openedTeam();
    expect(store.getState().players).toEqual([]);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-013 RF-016 RF-069: opening team B after team A publishes B's players and duplicates only", () => {
    const { db, store } = newSquad();
    const a = createTeam(db, ALEVIN);
    const b = createTeam(db, CADETE);
    store.getState().openTeam(a.id);
    addPlayers(store, [
      ["Ana", "7"],
      ["Eva", "7"],
    ]);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    store.getState().openTeam(b.id);
    addPlayers(store, [["Luz", "5"]]);
    expect(store.getState().team).toEqual(b);
    expect(playerLabels(store)).toEqual(["Luz 5"]);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-013: opening a team that does not exist publishes not found, with no team and no players", () => {
    const { store } = openedTeam();
    addPlayers(store, [
      ["Ana", "7"],
      ["Eva", "7"],
    ]);
    store.getState().openTeam(999);
    expect(store.getState().status).toBe("notFound");
    expect(store.getState().team).toBeNull();
    expect(store.getState().players).toEqual([]);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-013: when reading the players throws, openTeam throws nothing and publishes not found", () => {
    const { db, store } = newSquad();
    const team = createTeam(db, ALEVIN);
    breakReads(db, "players");
    expect(() => store.getState().openTeam(team.id)).not.toThrow();
    expect(store.getState().status).toBe("notFound");
    expect(store.getState().team).toBeNull();
    expect(store.getState().players).toEqual([]);
  });

  it("RF-016: a new store on the same database publishes the same players after openTeam", () => {
    const { db, store, team } = openedTeam();
    addPlayers(store, [
      ["Iván", "9"],
      ["Dani", "4"],
    ]);
    const reopened = createSquadStore(db);
    reopened.getState().openTeam(team.id);
    expect(playerLabels(reopened)).toEqual(["Dani 4", "Iván 9"]);
  });
});

describe("squad store, add a player", () => {
  it("RF-016: a valid player is saved with the name trimmed and published, and starts active", () => {
    const { db, store, team } = openedTeam();
    expect(store.getState().addPlayer({ name: " Ana ", number: "7" })).toEqual({
      kind: "saved",
    });
    expect(listPlayers(db, team.id)).toEqual([
      {
        id: expect.any(Number),
        teamId: team.id,
        name: "Ana",
        number: "7",
        isActive: true,
      },
    ]);
    expect(store.getState().players[0]).toMatchObject({
      name: "Ana",
      number: "7",
      isActive: true,
    });
  });

  it("RF-016: «0» and «00» in the same team are both saved and give no duplicate warning", () => {
    const { store } = openedTeam();
    addPlayers(store, [
      ["Ana", "0"],
      ["Luis", "00"],
    ]);
    expect(playerLabels(store)).toEqual(["Ana 0", "Luis 00"]);
    expect(store.getState().duplicateNumbers).toEqual([]);
  });

  it("RF-017 RF-069: a second player 7 is saved and published, never rejected, and the duplicate number 7 is published", () => {
    const { store } = openedTeam();
    expect(store.getState().addPlayer({ name: "Luis", number: "7" })).toEqual({
      kind: "saved",
    });
    expect(store.getState().duplicateNumbers).toEqual([]);
    expect(store.getState().addPlayer({ name: "Ana", number: "7" })).toEqual({
      kind: "saved",
    });
    expect(playerLabels(store)).toEqual(["Ana 7", "Luis 7"]);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
  });

  it("RF-017: a second player with the same name and number as an existing one is saved too", () => {
    const { db, store, team } = openedTeam();
    addPlayers(store, [
      ["Ana", "7"],
      ["Ana", "7"],
    ]);
    expect(listPlayers(db, team.id)).toHaveLength(2);
    expect(store.getState().players).toHaveLength(2);
  });

  it("RF-069: three players with 7 publish «7» once, and two pairs, 7 and 9, publish both numbers", () => {
    const { store } = openedTeam();
    addPlayers(store, [
      ["Ana", "7"],
      ["Bea", "7"],
      ["Eva", "7"],
    ]);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    addPlayers(store, [
      ["Iván", "9"],
      ["Pau", "9"],
    ]);
    expect([...store.getState().duplicateNumbers].sort()).toEqual(["7", "9"]);
  });

  it("RF-016 RF-017: a player name of 40 characters is saved", () => {
    const { db, store, team } = openedTeam();
    const name = "Ñ".repeat(40);
    expect(store.getState().addPlayer({ name, number: "5" })).toEqual({
      kind: "saved",
    });
    expect(listPlayers(db, team.id)[0]?.name).toBe(name);
  });

  it.each([
    ["", "7", ["nameRequired"]],
    ["  ", "7", ["nameRequired"]],
    ["Ana", "07", ["numberInvalid"]],
    ["Ana", "100", ["numberInvalid"]],
    ["Ana", "", ["numberInvalid"]],
    ["Ana", " 7", ["numberInvalid"]],
    ["", "07", ["nameRequired", "numberInvalid"]],
  ])(
    "RF-016 E-021: a player that is not valid gives the errors of the domain, in that order, and nothing is saved or published",
    (name, number, errors) => {
      const { db, store, team } = openedTeam();
      store.getState().addPlayer({ name: "Luis", number: "3" });
      const result = store.getState().addPlayer({ name, number });
      expect(result).toEqual({ kind: "invalid", errors });
      expect(listPlayers(db, team.id)).toHaveLength(1);
      expect(playerLabels(store)).toEqual(["Luis 3"]);
    },
  );

  it("RF-016 E-021: the numbers 0, 00, 7 and 99 are saved", () => {
    const { store } = openedTeam();
    for (const number of ["0", "00", "7", "99"]) {
      expect(
        store.getState().addPlayer({ name: `J${number}`, number }),
      ).toEqual({ kind: "saved" });
    }
    expect(store.getState().players).toHaveLength(4);
  });

  it("RF-016: with no team open, addPlayer returns unchanged, writes nothing and throws nothing", () => {
    const { db, store } = newSquad();
    const team = createTeam(db, ALEVIN);
    expect(store.getState().status).toBe("closed");
    expect(store.getState().addPlayer({ name: "Ana", number: "7" })).toEqual({
      kind: "unchanged",
    });
    expect(listPlayers(db, team.id)).toEqual([]);
    expect(store.getState().players).toEqual([]);
  });

  it("RF-016: with a team that was not found, addPlayer returns unchanged and writes nothing", () => {
    const { db, store } = newSquad();
    const team = createTeam(db, ALEVIN);
    store.getState().openTeam(999);
    expect(store.getState().addPlayer({ name: "Ana", number: "7" })).toEqual({
      kind: "unchanged",
    });
    expect(listPlayers(db, team.id)).toEqual([]);
  });

  it("RF-085: when the write fails the result is saveFailed and the players stay as they were, and the next valid player is saved", () => {
    const { db, store, team } = openedTeam();
    store.getState().addPlayer({ name: "Ana", number: "7" });
    failWrites(db, "players", "INSERT");
    expect(store.getState().addPlayer({ name: "Eva", number: "7" })).toEqual({
      kind: "saveFailed",
    });
    expect(playerLabels(store)).toEqual(["Ana 7"]);
    expect(store.getState().duplicateNumbers).toEqual([]);
    expect(listPlayers(db, team.id)).toHaveLength(1);
    allowWrites(db, "players", "INSERT");
    expect(store.getState().addPlayer({ name: "Eva", number: "7" })).toEqual({
      kind: "saved",
    });
    expect(playerLabels(store)).toEqual(["Ana 7", "Eva 7"]);
  });
});
