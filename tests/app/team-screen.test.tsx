// T035: opening the team screen, its header and its links (RF-016, RF-012, RF-014, RF-085). Real
// src/app routes through renderRouter, with the doubles of the T034 tests: expo-splash-screen,
// initializeDatabase and the squad store of `@/state/app-stores` (a real store on the in-memory
// database). The routes `/teams/[teamId]` and `/teams/[teamId]/players/new` do not exist yet.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { presentations } from "../support/screen-presentation";
import { screenTexts } from "../support/screen-reading";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN, CADETE, breakReads } from "../support/squad-fixtures";
import { NOT_FOUND, deleteTeamDirectly } from "../support/edit-team";
import { pressSave, typeName } from "../support/new-team-form";
import {
  headerTitles,
  openTeamAlone,
  playerOrder,
  seedTeam,
} from "../support/team-screen";

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

const BAD_IDS = ["abc", "0", "-1", "1.5", "01", "1e3", "99"];
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let alevin: number;
let cadete: number;

// The app's own store starts empty, like a fresh start: teams and players are in the database.
beforeEach(() => {
  db = resetMockDatabase();
  alevin = seedTeam(db, ALEVIN, [
    ["Luis", "9"],
    ["Ana", "4"],
  ]);
  cadete = seedTeam(db, CADETE, [["Bea", "7"]]);
  useMockSquadStore(createSquadStore(db));
});

describe("team screen, opening it from the list", () => {
  it("RF-016 RF-014: tapping «Alevín A» in the list opens its screen with its players and no other team's", async () => {
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(screen.getByText("Luis")).toBeTruthy();
    expect(screen.queryByText("Bea")).toBeNull();
  });

  it("RF-016: going back to the list and tapping «Cadete B» shows only its players", async () => {
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    await screen.findByText("Ana");
    await testRouter.back();
    await fireEvent.press(await screen.findByText("Cadete B"));
    expect(await screen.findByText("Bea")).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${cadete}`);
    expect(screen.queryByText("Ana")).toBeNull();
    expect(screen.queryByText("Luis")).toBeNull();
  });

  it("RF-014 RF-016: two teams with the same name each open their own players", async () => {
    seedTeam(db, { ...ALEVIN, category: "2016" }, [["Eva", "3"]]);
    await renderRouter("./src/app");
    const rows = await screen.findAllByText("Alevín A");
    expect(rows).toHaveLength(2);
    await fireEvent.press(rows[1] as (typeof rows)[number]);
    expect(await screen.findByText("Eva")).toBeTruthy();
    expect(screen.queryByText("Ana")).toBeNull();
  });
});

describe("team screen, header and links", () => {
  it("RF-016: the header shows the team's name and the screen is a normal push", async () => {
    await openTeamAlone(alevin);
    await waitFor(() => expect(headerTitles()).toEqual(["Alevín A"]));
    expect(presentations()).toEqual(["push"]);
  });

  it("RF-016 RF-012: the screen has the buttons «Editar» and «Nuevo jugador» and the players", async () => {
    await openTeamAlone(alevin);
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nuevo jugador" })).toBeTruthy();
    expect(playerOrder()).toBe("4 Ana 9 Luis");
  });

  it("RF-012: es.json holds the texts of the team screen and of the new-player form", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.team?.players).toBe("Jugadores");
    expect(texts.players?.new).toBe("Nuevo jugador");
    expect(texts.common?.edit).toBe("Editar");
    expect(texts.warning?.duplicateNumber).toBe(
      "Hay jugadores con el mismo dorsal: {{numbers}}.",
    );
    expect(texts.validation?.numberInvalid).toBe(
      "El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.",
    );
    const fields = (texts.player?.field ?? {}) as Record<string, unknown>;
    expect(fields.name).toBe("Nombre");
    expect(fields.number).toBe("Dorsal");
  });

  it("RF-013 RF-016: «Editar» opens the edit modal of that team with its saved data", async () => {
    await openTeamAlone(alevin);
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByLabelText("Nombre")).toHaveDisplayValue(
      "Alevín A",
    );
    expect(screen).toHavePathname(`/teams/${alevin}/edit`);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-013 RF-016: after editing the name from the team screen, its header and its players are the new ones", async () => {
    await openTeamAlone(alevin);
    await fireEvent.press(screen.getByRole("button", { name: "Editar" }));
    await screen.findByLabelText("Nombre");
    await typeName("Alevín B");
    await pressSave();
    await waitFor(() => expect(headerTitles()).toEqual(["Alevín B"]));
    expect(screen).toHavePathname(`/teams/${alevin}`);
    expect(playerOrder()).toBe("4 Ana 9 Luis");
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

describe("team screen, a team that cannot be shown", () => {
  it.each(BAD_IDS)(
    "RF-016 RF-085: /teams/%s shows only «No se ha encontrado: puede que se haya borrado.», with no button",
    async (id) => {
      await renderRouter("./src/app", { initialUrl: `/teams/${id}` });
      expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
      expect(screenTexts()).toEqual([NOT_FOUND]);
      expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Nuevo jugador" }),
      ).toBeNull();
    },
  );

  it("RF-016: the id of a team deleted directly in the database shows the not-found message", async () => {
    deleteTeamDirectly(db, alevin);
    await renderRouter("./src/app", { initialUrl: `/teams/${alevin}` });
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screenTexts()).toEqual([NOT_FOUND]);
  });

  it("RF-016: a team deleted after it was shown once shows the not-found message the next time", async () => {
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    await screen.findByText("Ana");
    await testRouter.back();
    deleteTeamDirectly(db, alevin);
    await testRouter.push(`/teams/${alevin}`);
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screen.queryByText("Ana")).toBeNull();
  });

  it("RF-016 RF-085: a team whose read fails shows the not-found message", async () => {
    breakReads(db, "teams");
    await renderRouter("./src/app", { initialUrl: `/teams/${alevin}` });
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screenTexts()).toEqual([NOT_FOUND]);
  });
});
