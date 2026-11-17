// Fourth Codex review, finding 4 (RF-085, RF-032, RF-033): the error banner of the call-up screen
// is drawn in normal flow, not over the rows and the buttons to add or remove players. Same doubles
// as call-up-screen.failures.test.tsx; failures are real SQLite triggers.
import { screen } from "expo-router/testing-library";

import { expectBannerNotOverlay } from "../support/banner-placement";
import { squadSpecs } from "../support/match-session-fixtures";
import { failWrites } from "../support/match-session-call-up";
import {
  openCallUpAlone,
  pressAdd,
  pressRemove,
  removeButtons,
  startSession,
} from "../support/call-up-screen";

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

describe("call-up screen, a failed save does not cover the list controls", () => {
  it("RF-085 RF-032: a failed add shows the banner in normal flow and the remove buttons stay", async () => {
    const s = startSession(squadSpecs(9), [["Nora", "15"]]);
    failWrites(s.db, "call_up_entries", "INSERT");
    await openCallUpAlone(s);
    await pressAdd("Nora");
    await screen.findByRole("alert");
    expectBannerNotOverlay();
    expect(removeButtons()).toHaveLength(9);
  });

  it("RF-085 RF-033: a failed removal shows the banner in normal flow and the row stays", async () => {
    const s = startSession(squadSpecs(9));
    failWrites(s.db, "call_up_entries", "DELETE");
    await openCallUpAlone(s);
    await pressRemove(s, "Jugador 3");
    await screen.findByRole("alert");
    expectBannerNotOverlay();
    expect(removeButtons()).toHaveLength(9);
  });
});
