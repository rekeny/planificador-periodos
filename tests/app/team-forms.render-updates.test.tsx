// F-03 (Codex review of 2026-11-18, M-01 of 2026-11-17): the squad store is shared by every mounted
// screen of a team, so opening a team from inside a render (a `useState` initialiser) publishes a
// store update while another component renders, and React warns «Cannot update a component while
// rendering a different component». The team is opened from the focus effect instead
// (small-change-form-team-forms-render-updates.md). Real src/app routes and stores on the in-memory
// database; the warning is read from `console.error`.
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { NOT_FOUND } from "../support/edit-team";
import {
  seedBothTeams,
  squadStoreOn,
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
let errors: jest.SpyInstance;

beforeEach(() => {
  db = resetMockDatabase();
  seedBothTeams(db);
  useMockSquadStore(squadStoreOn(db));
  errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errors.mockRestore();
});

/** The React warnings about a component updating while another one renders. */
function renderUpdateWarnings(): string[] {
  return errors.mock.calls
    .map((call) => call.map(String).join(" "))
    .filter((message) => /Cannot update a component/.test(message));
}

async function openTeamScreen(id: number): Promise<void> {
  await renderRouter("./src/app");
  await screen.findByRole("button", { name: "Nuevo equipo" });
  await testRouter.push(`/teams/${id}`);
  await screen.findByRole("button", { name: "Nuevo jugador" });
}

describe("opening a team form does not update the store while rendering (F-03)", () => {
  it("RF-013 F-03: from the team screen, the edit form of the same team opens with no React render-update warning", async () => {
    await openTeamScreen(1);
    await testRouter.push("/teams/1/edit");
    await screen.findByLabelText("Nombre");
    expect(textOf("Nombre")).toBe("Alevín A");
    expect(renderUpdateWarnings()).toEqual([]);
  });

  it("RF-016 F-03: from the team screen, the new-player form of the same team opens with no React render-update warning", async () => {
    await openTeamScreen(1);
    await testRouter.push("/teams/1/players/new");
    await screen.findByLabelText("Dorsal");
    expect(renderUpdateWarnings()).toEqual([]);
  });

  it("RF-013 F-03: the edit form of another team opens over the team screen with no warning and shows that team's data", async () => {
    await openTeamScreen(1);
    await testRouter.push("/teams/2/edit");
    await screen.findByLabelText("Nombre");
    await waitFor(() => expect(textOf("Nombre")).toBe("Cadete B"));
    expect(renderUpdateWarnings()).toEqual([]);
  });

  it("RF-014 F-03: opening the team screen itself, and the second team's screen over it, gives no warning", async () => {
    await openTeamScreen(1);
    await testRouter.push("/teams/2");
    await screen.findByRole("button", { name: "Nuevo jugador" });
    expect(renderUpdateWarnings()).toEqual([]);
  });

  it("RF-013 F-03: an unknown team still shows the not-found text and not an empty screen", async () => {
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: "Nuevo equipo" });
    await testRouter.push("/teams/99/edit");
    await screen.findByText(NOT_FOUND);
    expect(renderUpdateWarnings()).toEqual([]);
  });
});
