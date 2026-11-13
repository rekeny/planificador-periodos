// T034: leaving the new-team form, a failed save and quick double presses (RF-013, RF-082, RF-085,
// E-029). Same doubles as new-team.form.test.tsx. The failure is real: a SQLite trigger makes
// every insert into `teams` fail. The Android hardware Back button cannot be pressed in Jest; it
// goes through the same router back as `testRouter.back()` and T036 presses it for real.
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";
import { Dimensions } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import {
  ALEVIN,
  CADETE,
  allowWrites,
  failWrites,
} from "../support/squad-fixtures";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import {
  chooseFormat,
  createViaForm,
  isFormatChosen,
  openApp,
  openForm,
  pressSave,
  SAVE_FAILED,
  saveButton,
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

const EMPTY = "Todavía no hay equipos. Crea el primero.";
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

function seed(): void {
  const seeder = createSquadStore(db);
  seeder.getState().createTeam(ALEVIN);
  seeder.getState().createTeam(CADETE);
}

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
});

describe("new-team form, leaving it", () => {
  it("RF-082: going back from a half-filled form asks nothing, saves nothing and shows the list", async () => {
    await openForm();
    await typeName("Alevín A");
    await typeCategory("2015");
    await chooseFormat(8);
    await testRouter.back();
    expect(screen).toHavePathname("/");
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screen.queryByText("Alevín A")).toBeNull();
    expect(savedTeams(db)).toEqual([]);
  });

  it("RF-082: opening the form again after leaving it half-filled shows it empty with «6 periodos» selected", async () => {
    await openForm();
    await typeName("Alevín A");
    await chooseFormat(8);
    await testRouter.back();
    await fireEvent.press(
      await screen.findByRole("button", { name: "Nuevo equipo" }),
    );
    expect(await screen.findByLabelText("Nombre")).toHaveDisplayValue("");
    expect(isFormatChosen(6)).toBe(true);
    expect(isFormatChosen(8)).toBe(false);
  });

  it("RF-073 RF-082 E-029: a half-filled form lost when the app closes leaves the list without «Cadete B» and with every team saved before", async () => {
    const seeder = createSquadStore(db);
    seeder.getState().createTeam(ALEVIN);
    await openForm();
    await typeName("Cadete B");
    await act(async () => screen.unmount());
    useMockSquadStore(createSquadStore(db));
    await openApp();
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText("Cadete B")).toBeNull();
    expect(screen).toHavePathname("/");
    expect(savedTeams(db).map((team) => team.name)).toEqual(["Alevín A"]);
  });

  it("RF-082: rotating the device keeps the typed text and the chosen format", async () => {
    await openForm();
    await typeName("Alevín A");
    await chooseFormat(4);
    const landscape = { width: 800, height: 400, scale: 2, fontScale: 1 };
    const portrait = { width: 400, height: 800, scale: 2, fontScale: 1 };
    try {
      await act(async () =>
        Dimensions.set({ window: landscape, screen: landscape }),
      );
      expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Alevín A");
      expect(isFormatChosen(4)).toBe(true);
    } finally {
      await act(async () =>
        Dimensions.set({ window: portrait, screen: portrait }),
      );
    }
  });
});

describe("new-team form, when saving fails", () => {
  it("RF-085: a failed save shows the message, keeps the form open with its text and creates no team", async () => {
    seed();
    failWrites(db, "teams", "INSERT");
    await openForm();
    await createViaForm("Benjamín", "2017", 8);
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(screen).toHavePathname("/teams/new");
    expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Benjamín");
    expect(screen.getByLabelText("Categoría")).toHaveDisplayValue("2017");
    expect(isFormatChosen(8)).toBe(true);
    expect(savedTeams(db).map((team) => team.name)).toEqual([
      "Alevín A",
      "Cadete B",
    ]);
  });

  it("RF-085: after a failed save the team is not in the list", async () => {
    failWrites(db, "teams", "INSERT");
    await openForm();
    await createViaForm("Benjamín");
    await screen.findByText(SAVE_FAILED);
    await testRouter.back();
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screen.queryByText("Benjamín")).toBeNull();
  });

  it("RF-085 RF-013: after a failed save, pressing «Guardar» again saves the team, closes the form and hides the message", async () => {
    failWrites(db, "teams", "INSERT");
    await openForm();
    await createViaForm("Benjamín", "2017");
    await screen.findByText(SAVE_FAILED);
    allowWrites(db, "teams", "INSERT");
    await pressSave();
    expect(await screen.findByText("Benjamín")).toBeTruthy();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(screen).toHavePathname("/");
    expect(savedTeams(db)).toEqual([
      { name: "Benjamín", category: "2017", defaultFormat: 6 },
    ]);
  });

  it("RF-085 RF-013: after a failed save, a blank name shows «Escribe un nombre.» and the failure message is gone", async () => {
    failWrites(db, "teams", "INSERT");
    await openForm();
    await createViaForm("Benjamín");
    await screen.findByText(SAVE_FAILED);
    await typeName("");
    await pressSave();
    expect(await screen.findByText("Escribe un nombre.")).toBeTruthy();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });
});

describe("new-team form, quick presses", () => {
  it("RF-013 RF-082: two quick presses on «Guardar» create one team", async () => {
    // A deep link leaves the form as the only screen, so it stays mounted after the save and the
    // second press reaches the very same button: only a guard that outlives the save ignores it.
    await renderRouter("./src/app", { initialUrl: "/teams/new" });
    await typeName("Alevín A");
    const save = saveButton();
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(savedTeams(db)).toEqual([
      { name: "Alevín A", category: null, defaultFormat: 6 },
    ]);
  });
});
