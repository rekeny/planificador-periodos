// T032: the teams side of the squad store (RF-013, RF-014, RF-073, RF-085). The store runs on a
// migrated in-memory database with the real repositories and the real domain; failures are made
// with SQLite triggers (tests/support/squad-fixtures.ts), so nothing is mocked.
import { listTeams } from "@/data/team-repository";
import { NEW_TEAM_DEFAULT_FORMAT } from "@/state/format-options";
import { createSquadStore } from "@/state/squad-store";
import {
  ALEVIN,
  CADETE,
  allowWrites,
  breakReads,
  failWrites,
  idOf,
  newSquad,
  teamNames,
} from "../../tests/support/squad-fixtures";

const FORTY = "Ñandú «Águila» 🏀 ".padEnd(40, "é").slice(0, 40);

describe("squad store, create a team", () => {
  it("RF-013 RF-014 RF-073: creating two teams saves both and publishes them sorted, «Alevín A» first", () => {
    const { db, store } = newSquad();
    expect(store.getState().createTeam(CADETE)).toEqual({ kind: "saved" });
    expect(store.getState().createTeam(ALEVIN)).toEqual({ kind: "saved" });
    expect(teamNames(store)).toEqual(["Alevín A", "Cadete B"]);
    expect(listTeams(db)).toHaveLength(2);
    expect(store.getState().teams[0]).toEqual({
      id: expect.any(Number),
      ...ALEVIN,
    });
  });

  it("RF-073: the published order is Spanish alphabetical, «Ñandú» after «Nuño» and «álvaro» next to «Alba»", () => {
    const { store } = newSquad();
    for (const name of ["Ñandú", "Zeta", "álvaro", "Nuño", "Alba"]) {
      store.getState().createTeam({ ...ALEVIN, name });
    }
    expect(teamNames(store)).toEqual([
      "Alba",
      "álvaro",
      "Nuño",
      "Ñandú",
      "Zeta",
    ]);
  });

  it("RF-014: two teams with the same name are both saved and both published", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    expect(store.getState().createTeam(ALEVIN)).toEqual({ kind: "saved" });
    expect(teamNames(store)).toEqual(["Alevín A", "Alevín A"]);
    expect(listTeams(db)).toHaveLength(2);
  });

  it("RF-013 RF-085: the default format chosen in the form is saved: 8 gives 8, and the form's own default gives 6", () => {
    const { db, store } = newSquad();
    store.getState().createTeam({ ...ALEVIN, name: "Ocho", defaultFormat: 8 });
    store.getState().createTeam({
      ...ALEVIN,
      name: "Seis",
      defaultFormat: NEW_TEAM_DEFAULT_FORMAT,
    });
    const saved = listTeams(db).map((t) => [t.name, t.defaultFormat]);
    expect(saved).toEqual([
      ["Ocho", 8],
      ["Seis", 6],
    ]);
    const published = store.getState().teams.map((t) => t.defaultFormat);
    expect(published).toEqual([8, 6]);
  });

  it("RF-013: a name and a category of 40 characters are saved unchanged", () => {
    const { db, store } = newSquad();
    const result = store
      .getState()
      .createTeam({ name: FORTY, category: FORTY, defaultFormat: 4 });
    expect(result).toEqual({ kind: "saved" });
    expect(listTeams(db)[0]).toMatchObject({ name: FORTY, category: FORTY });
  });

  it("RF-013: names and category are saved trimmed, and an empty or spaces-only category as null, never as text", () => {
    const { db, store } = newSquad();
    store
      .getState()
      .createTeam({ name: " Alevín A ", category: "  ", defaultFormat: 6 });
    store
      .getState()
      .createTeam({ name: "Benjamín", category: "", defaultFormat: 6 });
    store
      .getState()
      .createTeam({ name: "Cadete", category: " 2015 ", defaultFormat: 6 });
    store
      .getState()
      .createTeam({ name: "Infantil", category: null, defaultFormat: 6 });
    const saved = listTeams(db).map((t) => [t.name, t.category]);
    expect(saved).toEqual([
      ["Alevín A", null],
      ["Benjamín", null],
      ["Cadete", "2015"],
      ["Infantil", null],
    ]);
    expect(store.getState().teams.map((t) => t.category)).toEqual([
      null,
      null,
      "2015",
      null,
    ]);
  });

  it.each([[""], ["   "], ["\t\n "]])(
    "RF-013 RF-085: a blank team name is invalid with nameRequired and nothing is saved or published",
    (name) => {
      const { db, store } = newSquad();
      store.getState().createTeam(ALEVIN);
      const result = store.getState().createTeam({ ...CADETE, name });
      expect(result).toEqual({ kind: "invalid", errors: ["nameRequired"] });
      expect(listTeams(db)).toHaveLength(1);
      expect(teamNames(store)).toEqual(["Alevín A"]);
    },
  );

  it("RF-085: when the write fails the result is saveFailed and the list stays as it was, and the next valid save works", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    failWrites(db, "teams", "INSERT");
    expect(store.getState().createTeam(CADETE)).toEqual({ kind: "saveFailed" });
    expect(teamNames(store)).toEqual(["Alevín A"]);
    expect(listTeams(db)).toHaveLength(1);
    allowWrites(db, "teams", "INSERT");
    expect(store.getState().createTeam(CADETE)).toEqual({ kind: "saved" });
    expect(teamNames(store)).toEqual(["Alevín A", "Cadete B"]);
  });
});

