// T076: a deactivation or a reactivation that cannot be saved (RF-022, RF-024, RF-085). The player
// stays as it was, the dialog closes, `error.saveFailed` shows inside the screen's scroll container
// and the screen stays open; once the device has space the same button works. The failure is real,
// a SQLite trigger that makes every update of `players` fail. Same doubles as
// player-screen.active.test.tsx.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { SAVE_FAILED } from "../support/new-team-form";
import { allowWrites, failWrites } from "../support/squad-fixtures";
import { inScroll } from "../support/form-scroll";
import { hosts, press } from "../support/match-screen-questions";
import { playerOrder } from "../support/team-screen";
import {
  DEACTIVATE,
  INACTIVE,
  REACTIVATE,
  deactivateDirectly,
  expectOnTeam,
  hasAction,
  openPlayerFromTeam,
  pressAction,
  rowTexts,
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

const dialogOpen = (): boolean => hosts().length > 0;
let s: ReturnType<typeof seedPlayerScreen>;

beforeEach(() => {
  s = seedPlayerScreen();
});

describe("player screen, a failing deactivation (RF-085)", () => {
  it("RF-022 RF-085: the dialog closes, the screen shows the save error inside its scroll container, stays open and the player is still active", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    failWrites(s.db, "players", "UPDATE");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    expect(dialogOpen()).toBe(false);
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.ana}`);
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
    expect(hasAction(DEACTIVATE)).toBe(true);
  });

  it("RF-022 RF-085: Back after the failure shows the team with Ana active, without «Desactivado» and without the message", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    failWrites(s.db, "players", "UPDATE");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await screen.findByText(SAVE_FAILED);
    await testRouter.back();
    await expectOnTeam(s.alevin);
    expect(screen.queryByText(INACTIVE)).toBeNull();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(playerOrder()).toBe("4 Ana 7 Juan");
  });

  it("RF-022 RF-085: once the device has space, the same «Desactivar» and its confirmation deactivate the player and hide the message", async () => {
    await openPlayerFromTeam(s.alevin, "Ana");
    failWrites(s.db, "players", "UPDATE");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await screen.findByText(SAVE_FAILED);
    allowWrites(s.db, "players", "UPDATE");
    await pressAction(DEACTIVATE);
    await press(DEACTIVATE);
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(false);
    await waitFor(() => expect(rowTexts("Ana")).toContain(INACTIVE));
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });
});

describe("player screen, a failing reactivation (RF-085)", () => {
  it("RF-024 RF-085: the screen shows the save error and stays open, the player is still deactivated and «Reactivar» is still there", async () => {
    deactivateDirectly(s.db, s.ana);
    await openPlayerFromTeam(s.alevin, "Ana");
    failWrites(s.db, "players", "UPDATE");
    await pressAction(REACTIVATE);
    expect(inScroll().queryByText(SAVE_FAILED)).not.toBeNull();
    expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.ana}`);
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(false);
    expect(hasAction(REACTIVATE)).toBe(true);
    expect(dialogOpen()).toBe(false);
  });

  it("RF-024 RF-085: once the device has space, «Reactivar» again reactivates the player and goes back", async () => {
    deactivateDirectly(s.db, s.ana);
    await openPlayerFromTeam(s.alevin, "Ana");
    failWrites(s.db, "players", "UPDATE");
    await pressAction(REACTIVATE);
    await screen.findByText(SAVE_FAILED);
    allowWrites(s.db, "players", "UPDATE");
    await pressAction(REACTIVATE);
    await expectOnTeam(s.alevin);
    expect(savedRows(s.db, s.alevin)[1]?.isActive).toBe(true);
  });
});
