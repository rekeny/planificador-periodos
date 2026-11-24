// T076: what the player screen does not save: an invalid number or name, and a save that fails
// (RF-016, RF-018, RF-085, E-021). Same doubles as player-screen.edit.test.tsx; the failure is real,
// a SQLite trigger that makes every update of `players` fail.
import { screen, testRouter } from "expo-router/testing-library";

import { allowWrites, failWrites } from "../support/squad-fixtures";
import {
  NAME_REQUIRED,
  SAVE_FAILED,
  pressSave,
} from "../support/new-team-form";
import {
  NUMBER_INVALID,
  addViaForm,
  playerOrder,
  typeNumber,
} from "../support/team-screen";
import {
  JUAN_AND_ANA,
  expectOnTeam,
  fieldValues,
  openPlayerFromTeam,
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

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, what cannot be saved", () => {
  it.each(["07", ""])(
    "RF-018 RF-016 E-021: the number «%s» shows «El dorsal debe ser de 0 a 99 o 00, sin ceros a la izquierda.», saves nothing, keeps the screen and the typed text",
    async (number) => {
      await openPlayerFromTeam(s.alevin, "Juan");
      await addViaForm("Juanito", number);
      expect(await screen.findByText(NUMBER_INVALID)).toBeTruthy();
      expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.juan}`);
      expect(fieldValues().name).toBe("Juanito");
      expect(screen.queryByText(NAME_REQUIRED)).toBeNull();
      expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
    },
  );

  it.each(["", "     "])(
    "RF-018 RF-016: a name typed as «%s» shows «Escribe un nombre.» and saves nothing",
    async (blank) => {
      await openPlayerFromTeam(s.alevin, "Juan");
      await addViaForm(blank, "8");
      expect(await screen.findByText(NAME_REQUIRED)).toBeTruthy();
      expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
    },
  );

  it("RF-018 RF-016: after an invalid number, fixing it and pressing «Guardar» again saves and hides the message", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    await addViaForm("Juan", "07");
    await screen.findByText(NUMBER_INVALID);
    await typeNumber("8");
    await pressSave();
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)[0]).toMatchObject({ number: "8" });
    expect(screen.queryByText(NUMBER_INVALID)).toBeNull();
  });
});

describe("player screen, when saving fails", () => {
  it("RF-085 RF-018: a failed save shows the message, keeps the screen with the typed text and changes nothing in the database", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    failWrites(s.db, "players", "UPDATE");
    await addViaForm("Juanito", "9");
    expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.juan}`);
    expect(fieldValues()).toEqual({ name: "Juanito", number: "9" });
    expect(savedRows(s.db, s.alevin)).toEqual(JUAN_AND_ANA);
  });

  it("RF-085: after a failed save Back shows the team as it was, with no message", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    failWrites(s.db, "players", "UPDATE");
    await addViaForm("Juanito", "9");
    await screen.findByText(SAVE_FAILED);
    await testRouter.back();
    await expectOnTeam(s.alevin);
    expect(playerOrder()).toBe("4 Ana 7 Juan");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it("RF-085 RF-018: once the device has space, «Guardar» again saves, goes back and hides the message", async () => {
    await openPlayerFromTeam(s.alevin, "Juan");
    failWrites(s.db, "players", "UPDATE");
    await addViaForm("Juanito", "9");
    await screen.findByText(SAVE_FAILED);
    allowWrites(s.db, "players", "UPDATE");
    await pressSave();
    await expectOnTeam(s.alevin);
    expect(playerOrder()).toBe("4 Ana 9 Juanito");
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });
});