describe("squad store, edit a team", () => {
  it("RF-013 RF-073: renaming «Alevín A» to «Zaragoza» saves it and moves it last at once", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    store.getState().createTeam(CADETE);
    const id = idOf(db, "Alevín A");
    const result = store
      .getState()
      .updateTeam(id, { ...ALEVIN, name: " Zaragoza ", category: " " });
    expect(result).toEqual({ kind: "saved" });
    expect(teamNames(store)).toEqual(["Cadete B", "Zaragoza"]);
    expect(listTeams(db).find((t) => t.id === id)).toMatchObject({
      name: "Zaragoza",
      category: null,
    });
  });

  it("RF-013 RF-085: changing the default format 6 to 8 is saved and published", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    const id = idOf(db, "Alevín A");
    expect(
      store.getState().updateTeam(id, { ...ALEVIN, defaultFormat: 8 }),
    ).toEqual({ kind: "saved" });
    expect(listTeams(db)[0]?.defaultFormat).toBe(8);
    expect(store.getState().teams[0]?.defaultFormat).toBe(8);
  });

  it("RF-013: editing with a blank name is invalid and the team stays as it was", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    const result = store
      .getState()
      .updateTeam(idOf(db, "Alevín A"), { ...ALEVIN, name: "  " });
    expect(result).toEqual({ kind: "invalid", errors: ["nameRequired"] });
    expect(teamNames(store)).toEqual(["Alevín A"]);
    expect(listTeams(db)[0]?.name).toBe("Alevín A");
  });

  it("RF-085: editing a team that does not exist is saveFailed and the list is unchanged", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    expect(store.getState().updateTeam(999, CADETE)).toEqual({
      kind: "saveFailed",
    });
    expect(teamNames(store)).toEqual(["Alevín A"]);
    expect(listTeams(db)).toHaveLength(1);
  });

  it("RF-085: when the write fails the edit is saveFailed, nothing changes, and the next valid edit works", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    const id = idOf(db, "Alevín A");
    failWrites(db, "teams", "UPDATE");
    expect(store.getState().updateTeam(id, CADETE)).toEqual({
      kind: "saveFailed",
    });
    expect(teamNames(store)).toEqual(["Alevín A"]);
    expect(listTeams(db)[0]).toMatchObject({
      name: "Alevín A",
      defaultFormat: 6,
    });
    allowWrites(db, "teams", "UPDATE");
    expect(store.getState().updateTeam(id, CADETE)).toEqual({ kind: "saved" });
    expect(teamNames(store)).toEqual(["Cadete B"]);
  });
});

describe("squad store, load the teams", () => {
  it("RF-013 RF-073: a new store on the same database publishes the same teams, sorted, after loadTeams", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(CADETE);
    store.getState().createTeam(ALEVIN);
    const reopened = createSquadStore(db);
    reopened.getState().loadTeams();
    expect(teamNames(reopened)).toEqual(["Alevín A", "Cadete B"]);
    expect(reopened.getState().teams).toEqual(store.getState().teams);
  });

  it("RF-014: with no team in the database loadTeams publishes an empty list", () => {
    const { store } = newSquad();
    store.getState().loadTeams();
    expect(store.getState().teams).toEqual([]);
  });

  it("RF-014: when reading the teams throws, loadTeams throws nothing and publishes an empty list", () => {
    const { db, store } = newSquad();
    store.getState().createTeam(ALEVIN);
    expect(teamNames(store)).toEqual(["Alevín A"]);
    breakReads(db, "teams");
    expect(() => store.getState().loadTeams()).not.toThrow();
    expect(store.getState().teams).toEqual([]);
  });
});
