// T099: sequences through the team's list of matches (RF-057, RF-075, RF-082, E-019, E-023): a
// match created and Back, a match opened from the team and left, and the app closed and opened
// again. Real src/app routes and stores on the in-memory database, as in
// match-lists.all.sequences.test.tsx. Assumed screens: tests/support/team-matches.ts.
import { act } from "@testing-library/react-native";
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import {
  itemButtons,
  itemDates,
  itemTexts,
  matchesStoreOn,
  pressItemOf,
} from "../support/match-lists";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedMarks, savedOvertimes } from "../support/match-session-marks";
import {
  ADD,
  PHONE,
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
import { resetMockDatabase } from "../support/mock-database";
import { freshDraft, pressNewMatch } from "../support/new-match-form";
import {
  pressSaveMatch,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  waitForPathname,
} from "../support/new-match-save";
import { showGrid, undoButton } from "../support/match-undo-routes";
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

describe("a match created from the team screen", () => {
  it("RF-075 RF-057 E-023: «Nuevo partido», «Guardar», Back from the grid: the team lists the match exactly once, dated «11/11/2026», and the new-match form is not in the stack", async () => {
    const db = resetMockDatabase();
    useMockSquadStore(createSquadStore(db));
    const team = seedSquadTeam(db, squadOf(12));
    freshDraft(db);
    startMatchSession(db);
    matchesStoreOn(db);
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: "Nuevo equipo" });
    await testRouter.push(`/teams/${team}`);
    await screen.findByText("Todavía no hay partidos.");
    await pressNewMatch();
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${team}`);
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    expect(itemDates()).toEqual(["11/11/2026"]);
    expect(itemTexts()[0]).toEqual(
      expect.arrayContaining(["Local – Visitante", "6 periodos"]),
    );
    expect(screen.queryByText("Todavía no hay partidos.")).toBeNull();
    expect(screen.queryByLabelText("Local")).toBeNull();
    await testRouter.back();
    expect(screen).toHavePathname("/");
  });
});

describe("a match opened from the team screen", () => {
  it("RF-075 RF-057: tapping the item opens its grid and Back returns to the team, which still lists it", async () => {
    const s = startSession(squadSpecs(9));
    useMockSquadStore(createSquadStore(s.db));
    matchesStoreOn(s.db);
    await renderRouter("./src/app", { initialUrl: `/teams/${s.teamId}` });
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(s.store.getState().status).toBe("closed");
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
  });

  it("RF-057 RF-075: open it from the team's list, mark a cell, Back, open it again: the mark is saved and «Deshacer» has nothing to undo", async () => {
    const s = startSession(squadSpecs(9));
    useMockSquadStore(createSquadStore(s.db));
    matchesStoreOn(s.db);
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    await tap("Jugador 1", "P1");
    expect(undoButton()).toBeEnabled();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(s.store.getState().status).toBe("closed");
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    expect(undoButton()).toBeDisabled();
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });
});

describe("the app closed and opened again (E-019 through the interface)", () => {
  it("RF-057 RF-082 RF-075 E-019: marks in P1–P3 and an overtime, the tree unmounted and rendered again with new stores: the list of teams, then the team, then the match from its list with the same marks and overtime and nothing to undo", async () => {
    const s = startSession(squadSpecs(9));
    useMockSquadStore(createSquadStore(s.db));
    matchesStoreOn(s.db);
    await renderRouter("./src/app");
    await fireEvent.press(await screen.findByText("Alevín A"));
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    await pressItemOf("11/11/2026");
    await showGrid();
    for (const column of ["P1", "P2", "P3"]) await tap("Jugador 1", column);
    await pressButton(ADD);
    await waitFor(() => expect(columnTitles()).toContain("PR1"));
    await act(async () => screen.unmount());
    setMockMatchSessionStore(createMatchSessionStore(s.db));
    useMockSquadStore(createSquadStore(s.db));
    matchesStoreOn(s.db);
    await renderRouter("./src/app");
    await screen.findByText("Alevín A");
    expect(screen).toHavePathname("/");
    expect(cellButtons()).toHaveLength(0);
    await fireEvent.press(screen.getByText("Alevín A"));
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    expect(itemDates()).toEqual(["11/11/2026"]);
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    for (const column of ["P1", "P2", "P3"]) {
      expect(cellState("Jugador 1", column)).toBe("starter");
    }
    expect(columnTitles()).toContain("PR1");
    expect(savedOvertimes(s.db, s.matchId)).toBe(1);
    expect(undoButton()).toBeDisabled();
  });
});
