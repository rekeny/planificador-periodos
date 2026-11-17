// Third Codex review, finding 1 (BLOCKING): going to another match route and back must not leave
// the first grid without a session (RF-057, RF-058). Real src/app routes through renderRouter with
// the real match session store on the in-memory database; only expo-sqlite, the splash screen,
// initializeDatabase and the store getters of `@/state/app-stores` are doubles. The unknown match
// 999 shows the not-found text and its cleanup must not close a session that is not its own.
import { testRouter, screen, waitFor } from "expo-router/testing-library";

import { startSession } from "../support/call-up-screen";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedMarks } from "../support/match-session-marks";
import {
  PHONE,
  UNDO,
  cellState,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import {
  gridRestored,
  roundTripThroughNotFound,
  secondMatchOf,
} from "../support/match-focus-restore";
import {
  hasRow,
  openFromTeam,
  pressCallUp,
  undoButton,
} from "../support/match-undo-routes";
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

describe("the match screen when focus returns to it", () => {
  it("RF-057: match 1, an unknown match 999 on top and Back: the session is open for match 1 again and the grid shows the saved mark", async () => {
    const s = startSession(squadSpecs(9));
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await roundTripThroughNotFound(s);
    await gridRestored(s);
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });

  it("RF-057 RF-058: after returning from match 999 a new mark can still be undone, and «Deshacer» only undoes it", async () => {
    const s = startSession(squadSpecs(9));
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await roundTripThroughNotFound(s);
    await gridRestored(s);
    await tap("Jugador 2", "P1");
    expect(undoButton()).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });

  it("RF-057: match 1, a second real match on top and Back: the session is for match 1 again with its nine rows and its mark", async () => {
    const s = startSession(squadSpecs(9));
    const second = secondMatchOf(s, 8);
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await testRouter.push(`/matches/${second}`);
    await waitFor(() => expect(s.store.getState().view?.matchId).toBe(second));
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    await gridRestored(s);
    expect(hasRow("Jugador 9")).toBe(true);
    expect(s.store.getState().view?.rows).toHaveLength(9);
    expect(cellState("Jugador 1", "P1")).toBe("starter");
  });

  it("RF-057: after the round trip, the call-up route keeps the history and reloads nothing, and leaving the match closes the session", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    await openFromTeam(s);
    await roundTripThroughNotFound(s);
    await gridRestored(s);
    await tap("Jugador 2", "P1");
    const opened = open.mock.calls.length;
    await pressCallUp();
    await testRouter.back();
    expect(open).toHaveBeenCalledTimes(opened);
    expect(s.store.getState().history).toHaveLength(1);
    await testRouter.back();
    expect(s.store.getState().status).toBe("closed");
    expect(s.store.getState().history).toEqual([]);
  });
});
