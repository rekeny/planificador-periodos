// Fifth Codex review, finding 2 (RF-013, RF-016): the edit form and the new-player form share the
// squad store, so after team 2's form is pushed over team 1's and the coach goes Back, team 1's
// form must show team 1 (no false «No se ha encontrado») and «Guardar» must write for team 1. Real
// src/app routes and stores on the in-memory database. Typed text may be lost on leaving (RF-082),
// so no test pins it.
import { screen, waitFor } from "expo-router/testing-library";

import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { NOT_FOUND } from "../support/edit-team";
import { isFormatChosen, pressSave, typeName } from "../support/new-team-form";
import { addViaForm } from "../support/team-screen";
import {
  backToFirst,
  openThenPush,
  playerNames,
  seedBothTeams,
  squadStoreOn,
  teamRows,
  textOf,
} from "../support/team-forms-two-teams";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock("@/data/database", () =>
  jest
    .requireActual<typeof import("../support/mock-database")>(
      "../support/mock-database",
    )
    .mockDatabaseModule(),
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

beforeEach(() => {
  db = resetMockDatabase();
  seedBothTeams(db);
  useMockSquadStore(squadStoreOn(db));
});

describe("edit form, two teams in the same stack", () => {
  it("RF-013: team 1's edit form, team 2's over it and Back shows team 1's name, category and format, not a not-found", async () => {
    await openThenPush("edit", 1, 2);
    await backToFirst("edit", 1);
    await waitFor(() => expect(textOf("Nombre")).toBe("Alevín A"));
    expect(textOf("Categoría")).toBe("2015");
    expect(isFormatChosen(6)).toBe(true);
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-013: after Back, «Guardar» on team 1's edit form updates team 1 and leaves team 2 untouched", async () => {
    await openThenPush("edit", 1, 2);
    await backToFirst("edit", 1);
    await waitFor(() => expect(textOf("Nombre")).toBe("Alevín A"));
    await typeName("Alevín Z");
    await pressSave();
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(teamRows(db)).toEqual([
      ["Alevín Z", 6],
      ["Cadete B", 8],
    ]);
  });

  it("RF-013: the reverse order, team 2's edit form, team 1's over it and Back shows team 2's data and saves for team 2", async () => {
    await openThenPush("edit", 2, 1);
    await backToFirst("edit", 2);
    await waitFor(() => expect(textOf("Nombre")).toBe("Cadete B"));
    expect(textOf("Categoría")).toBe("");
    expect(isFormatChosen(8)).toBe(true);
    await typeName("Cadete Z");
    await pressSave();
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(teamRows(db)).toEqual([
      ["Alevín A", 6],
      ["Cadete Z", 8],
    ]);
  });
});

describe("new-player form, two teams in the same stack", () => {
  it("RF-016: team 1's new-player form, team 2's over it and Back shows an empty form, not a not-found", async () => {
    await openThenPush("players/new", 1, 2);
    await backToFirst("players/new", 1);
    await screen.findByLabelText("Dorsal");
    expect(textOf("Nombre")).toBe("");
    expect(textOf("Dorsal")).toBe("");
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-016: after Back, «Guardar» adds the player to team 1 and not to team 2", async () => {
    await openThenPush("players/new", 1, 2);
    await backToFirst("players/new", 1);
    await screen.findByLabelText("Dorsal");
    await addViaForm("Zoe", "12");
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(playerNames(db, 1).sort()).toEqual(["Ana", "Zoe"]);
    expect(playerNames(db, 2)).toEqual(["Eva"]);
  });

  it("RF-016: the reverse order, team 2's form, team 1's over it and Back adds the player to team 2 only", async () => {
    await openThenPush("players/new", 2, 1);
    await backToFirst("players/new", 2);
    await screen.findByLabelText("Dorsal");
    await addViaForm("Zoe", "12");
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(playerNames(db, 2).sort()).toEqual(["Eva", "Zoe"]);
    expect(playerNames(db, 1)).toEqual(["Ana"]);
  });
});
