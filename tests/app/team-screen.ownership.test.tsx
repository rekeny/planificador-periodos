// T099 (D3 rules 3, 4 and 5): the team screen draws only the matches of its own route's team,
// loads them with `loadTeam(teamId)` on every focus, and updates no store while rendering. Real
// src/app routes and stores on the in-memory database; the doubles are those of
// team-screen.test.tsx. Assumed screens: tests/support/team-matches.ts.
import { act } from "@testing-library/react-native";
import { sql } from "drizzle-orm";
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import {
  addMatch,
  itemDates,
  itemTexts,
  matchesStoreOn,
  pressItemOf,
} from "../support/match-lists";
import {
  setMockMatchSessionStore,
  useMockSquadStore,
} from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { freshDraft } from "../support/new-match-form";
import { waitForPathname } from "../support/new-match-save";
import {
  renderUpdateWarnings,
  seedTwoTeams,
  spyOnLoadTeam,
  teamTexts,
} from "../support/team-matches";
import { openTeamAlone } from "../support/team-screen";

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

const FIRST_MATCH = "Águilas – Rival";
const SECOND_TEAM_MATCH = "Zorros – Osos";

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let store: ReturnType<typeof matchesStoreOn>;
let ids: { first: number; second: number };
let errors: jest.SpyInstance;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  setMockMatchSessionStore(createMatchSessionStore(db));
  store = matchesStoreOn(db);
  ids = seedTwoTeams(db);
  errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errors.mockRestore());

async function openFirstTeamFromList(): Promise<void> {
  await renderRouter("./src/app");
  await screen.findByRole("button", { name: "Nuevo equipo" });
  await testRouter.push(`/teams/${ids.first}`);
  await screen.findByText(FIRST_MATCH);
}

describe("team screen, route ownership (D3 rule 4)", () => {
  it("RF-075: team 1, then team 2 pushed on top, then Back: team 1 shows its own matches and none of team 2", async () => {
    await openFirstTeamFromList();
    await testRouter.push(`/teams/${ids.second}`);
    expect(await screen.findAllByText(SECOND_TEAM_MATCH)).toHaveLength(1);
    expect(screen.queryByText(FIRST_MATCH)).toBeNull();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${ids.first}`);
    expect(await screen.findByText(FIRST_MATCH)).toBeOnTheScreen();
    expect(screen.queryByText(SECOND_TEAM_MATCH)).toBeNull();
    expect(itemDates()).toEqual(["15/11/2026", "08/11/2026", "01/11/2026"]);
    expect(store.getState().teamMatches?.teamId).toBe(ids.first);
  });

  it("RF-075: team 2 on top of team 1 lists only its own match, once, and team 1's screen below does not draw it a second time", async () => {
    await openFirstTeamFromList();
    await testRouter.push(`/teams/${ids.second}`);
    await screen.findAllByText(SECOND_TEAM_MATCH);
    expect(screen.getAllByText(SECOND_TEAM_MATCH)).toHaveLength(1);
    expect(itemDates()).toEqual(["20/11/2026"]);
  });

  it("RF-075: the list held by the store belongs to another team and cannot be loaded: team 1's screen draws none of its matches", async () => {
    store.getState().loadTeam(ids.second);
    const load = spyOnLoadTeam(store).mockImplementation(() => undefined);
    await openTeamAlone(ids.first);
    expect(load).toHaveBeenCalledWith(ids.first);
    expect(store.getState().teamMatches?.teamId).toBe(ids.second);
    expect(screen.queryByText(SECOND_TEAM_MATCH)).toBeNull();
    expect(itemDates()).not.toContain("20/11/2026");
  });

  it("RF-075: another team's list that lands in the store while team 1's screen is open is not drawn there", async () => {
    await openTeamAlone(ids.first);
    await screen.findByText(FIRST_MATCH);
    store.getState().loadTeam(ids.second);
    const foreign = store.getState().teamMatches;
    expect(foreign?.teamId).toBe(ids.second);
    await act(async () => store.setState({ teamMatches: foreign }));
    expect(screen.queryByText(SECOND_TEAM_MATCH)).toBeNull();
    expect(teamTexts()).not.toContain(SECOND_TEAM_MATCH);
  });
});

describe("team screen, loading on every focus (D3 rules 4 and 5)", () => {
  it("RF-075: the screen loads its own team's list with loadTeam(teamId) when it opens, when another team's screen takes the store, and when it regains focus", async () => {
    const load = spyOnLoadTeam(store);
    await openFirstTeamFromList();
    expect(load.mock.calls[0]).toEqual([ids.first]);
    await testRouter.push(`/teams/${ids.second}`);
    await screen.findAllByText(SECOND_TEAM_MATCH);
    expect(load).toHaveBeenCalledWith(ids.second);
    await testRouter.back();
    await screen.findByText(FIRST_MATCH);
    const teams = load.mock.calls.map((call) => call[0]);
    expect(teams.length).toBeGreaterThanOrEqual(3);
    expect(teams.at(-1)).toBe(ids.first);
    expect(new Set(teams)).toEqual(new Set([ids.first, ids.second]));
  });

  it("RF-075 RF-082: a match created, a match deleted and a match changed to 8 periods behind the team screen show when it regains focus", async () => {
    await openFirstTeamFromList();
    await testRouter.push(`/teams/${ids.first}/players/new`);
    await screen.findByLabelText("Dorsal");
    addMatch(db, ids.first, { date: "2026-11-22", homeName: "Nuevos" });
    db.run(sql`DELETE FROM matches WHERE date = '2026-11-15'`);
    db.run(sql`UPDATE matches SET format = 8 WHERE date = '2026-11-01'`);
    await testRouter.back();
    expect(await screen.findByText("Nuevos – Visitante")).toBeOnTheScreen();
    expect(itemDates()).toEqual(["22/11/2026", "08/11/2026", "01/11/2026"]);
    expect(itemTexts()[2]).toContain("8 periodos");
  });
});

describe("team screen, no store update while rendering (D3 rule 3, F-03)", () => {
  it("RF-075 F-03: the team opened from the list of teams, a match opened and closed, team 2 over team 1 and back, the new-match form and back: no «Cannot update a component» warning", async () => {
    freshDraft(db);
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: "Nuevo equipo" });
    await testRouter.push(`/teams/${ids.first}`);
    await screen.findByText(FIRST_MATCH);
    await pressItemOf("15/11/2026");
    await waitForPathname("/matches/2");
    await screen.findByRole("button", { name: "Convocatoria" });
    await testRouter.back();
    await testRouter.push(`/teams/${ids.second}`);
    await screen.findAllByText(SECOND_TEAM_MATCH);
    await testRouter.back();
    await testRouter.push(`/teams/${ids.first}/matches/new`);
    await screen.findByLabelText("Local");
    await testRouter.back();
    await waitFor(() => expect(screen).toHavePathname(`/teams/${ids.first}`));
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-075 F-03: the team screen opened as a deep link, with a store that holds another team's list, logs no render-update warning", async () => {
    store.getState().loadTeam(ids.second);
    await openTeamAlone(ids.first);
    await screen.findByText(FIRST_MATCH);
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
