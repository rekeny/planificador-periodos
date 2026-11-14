// Fourth Codex review, finding 4 (RF-085, RF-076, RF-055, RF-058): after a failed save the error
// banner of the match and call-up screens does not float over the controls. On a phone (shortest
// side below 768) the toolbar «Deshacer» / «Añadir prórroga» / «Quitar prórroga» stays uncovered
// and pressable; on a tablet the header buttons stay reachable. Same doubles as
// match-screen.undo.test.tsx; failures are real SQLite triggers.
import { screen, waitFor } from "expo-router/testing-library";

import { expectBannerNotOverlay } from "../support/banner-placement";
import { SAVE_FAILED } from "../support/call-up-screen";
import {
  allowOvertimeWrites,
  failMarkWrites,
  failOvertimeWrites,
} from "../support/match-session-marks";
import {
  ADD,
  PHONE,
  REMOVE_OVERTIME,
  TABLET,
  UNDO,
  buttonsNamed,
  cellState,
  columnTitles,
  inHeader,
  openPlan,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import { restoreWindow, setWindow } from "../support/window-size";

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

afterEach(async () => restoreWindow());

describe("match screen on a phone, a failed save keeps the toolbar uncovered", () => {
  it.each([
    [PHONE.width, PHONE.height],
    [PHONE.height, PHONE.width],
  ])(
    "RF-085 RF-076 RF-055: in a %s × %s phone window a failed tap shows the banner in normal flow and «Deshacer» still undoes the earlier tap",
    async (width, height) => {
      await setWindow(width, height);
      const s = await openPlan(9);
      await tap("Jugador 1", "P1");
      failMarkWrites(s.db, "INSERT");
      await tap("Jugador 2", "P1");
      expectBannerNotOverlay();
      for (const name of [UNDO, ADD])
        expect(buttonsNamed(name)).toHaveLength(1);
      expect(buttonsNamed(UNDO)[0]).toBeEnabled();
      await pressButton(UNDO);
      await waitFor(() => expect(cellState("Jugador 1", "P1")).toBe("empty"));
    },
  );

  it("RF-085 RF-058 RF-076: a failed «Añadir prórroga» on a phone shows the banner in normal flow and the toolbar button still works once the device has space", async () => {
    await setWindow(PHONE.width, PHONE.height);
    const s = await openPlan(9);
    failOvertimeWrites(s.db);
    await pressButton(ADD);
    expectBannerNotOverlay();
    expect(buttonsNamed(ADD)).toHaveLength(1);
    allowOvertimeWrites(s.db);
    await pressButton(ADD);
    await waitFor(() => expect(columnTitles()).toContain("PR1"));
  });

  it("RF-085 RF-059 RF-076: a failed «Añadir prórroga» with an overtime already there keeps «Quitar prórroga» in the toolbar, banner in normal flow", async () => {
    await setWindow(PHONE.width, PHONE.height);
    const s = await openPlan(9, [], { overtimeCount: 1 });
    failOvertimeWrites(s.db);
    await pressButton(ADD);
    expectBannerNotOverlay();
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(1);
  });
});

describe("match screen on a tablet, a failed save keeps the header buttons", () => {
  it("RF-085 RF-076: a failed tap on a tablet window leaves «Deshacer» and «Añadir prórroga» once each, in the header", async () => {
    await setWindow(TABLET.width, TABLET.height);
    const s = await openPlan(9);
    failMarkWrites(s.db, "INSERT");
    await tap("Jugador 1", "P1");
    expect(screen.getByText(SAVE_FAILED)).toBeTruthy();
    for (const name of [UNDO, ADD]) {
      const found = buttonsNamed(name);
      expect(found).toHaveLength(1);
      expect(found[0] && inHeader(found[0])).toBe(true);
    }
  });
});
