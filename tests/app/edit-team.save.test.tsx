// T081: saving, leaving and failing in the edit-team route (RF-013, RF-082, RF-085). Same doubles
// as edit-team.form.test.tsx. The failure is real: a SQLite trigger makes every update of `teams`
// fail. The route `/teams/[teamId]/edit` does not exist yet.
import { act, screen, testRouter } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import {
  ALEVIN,
  CADETE,
  allowWrites,
  failWrites,
  idOf,
} from "../support/squad-fixtures";
import { formReady, openEdit } from "../support/edit-team";
import {
  NAME_REQUIRED,
  SAVE_FAILED,
  chooseFormat,
  isFormatChosen,
  pressSave,
  savedTeams,
  typeCategory,
  typeName,
} from "../support/new-team-form";

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

const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";
const OTHER_TEAM = { name: "Cadete B", category: null, defaultFormat: 8 };
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let alevin: number;

beforeEach(() => {
  db = resetMockDatabase();
  const seeder = createSquadStore(db);
  seeder.getState().createTeam(ALEVIN);
  seeder.getState().createTeam(CADETE);
  alevin = idOf(db, "Alevín A");
  useMockSquadStore(createSquadStore(db));
});

async function openForm(id = alevin): Promise<void> {
  await openEdit(id);
  await formReady();
}

describe("edit-team route, saving", () => {
  it("RF-013: «Alevín A» edited to «Alevín B» with category «2015» closes the form and the list shows the new data", async () => {
    await openForm();
    await typeName("Alevín B");
    await typeCategory("2015");
    await pressSave();
    expect(await screen.findByText("Alevín B")).toBeTruthy();
    expect(screen.getByText("2015")).toBeTruthy();
    expect(screen.queryByText("Alevín A")).toBeNull();
    expect(screen).toHavePathname("/");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín B", category: "2015", defaultFormat: 6 },
      OTHER_TEAM,
    ]);
  });

  it("RF-013 E-022: a 40-character name is saved with no message", async () => {
    await openForm();
    await typeName(FORTY);
    await pressSave();
    expect(await screen.findByText(FORTY)).toBeTruthy();
    expect(FORTY).toHaveLength(40);
    expect(savedTeams(db)[0]?.name).toBe(FORTY);
    expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
  });

  it("RF-013: a name and a category typed with spaces around are saved and shown without them", async () => {
    await openForm();
    await typeName("  Alevín B  ");
    await typeCategory("  2015  ");
    await pressSave();
    expect(await screen.findByText("Alevín B")).toBeTruthy();
    expect(savedTeams(db)[0]).toMatchObject({
      name: "Alevín B",
      category: "2015",
    });
  });

  it.each(["", "   "])(
    "RF-013: clearing the category (typed as «%s») saves no category, never an empty text or «null»",
    async (cleared) => {
      await openForm();
      await typeCategory(cleared);
      await pressSave();
      await screen.findByText("Alevín A");
      expect(savedTeams(db)[0]).toEqual({
        name: "Alevín A",
        category: null,
        defaultFormat: 6,
      });
      expect(screen.queryByText("null")).toBeNull();
      expect(screen.queryByText("2015")).toBeNull();
    },
  );

  it("RF-001 RF-013: changing the default format 6 to 8 saves 8 and leaves the name, the category and the other team as they were", async () => {
    await openForm();
    await chooseFormat(8);
    expect(isFormatChosen(8)).toBe(true);
    await pressSave();
    await screen.findByText("Alevín A");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 8 },
      OTHER_TEAM,
    ]);
  });

  it("RF-013: editing twice shows the last data in the list, and the second form starts with what the first one saved", async () => {
    await openForm();
    await typeName("Alevín B");
    await pressSave();
    await screen.findByText("Alevín B");
    await openForm();
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín B");
    await typeName("Alevín C");
    await pressSave();
    expect(await screen.findByText("Alevín C")).toBeTruthy();
    expect(screen.queryByText("Alevín B")).toBeNull();
    expect(savedTeams(db).map((team) => team.name)).toEqual([
      "Alevín C",
      "Cadete B",
    ]);
  });

  it("RF-013: saving without changing anything succeeds with no message and leaves the list as it was", async () => {
    await openForm();
    await pressSave();
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen).toHavePathname("/");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 6 },
      OTHER_TEAM,
    ]);
  });

  it("RF-013: editing one team never changes the other, whichever is edited", async () => {
    await openForm(idOf(db, "Cadete B"));
    await typeName("Cadete A");
    await typeCategory("2012");
    await chooseFormat(4);
    await pressSave();
    await screen.findByText("Cadete A");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 6 },
      { name: "Cadete A", category: "2012", defaultFormat: 4 },
    ]);
  });
});

describe("edit-team route, leaving without saving", () => {
  it("RF-082: going back from a half-edited form asks nothing, keeps the saved data and shows the list", async () => {
    await openForm();
    await typeName("Alevín B");
    await typeCategory("");
    await chooseFormat(4);
    await act(async () => testRouter.back());
    expect(screen).toHavePathname("/");
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText("Alevín B")).toBeNull();
    expect(savedTeams(db)[0]).toEqual({
      name: "Alevín A",
      category: "2015",
      defaultFormat: 6,
    });
  });

  it("RF-082: opening the edit form again after leaving it half-edited shows the saved data, not the typed one", async () => {
    await openForm();
    await typeName("Alevín B");
    await chooseFormat(8);
    await act(async () => testRouter.back());
    await testRouter.push(`/teams/${alevin}/edit`);
    await screen.findByLabelText("Nombre");
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín A");
    expect(isFormatChosen(6)).toBe(true);
  });
});

describe("edit-team route, mistakes", () => {
  it.each(["", "    "])(
    "RF-013: a name typed as «%s» shows «Escribe un nombre.», saves nothing and stays on the form",
    async (blank) => {
      await openForm();
      await typeName(blank);
      await pressSave();
      expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
      expect(screen).toHavePathname(`/teams/${alevin}/edit`);
      expect(savedTeams(db)[0]?.name).toBe("Alevín A");
    },
  );

  it("RF-085: a failed save shows the message, keeps the form open with its text and changes nothing", async () => {
    failWrites(db, "teams", "UPDATE");
    await openForm();
    await typeName("Alevín B");
    await typeCategory("2016");
    await chooseFormat(8);
    await pressSave();
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${alevin}/edit`);
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín B");
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("2016");
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: "2015", defaultFormat: 6 },
      OTHER_TEAM,
    ]);
  });

  it("RF-085: after a failed save the list still shows the old name", async () => {
    failWrites(db, "teams", "UPDATE");
    await openForm();
    await typeName("Alevín B");
    await pressSave();
    await screen.findByText(SAVE_FAILED);
    await act(async () => testRouter.back());
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText("Alevín B")).toBeNull();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it("RF-085 RF-013: after a failed save, pressing «Guardar» again saves the change, closes the form and hides the message", async () => {
    failWrites(db, "teams", "UPDATE");
    await openForm();
    await typeName("Alevín B");
    await pressSave();
    await screen.findByText(SAVE_FAILED);
    allowWrites(db, "teams", "UPDATE");
    await pressSave();
    expect(await screen.findByText("Alevín B")).toBeTruthy();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(screen).toHavePathname("/");
    expect(savedTeams(db)[0]?.name).toBe("Alevín B");
  });
});
