// Small change "team screen actions" (RF-013, RF-016, RF-025, RF-012): «Editar» leaves the row of
// actions and becomes a header item with the accessible label «Editar equipo»; «Nuevo partido» and
// «Nuevo jugador» stay in the body. Real src/app routes through renderRouter, with the doubles of
// team-screen.test.tsx. Jest has no native header: a header item sits under the host element
// "RNSScreenStackHeaderConfig", which `inHeader()` looks for. The key `teams.edit` does not exist yet.
import { fireEvent, screen } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { presentations } from "../support/screen-presentation";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN } from "../support/squad-fixtures";
import { inHeader } from "../support/match-screen-grid";
import { freshDraft } from "../support/new-match-form";
import { openTeamAlone, seedTeam } from "../support/team-screen";

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

let alevin: number;

beforeEach(() => {
  const db = resetMockDatabase();
  alevin = seedTeam(db, ALEVIN, [["Ana", "4"]]);
  useMockSquadStore(createSquadStore(db));
  freshDraft(db);
});

describe("team screen, the edit action in the header", () => {
  it("RF-013 RF-016: «Editar equipo» is a button in the header, once", async () => {
    await openTeamAlone(alevin);
    const found = screen.getAllByRole("button", { name: "Editar equipo" });
    expect(found).toHaveLength(1);
    expect(found[0] === undefined ? false : inHeader(found[0])).toBe(true);
  });

  it("RF-013 RF-016: no button with the text «Editar» remains in the body", async () => {
    await openTeamAlone(alevin);
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByText("Editar")).toBeNull();
  });

  it("RF-013 RF-016: pressing «Editar equipo» in the header opens the edit modal with the saved data", async () => {
    await openTeamAlone(alevin);
    await fireEvent.press(
      screen.getByRole("button", { name: "Editar equipo" }),
    );
    expect(await screen.findByLabelText("Nombre")).toHaveDisplayValue(
      "Alevín A",
    );
    expect(screen).toHavePathname(`/teams/${alevin}/edit`);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-013 RF-012: es.json holds «Editar equipo» in teams.edit and keeps «Editar» in common.edit", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.teams?.edit).toBe("Editar equipo");
    expect(texts.common?.edit).toBe("Editar");
  });
});

describe("team screen, the two actions in the body", () => {
  it.each(["Nuevo partido", "Nuevo jugador"])(
    "RF-025 RF-016: «%s» is a button in the body and not in the header, once",
    async (name) => {
      await openTeamAlone(alevin);
      const found = screen.getAllByRole("button", { name });
      expect(found).toHaveLength(1);
      expect(found[0] === undefined ? true : inHeader(found[0])).toBe(false);
    },
  );

  it("RF-025: «Nuevo partido» opens the new-match modal of that team", async () => {
    await openTeamAlone(alevin);
    await fireEvent.press(
      screen.getByRole("button", { name: "Nuevo partido" }),
    );
    expect(await screen.findByLabelText("Local")).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}/matches/new`);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-016: «Nuevo jugador» opens the new-player modal of that team", async () => {
    await openTeamAlone(alevin);
    await fireEvent.press(
      screen.getByRole("button", { name: "Nuevo jugador" }),
    );
    expect(await screen.findByLabelText("Dorsal")).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}/players/new`);
    expect(presentations()).toEqual(["push", "modal"]);
  });
});
