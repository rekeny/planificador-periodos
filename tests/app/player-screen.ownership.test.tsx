// T076, D3 rules 3 and 4: the player screen draws only the player that belongs to its own route
// parameters (team and player), opens its team again on focus when another screen took the shared
// squad store, shows «No se ha encontrado: puede que se haya borrado.» for anything else, and
// updates no shared store while rendering. Real src/app routes through renderRouter, with the
// doubles of player-screen.edit.test.tsx.
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { NOT_FOUND } from "../support/edit-team";
import { screenTexts } from "../support/screen-reading";
import { breakReads } from "../support/squad-fixtures";
import { renderUpdateWarnings } from "../support/team-matches";
import { addViaForm, typePlayerName } from "../support/team-screen";
import {
  JUAN_AND_ANA,
  deactivateDirectly,
  fieldValues,
  openPlayerAlone,
  openPlayerFromTeam,
  pressRow,
  savedRows,
  seedPlayerScreen,
} from "../support/player-screen";

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

let s: ReturnType<typeof seedPlayerScreen>;
let errors: jest.SpyInstance;

beforeEach(() => {
  s = seedPlayerScreen();
  errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errors.mockRestore());

async function expectNotFound(): Promise<void> {
  expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
  expect(screenTexts()).toEqual([NOT_FOUND]);
  expect(screen.queryByLabelText("Dorsal")).toBeNull();
  expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Desactivar" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Reactivar" })).toBeNull();
}

describe("player screen, a link that does not belong to a player of the team (D3 rule 4)", () => {
  it("RF-018: an unknown playerId shows only the not-found message and no form", async () => {
    await openPlayerAlone(s.alevin, 99);
    await expectNotFound();
    expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
  });

  it.each(["abc", "0", "01", "-1", "1.5"])(
    "RF-018: /teams/1/players/%s, a malformed playerId, shows only the not-found message",
    async (id) => {
      await openPlayerAlone(s.alevin, id);
      await expectNotFound();
    },
  );

  it.each(["abc", "0", "01"])(
    "RF-018: /teams/%s/players/<a player>, a malformed teamId, shows only the not-found message",
    async (id) => {
      await openPlayerAlone(id, s.juan);
      await expectNotFound();
    },
  );

  it("RF-018: /teams/1/players/<a player of team 2> shows only the not-found message, never that player's data, and changes nothing", async () => {
    await openPlayerAlone(s.alevin, s.bea);
    await expectNotFound();
    expect(screen.queryByDisplayValue("Bea")).toBeNull();
    expect(savedRows(s.db, s.cadete)).toEqual([
      { name: "Bea", number: "7", isActive: true },
    ]);
  });

  it("RF-018: /teams/2/players/<a player of team 1> shows only the not-found message too", async () => {
    await openPlayerAlone(s.cadete, s.juan);
    await expectNotFound();
  });

  it("RF-018 RF-085: the route of a team whose read fails shows the not-found message", async () => {
    breakReads(s.db, "teams");
    await openPlayerAlone(s.alevin, s.juan);
    await expectNotFound();
  });

  it("RF-018 RF-085: the route of a player of a team whose players cannot be read shows the not-found message", async () => {
    breakReads(s.db, "players");
    await openPlayerAlone(s.alevin, s.juan);
    await expectNotFound();
  });

  it("RF-018: a deep link to a deactivated player of the team shows its form, not the not-found message", async () => {
    deactivateDirectly(s.db, s.juan);
    await openPlayerAlone(s.alevin, s.juan);
    await screen.findByLabelText("Dorsal");
    expect(fieldValues()).toEqual({ name: "Juan", number: "7" });
  });
});

