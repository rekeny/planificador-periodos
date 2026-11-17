// T081: the edit-team route and the not-found state (RF-013, RF-082, RF-085). Real src/app routes
// through renderRouter, with the doubles of new-team.form.test.tsx: expo-splash-screen,
// initializeDatabase and the squad store of `@/state/app-stores` (a real store on the in-memory
// database). The route `/teams/[teamId]/edit` and `src/ui/not-found.tsx` do not exist yet.
import { act, screen, testRouter } from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { presentations } from "../support/screen-presentation";
import { headerConfigs, screenTexts } from "../support/screen-reading";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { ALEVIN, CADETE, breakReads, idOf } from "../support/squad-fixtures";
import {
  NOT_FOUND,
  deleteTeamDirectly,
  formReady,
  openEdit,
  openEditAlone,
} from "../support/edit-team";
import { isFormatChosen, savedTeams } from "../support/new-team-form";

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

// The app's own store starts empty, like a fresh start: the teams are in the database only.
beforeEach(() => {
  db = resetMockDatabase();
  const seeder = createSquadStore(db);
  seeder.getState().createTeam(ALEVIN);
  seeder.getState().createTeam(CADETE);
  useMockSquadStore(createSquadStore(db));
});

describe("edit-team route, opening it", () => {
  it("RF-013: the edit route opens as a modal with the header «Editar» over the list", async () => {
    await openEdit(idOf(db, "Alevín A"));
    await formReady();
    expect(screen).toHavePathname(`/teams/${idOf(db, "Alevín A")}/edit`);
    expect(headerConfigs().map((config) => config.title)).toEqual([
      "Equipos",
      "Editar",
    ]);
    expect(presentations()).toEqual(["push", "modal"]);
  });

  it("RF-013 RF-012: es.json holds «Editar» and the not-found message", () => {
    const texts = es as unknown as Record<string, Record<string, unknown>>;
    expect(texts.common?.edit).toBe("Editar");
    expect(texts.common?.save).toBe("Guardar");
    expect(texts.notFound?.message).toBe(NOT_FOUND);
  });

  it("RF-013: the fields start with the saved name, category and default format", async () => {
    await openEdit(idOf(db, "Alevín A"));
    await formReady();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín A");
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("2015");
    expect(isFormatChosen(6)).toBe(true);
    expect(isFormatChosen(4)).toBe(false);
    expect(isFormatChosen(8)).toBe(false);
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("RF-013: a team with no category and default format 8 shows an empty category field and «8 periodos» chosen", async () => {
    await openEdit(idOf(db, "Cadete B"));
    await formReady();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Cadete B");
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("");
    expect(screen.queryByText("null")).toBeNull();
    expect(isFormatChosen(8)).toBe(true);
    expect(isFormatChosen(6)).toBe(false);
  });

  it("RF-013 E-022: the name and the category fields stop at 40 characters (maxLength)", async () => {
    await openEdit(idOf(db, "Alevín A"));
    await formReady();
    expect(screen.getByLabelText("Nombre").props.maxLength).toBe(40);
    expect(screen.getByLabelText("Categoría").props.maxLength).toBe(40);
  });
});

describe("edit-team route, not found", () => {
  it.each(["abc", "0", "-1", "1.5", "01", "1e3", "99"])(
    "RF-013 RF-085: /teams/%s/edit shows only «No se ha encontrado: puede que se haya borrado.» and changes nothing",
    async (id) => {
      const before = savedTeams(db);
      await openEditAlone(id);
      expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
      expect(screenTexts()).toEqual([NOT_FOUND]);
      expect(screen.queryByLabelText("Nombre")).toBeNull();
      expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
      expect(savedTeams(db)).toEqual(before);
    },
  );

  it("RF-013: the id of a team deleted directly in the database shows the not-found message", async () => {
    const id = idOf(db, "Alevín A");
    deleteTeamDirectly(db, id);
    await openEditAlone(id);
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screenTexts()).toEqual([NOT_FOUND]);
    expect(savedTeams(db).map((team) => team.name)).toEqual(["Cadete B"]);
  });

  it("RF-013: a team deleted after it was edited once shows the not-found message the next time the route opens", async () => {
    const id = idOf(db, "Alevín A");
    await openEdit(id);
    await formReady();
    await screen.findByDisplayValue("Alevín A");
    await act(async () => testRouter.back());
    deleteTeamDirectly(db, id);
    await testRouter.push(`/teams/${id}/edit`);
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it("RF-013 RF-085: a team whose read fails shows the not-found message and no form", async () => {
    const id = idOf(db, "Alevín A");
    breakReads(db, "teams");
    await openEditAlone(id);
    expect(await screen.findByText(NOT_FOUND)).toBeTruthy();
    expect(screenTexts()).toEqual([NOT_FOUND]);
  });
});
