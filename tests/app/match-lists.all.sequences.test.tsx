// T071: sequences through the list of every match (RF-057, RF-074, RF-083, E-023) and the check
// that going to the list and back updates no store while rendering (D3 rule 3, F-03, as in
// team-forms.render-updates.test.tsx). Real src/app routes and stores on the in-memory database;
// the doubles are those of match-lists.all.test.tsx. Assumed screens: tests/support/match-lists.ts.
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { freshDraft, pressNewMatch } from "../support/new-match-form";
import { startSession } from "../support/call-up-screen";
import {
  pressSaveMatch,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  waitForPathname,
} from "../support/new-match-save";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedMarks } from "../support/match-session-marks";
import { cellState, PHONE, tap } from "../support/match-screen-grid";
import { showGrid, undoButton } from "../support/match-undo-routes";
import {
  itemButtons,
  itemDates,
  itemTexts,
  matchesStoreOn,
  openAllAlone,
  openAllFromTeams,
  pressAllMatches,
  pressItemOf,
  seedThreeMatches,
} from "../support/match-lists";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
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

describe("a match created, then the list of every match", () => {
  it("RF-057 RF-074 E-023: create a match from the team, Back twice, open «Todos los partidos»: the match is listed exactly once, dated «11/11/2026»", async () => {
    const db = resetMockDatabase();
    useMockSquadStore(createSquadStore(db));
    const team = seedSquadTeam(db, squadOf(12));
    freshDraft(db);
    startMatchSession(db);
    matchesStoreOn(db);
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: "Nuevo equipo" });
    await testRouter.push(`/teams/${team}`);
    await pressNewMatch();
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${team}`);
    await testRouter.back();
    expect(screen).toHavePathname("/");
    await pressAllMatches();
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    expect(itemDates()).toEqual(["11/11/2026"]);
    expect(itemTexts()[0]).toEqual(
      expect.arrayContaining(["Local – Visitante", "6 periodos", "Alevín A"]),
    );
  });

  it("RF-074: with the list already open under the form, a match created over it is listed exactly once when Back returns to the list", async () => {
    const db = resetMockDatabase();
    useMockSquadStore(createSquadStore(db));
    const team = seedSquadTeam(db, squadOf(12));
    freshDraft(db);
    startMatchSession(db);
    matchesStoreOn(db);
    await openAllAlone();
    await screen.findByText("Todavía no hay partidos.");
    await testRouter.push(`/teams/${team}/matches/new`);
    await screen.findByLabelText("Local");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    await testRouter.back();
    await waitForPathname("/matches");
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    expect(screen.queryByText("Todavía no hay partidos.")).toBeNull();
  });
});

describe("a match opened from the list of every match", () => {
  it("RF-057 RF-074: open it from the list, mark a cell, Back, open it again: the mark is saved and «Deshacer» has nothing to undo", async () => {
    const s = startSession(squadSpecs(9));
    useMockSquadStore(createSquadStore(s.db));
    matchesStoreOn(s.db);
    await openAllFromTeams();
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    await tap("Jugador 1", "P1");
    expect(undoButton()).toBeEnabled();
    await testRouter.back();
    expect(screen).toHavePathname("/matches");
    expect(s.store.getState().status).toBe("closed");
    await pressItemOf("11/11/2026");
    await waitForPathname(`/matches/${s.matchId}`);
    await showGrid();
    expect(undoButton()).toBeDisabled();
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });
});

describe("going to the list of every match and back (D3 rule 3, F-03)", () => {
  let errors: jest.SpyInstance;

  beforeEach(() => {
    errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errors.mockRestore());

  /** The React warnings about a component updating while another one renders. */
  function renderUpdateWarnings(): string[] {
    return errors.mock.calls
      .map((call) => call.map(String).join(" "))
      .filter((message) => /Cannot update a component/.test(message));
  }

  it("RF-074 F-03: from the list of teams to the list of every match with matches, into a match and back to the teams, no «Cannot update a component» warning is logged", async () => {
    const db = resetMockDatabase();
    useMockSquadStore(createSquadStore(db));
    startMatchSession(db);
    matchesStoreOn(db);
    seedThreeMatches(db);
    await openAllFromTeams();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    await pressItemOf("15/11/2026");
    await waitForPathname("/matches/2");
    await screen.findByRole("button", { name: "Convocatoria" });
    await testRouter.back();
    expect(screen).toHavePathname("/matches");
    await testRouter.back();
    expect(screen).toHavePathname("/");
    expect(renderUpdateWarnings()).toEqual([]);
  });

  it("RF-074 F-03: the list with no matches opens and closes with no render-update warning", async () => {
    const db = resetMockDatabase();
    useMockSquadStore(createSquadStore(db));
    matchesStoreOn(db);
    await openAllFromTeams();
    await screen.findByText("Todavía no hay partidos.");
    await testRouter.back();
    expect(screen).toHavePathname("/");
    expect(renderUpdateWarnings()).toEqual([]);
  });
});
