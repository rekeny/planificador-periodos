// T084: leaving the match closes the session and empties the Undo history, and the new-player form
// and a window change keep it (RF-057, RF-058, RF-082, E-019). Real src/app routes through
// renderRouter with the real match session store on the in-memory database; only expo-sqlite, the
// splash screen, initializeDatabase and the store getters of `@/state/app-stores` are doubles.
// Window: a phone unless the test says otherwise. Assumed screens: the helpers' headers.
import { act } from "@testing-library/react-native";
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import { savedCallUp, savedTeam } from "../support/match-session-call-up";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedMarks, savedOvertimes } from "../support/match-session-marks";
import { addViaForm } from "../support/team-screen";
import {
  ADD,
  PHONE,
  TABLET,
  UNDO,
  cellButtons,
  cellState,
  columnTitles,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import { startSession } from "../support/call-up-screen";
import {
  setMockMatchSessionStore,
  useMockSquadStore,
} from "../support/mock-app-stores";
import { pressCreatePlayer } from "../support/new-player-in-match";
import {
  openFromTeam,
  pressCallUp,
  showGrid,
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

describe("Undo after leaving the match", () => {
  it("RF-057: going back to the team closes the match, and opening it again with its route has an empty history and a disabled «Deshacer», the saved mark staying", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    expect(undoButton()).toBeEnabled();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(close).toHaveBeenCalledTimes(1);
    expect(s.store.getState().status).toBe("closed");
    expect(s.store.getState().history).toEqual([]);
    await testRouter.push(`/matches/${s.matchId}`);
    await showGrid();
    expect(open).toHaveBeenCalledTimes(2);
    expect(undoButton()).toBeDisabled();
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });

  it("RF-057: the call-up route is not leaving the match, but popping the grid after returning from it is", async () => {
    const s = startSession(squadSpecs(9));
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await pressCallUp();
    await testRouter.back();
    expect(close).not.toHaveBeenCalled();
    await testRouter.back();
    expect(close).toHaveBeenCalledTimes(1);
    expect(s.store.getState().history).toEqual([]);
  });

  it("RF-057 RF-082 E-019: marks in P1–P3 and an overtime, the app closed and opened again: the list of teams first, then the same marks and overtime with nothing to undo", async () => {
    const s = startSession(squadSpecs(9));
    useMockSquadStore(createSquadStore(s.db));
    await renderRouter("./src/app");
    await screen.findByText("Alevín A");
    await testRouter.push(`/matches/${s.matchId}`);
    await showGrid();
    for (const column of ["P1", "P2", "P3"]) await tap("Jugador 1", column);
    await pressButton(ADD);
    await waitFor(() => expect(columnTitles()).toContain("PR1"));
    await act(async () => screen.unmount());
    setMockMatchSessionStore(createMatchSessionStore(s.db));
    useMockSquadStore(createSquadStore(s.db));
    await renderRouter("./src/app");
    await screen.findByText("Alevín A");
    expect(screen).toHavePathname("/");
    expect(cellButtons()).toHaveLength(0);
    await testRouter.push(`/matches/${s.matchId}`);
    await showGrid();
    for (const column of ["P1", "P2", "P3"]) {
      expect(cellState("Jugador 1", column)).toBe("starter");
    }
    expect(columnTitles()).toContain("PR1");
    expect(savedOvertimes(s.db, s.matchId)).toBe(1);
    expect(undoButton()).toBeDisabled();
  });
});

describe("Undo with the new-player form on top, and after a window change", () => {
  it("RF-057 RF-035: with the form on top the history is kept, and after returning «Deshacer» removes the mark while Nora stays in the team and the call-up", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await pressCallUp();
    await pressCreatePlayer();
    expect(s.store.getState().history).toHaveLength(1);
    await addViaForm("Nora", "15");
    await waitFor(() =>
      expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`),
    );
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(open).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(cellState("Nora", "P1")).toBe("empty");
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(undoButton()).toBeDisabled();
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
    expect(savedCallUp(s.db, s.matchId)).toContain("15 Nora");
    expect(savedTeam(s.db, s.teamId)).toContain("15 Nora");
  });

  it("RF-057: leaving the new-player form without saving, with Back twice, returns to the grid with the history intact", async () => {
    const s = startSession(squadSpecs(9));
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await tap("Jugador 2", "P1");
    await pressCallUp();
    await pressCreatePlayer();
    await testRouter.back();
    await testRouter.back();
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    expect(close).not.toHaveBeenCalled();
    expect(s.store.getState().history).toHaveLength(2);
    await pressButton(UNDO);
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
  });

  it("RF-057 RF-076: rotating from a phone to a tablet window, on the grid or on the call-up screen, keeps the history and the session", async () => {
    const s = startSession(squadSpecs(9));
    const open = jest.spyOn(s.store.getState(), "openMatch");
    const close = jest.spyOn(s.store.getState(), "closeMatch");
    await openFromTeam(s);
    await tap("Jugador 1", "P1");
    await tap("Jugador 2", "P1");
    await setWindow(TABLET.width, TABLET.height);
    await waitFor(() => expect(undoButton()).toBeEnabled());
    await pressCallUp();
    await setWindow(PHONE.width, PHONE.height);
    await testRouter.back();
    await setWindow(TABLET.width, TABLET.height);
    expect(open).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(s.store.getState().history).toHaveLength(2);
    await pressButton(UNDO);
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    await pressButton(UNDO);
    await waitFor(() => expect(undoButton()).toBeDisabled());
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });
});
