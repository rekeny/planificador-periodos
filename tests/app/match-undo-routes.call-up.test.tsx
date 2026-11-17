// T084: the Undo history across the call-up screen, which is pushed on top of the match screen
// (RF-057, RF-082, RF-086, E-019, and the D2 counterpart of E-026). Real src/app routes through
// renderRouter with the real match session store on the in-memory database; only expo-sqlite, the
// splash screen, initializeDatabase and the store getters of `@/state/app-stores` are doubles.
// Window: a phone, so the buttons are in the toolbar. Assumed screens: the helpers' headers.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { savedCallUp } from "../support/match-session-call-up";
import { savedMarks } from "../support/match-session-marks";
import {
  openMatchScreen,
  pressAdd,
  removeButtons,
  startSession,
} from "../support/call-up-screen";
import {
  PHONE,
  UNDO,
  cellButtons,
  cellState,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import {
  evaSession,
  hasRow,
  openFromTeam,
  pressCallUp,
  removeAndConfirm,
  undoButton,
} from "../support/match-undo-routes";
import { squadSpecs } from "../support/match-session-fixtures";
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

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

describe("Undo after the call-up screen, a player removed from it", () => {
  it("RF-057 RF-086 E-026: mark Ana then Eva, remove Eva in the call-up and go back: «Deshacer» skips Eva and reverts Ana's mark", async () => {
    const s = evaSession();
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await tap("Eva", "P1");
    await pressCallUp();
    await removeAndConfirm(s, "Eva");
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(hasRow("Eva")).toBe(false);
    expect(undoButton()).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(hasRow("Eva")).toBe(false);
    expect(undoButton()).toBeDisabled();
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
    expect(savedCallUp(s.db, s.matchId)).not.toContain("9 Eva");
  });

  it("RF-057 RF-086 E-026: when only Eva's marks were in the history, after removing her «Deshacer» has nothing to undo and Eva does not come back", async () => {
    const s = evaSession();
    await openMatchScreen(s.matchId);
    await tap("Eva", "P1");
    await tap("Eva", "P2");
    await pressCallUp();
    await removeAndConfirm(s, "Eva");
    await testRouter.back();
    expect(undoButton()).toBeDisabled();
    await pressButton(UNDO);
    expect(hasRow("Eva")).toBe(false);
    expect(cellButtons()).toHaveLength(8 * 6);
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
    expect(savedCallUp(s.db, s.matchId)).not.toContain("9 Eva");
  });

  it("RF-086 RF-057: with the marks of three players mixed, the presses revert the others in order and never write into Eva's removed row", async () => {
    const s = evaSession();
    await openMatchScreen(s.matchId);
    await tap("Jugador 1", "P1");
    await tap("Eva", "P1");
    await tap("Jugador 2", "P1");
    await pressCallUp();
    await removeAndConfirm(s, "Eva");
    await testRouter.back();
    await pressButton(UNDO);
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(undoButton()).toBeDisabled();
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });

  it("RF-086: adding Eva again gives her a new empty row that the old history never touches", async () => {
    const s = evaSession();
    await openMatchScreen(s.matchId);
    await tap("Eva", "P1");
    await pressCallUp();
    await removeAndConfirm(s, "Eva");
    await pressAdd("Eva");
    await waitFor(() => expect(removeButtons()).toHaveLength(9));
    await testRouter.back();
    expect(hasRow("Eva")).toBe(true);
    expect(cellState("Eva", "P1")).toBe("empty");
    expect(undoButton()).toBeDisabled();
    await pressButton(UNDO);
    expect(cellState("Eva", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });
});

describe("Undo after the call-up screen, going there and back", () => {
  it("RF-057: a mark, the call-up screen and back: «Deshacer» removes that mark, and the match was opened once and never closed", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await pressCallUp();
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(open).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(undoButton()).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });

  it("RF-057: pushing the call-up twice and going back twice keeps the same session, with no second grid", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await tap("Jugador 2", "P1");
    await pressCallUp();
    await testRouter.push(`/matches/${s.matchId}/call-up`);
    await testRouter.back();
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(open).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(cellButtons()).toHaveLength(9 * 6);
    await pressButton(UNDO);
    await pressButton(UNDO);
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
    expect(undoButton()).toBeDisabled();
  });

  it("RF-057 RF-082: the Android Back command (router back) from the call-up returns to the grid with the history, the marks and the session intact", async () => {
    const s = startSession(squadSpecs(9));
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await tap("Jugador 1", "P2");
    await testRouter.push(`/matches/${s.matchId}/call-up`);
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(close).not.toHaveBeenCalled();
    expect(s.store.getState().status).toBe("open");
    expect(s.store.getState().history).toHaveLength(2);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
  });
});