describe("player screen, another player's screen pushed on top (D3 rule 4)", () => {
  async function openJuan(): Promise<void> {
    await openPlayerFromTeam(s.alevin, "Juan");
  }

  it("RF-018: team 1's player screen, team 2's player pushed on top shows Bea, and Back shows team 1's Juan again", async () => {
    await openJuan();
    await testRouter.push(`/teams/${s.cadete}/players/${s.bea}`);
    await waitFor(() =>
      expect(fieldValues()).toEqual({ name: "Bea", number: "7" }),
    );
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.juan}`);
    await waitFor(() => expect(screen.queryByText(NOT_FOUND)).toBeNull());
    await waitFor(() =>
      expect(fieldValues()).toEqual({ name: "Juan", number: "7" }),
    );
  });

  it("RF-018: after that Back, «Guardar» saves for Juan and leaves Bea untouched", async () => {
    await openJuan();
    await testRouter.push(`/teams/${s.cadete}/players/${s.bea}`);
    await screen.findByDisplayValue("Bea");
    await testRouter.back();
    await waitFor(() => expect(screen.queryByText(NOT_FOUND)).toBeNull());
    await screen.findByDisplayValue("Juan");
    await addViaForm("Juanito", "8");
    expect(savedRows(s.db, s.alevin)[0]).toMatchObject({
      name: "Juanito",
      number: "8",
    });
    expect(savedRows(s.db, s.cadete)).toEqual([
      { name: "Bea", number: "7", isActive: true },
    ]);
  });

  it("RF-018: team 2's player screen, team 1's player pushed on top shows Juan, and Back shows Bea again", async () => {
    await openPlayerFromTeam(s.cadete, "Bea");
    await testRouter.push(`/teams/${s.alevin}/players/${s.juan}`);
    await screen.findByDisplayValue("Juan");
    await testRouter.back();
    await waitFor(() => expect(screen.queryByText(NOT_FOUND)).toBeNull());
    await waitFor(() =>
      expect(fieldValues()).toEqual({ name: "Bea", number: "7" }),
    );
  });

  it("RF-018: Juan's screen, Ana's pushed on top (same team) shows Ana, and Back shows Juan again and not Ana", async () => {
    await openJuan();
    await testRouter.push(`/teams/${s.alevin}/players/${s.ana}`);
    await waitFor(() =>
      expect(fieldValues()).toEqual({ name: "Ana", number: "4" }),
    );
    await testRouter.back();
    await waitFor(() =>
      expect(fieldValues()).toEqual({ name: "Juan", number: "7" }),
    );
  });

  it("RF-018: with text typed in Juan's screen, Ana's screen pushed on top does not take it, and its «Guardar» saves for Ana", async () => {
    await openJuan();
    await typePlayerName("Juanito");
    await testRouter.push(`/teams/${s.alevin}/players/${s.ana}`);
    await waitFor(() => expect(fieldValues().name).toBe("Ana"));
    await addViaForm("Anita", "5");
    expect(savedRows(s.db, s.alevin)).toEqual([
      { name: "Juan", number: "7", isActive: true },
      { name: "Anita", number: "5", isActive: true },
    ]);
  });
});

describe("player screen, no update of a shared store while rendering (D3 rule 3)", () => {
  it("RF-018 F-03: from the team screen to a player and back, with no React render-update warning", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await testRouter.back();
    await pressRow("Ana");
    await screen.findByDisplayValue("Ana");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-018 F-03: a deep link, a player of another team pushed on top and Back give no React render-update warning", async () => {
    await openPlayerAlone(s.alevin, s.juan);
    await screen.findByLabelText("Dorsal");
    await testRouter.push(`/teams/${s.cadete}/players/${s.bea}`);
    await screen.findByDisplayValue("Bea");
    await testRouter.back();
    await screen.findByDisplayValue("Juan");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-018 F-03: a stale link and the player of another team give no React render-update warning", async () => {
    await renderRouter("./src/app", {
      initialUrl: `/teams/${s.alevin}/players/${s.bea}`,
    });
    await screen.findByText(NOT_FOUND);
    await testRouter.push("/teams/99/players/1");
    await screen.findByText(NOT_FOUND);
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
