// T071: the button «Todos los partidos» of the list of teams, how an item opens its match and when
// the list of every match loads (RF-057, RF-074, RF-083; D3 rules 3 and 5). Same doubles and
// assumed screens as match-lists.all.test.tsx (tests/support/match-lists.ts).
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { deleteMatch } from "@/data/match-repository";
import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import { screenTexts } from "../support/screen-reading";
import {
  setMockMatchSessionStore,
  useMockSquadStore,
} from "../support/mock-app-stores";
import {
  ALL_MATCHES,
  addMatch,
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
import { resetMockDatabase } from "../support/mock-database";

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

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let store: ReturnType<typeof matchesStoreOn>;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  setMockMatchSessionStore(createMatchSessionStore(db));
  store = matchesStoreOn(db);
});

describe("list of every match, the button that opens it", () => {
  it.each([
    ["no teams", false],
    ["two teams", true],
  ])(
    "RF-074: with %s the list of teams shows «Todos los partidos» next to «Nuevo equipo», and pressing it opens the list of every match",
    async (_name, withTeams) => {
      if (withTeams) seedThreeMatches(db);
      await renderRouter("./src/app");
      expect(
        await screen.findByRole("button", { name: "Nuevo equipo" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: ALL_MATCHES }),
      ).toBeOnTheScreen();
      await pressAllMatches();
      expect(screen).toHavePathname("/matches");
    },
  );

  it("RF-074: with teams the list of teams has the button and still shows only the teams' own texts", async () => {
    seedThreeMatches(db);
    await renderRouter("./src/app");
    await screen.findByText("Alevín A");
    expect(screen.getByRole("button", { name: ALL_MATCHES })).toBeOnTheScreen();
    expect(screenTexts()).toEqual(["Alevín A", "2015", "Cadete B"]);
  });

  it("RF-057 RF-074: Back from the list of every match returns to the list of teams", async () => {
    seedThreeMatches(db);
    await openAllFromTeams();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    await testRouter.back();
    expect(screen).toHavePathname("/");
  });
});

describe("list of every match, an item opens its match", () => {
  it("RF-057 RF-074: tapping an item pushes /matches/<id> of that match, and Back returns to this list", async () => {
    seedThreeMatches(db);
    await openAllFromTeams();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    await pressItemOf("08/11/2026");
    await waitFor(() => expect(screen).toHavePathname("/matches/3"));
    await testRouter.back();
    expect(screen).toHavePathname("/matches");
    expect(itemDates()).toEqual(["15/11/2026", "08/11/2026", "01/11/2026"]);
  });

  it.each([
    ["15/11/2026", "/matches/2"],
    ["01/11/2026", "/matches/1"],
  ])("RF-074: the item of %s opens %s", async (date, pathname) => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    await pressItemOf(date);
    await waitFor(() => expect(screen).toHavePathname(pathname));
  });
});

describe("list of every match, it loads on every focus (D3 rules 3 and 5)", () => {
  it("RF-074: the list asks the store for the matches when it gets focus, and again each time it regains it", async () => {
    seedThreeMatches(db);
    const load = jest.spyOn(store.getState(), "loadAll");
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    expect(load).toHaveBeenCalled();
    const before = load.mock.calls.length;
    await testRouter.push("/teams/1");
    await screen.findByRole("button", { name: "Nuevo jugador" });
    await testRouter.back();
    await waitFor(() => expect(load.mock.calls.length).toBeGreaterThan(before));
  });

  it("RF-074: the list is not read before it has focus: opening the app on the list of teams loads nothing", async () => {
    seedThreeMatches(db);
    const load = jest.spyOn(store.getState(), "loadAll");
    await renderRouter("./src/app");
    await screen.findByRole("button", { name: ALL_MATCHES });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    ["deleted in the database", (id: number) => deleteMatch(db, id)],
    [
      "deleted by the store's deleteMatch",
      (id: number) => store.getState().deleteMatch(id),
    ],
  ])(
    "RF-074 RF-083: a match %s while another screen covers the list is gone when the list regains focus",
    async (_how, remove) => {
      seedThreeMatches(db);
      await openAllAlone();
      await waitFor(() => expect(itemButtons()).toHaveLength(3));
      await testRouter.push("/teams/1");
      await screen.findByRole("button", { name: "Nuevo jugador" });
      remove(3);
      await testRouter.back();
      await waitFor(() => expect(itemButtons()).toHaveLength(2));
      expect(itemDates()).toEqual(["15/11/2026", "01/11/2026"]);
    },
  );

  it("RF-074: a match created while another screen covers the list is listed, once, when the list regains focus", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    await testRouter.push("/teams/1");
    await screen.findByRole("button", { name: "Nuevo jugador" });
    addMatch(db, 2, { date: "2026-11-20", format: 4 });
    await testRouter.back();
    await waitFor(() => expect(itemButtons()).toHaveLength(4));
    expect(itemDates()).toEqual([
      "20/11/2026",
      "15/11/2026",
      "08/11/2026",
      "01/11/2026",
    ]);
    expect(itemTexts()[0]).toContain("4 periodos");
  });
});
