// T071: the list of every match, `/matches` (RF-057, RF-074, RF-083, E-023), and the button that
// opens it. Real src/app routes through renderRouter, the real squad and matches stores and the
// real match session store on the in-memory database; the doubles are those of
// team-forms.render-updates.test.tsx (expo-sqlite, splash screen, initializeDatabase and the store
// getters of `@/state/app-stores`). Assumed screens: tests/support/match-lists.ts.
import { screen, waitFor } from "expo-router/testing-library";

import { createTeam } from "@/data/team-repository";
import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import { headerConfigs, screenTexts } from "../support/screen-reading";
import {
  setMockMatchSessionStore,
  useMockSquadStore,
} from "../support/mock-app-stores";
import {
  ALL_MATCHES,
  EMPTY_MATCHES,
  addMatch,
  breakMatchReads,
  itemButtons,
  itemDates,
  itemScores,
  itemTexts,
  itemTimes,
  matchesStoreOn,
  openAllAlone,
  seedTeams,
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

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  setMockMatchSessionStore(createMatchSessionStore(db));
  matchesStoreOn(db);
});

describe("list of every match, what it shows", () => {
  it("RF-074 E-023: matches of two teams on 2026-11-01, 08 and 15, saved in another order, are listed 15, 8, 1, with dates as «15/11/2026»", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    expect(itemDates()).toEqual(["15/11/2026", "08/11/2026", "01/11/2026"]);
  });

  it("RF-074 RF-075: each item shows its team's name and category each in its own Text, its format and its home and away names joined", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    const [fifteenth, eighth, first] = itemTexts();
    expect(fifteenth).toEqual(
      expect.arrayContaining([
        "Local – Visitante",
        "6 periodos",
        "Alevín A",
        "2015",
      ]),
    );
    expect(eighth).toEqual(
      expect.arrayContaining(["Pavo – Visitante", "8 periodos", "Cadete B"]),
    );
    expect(first).toEqual(
      expect.arrayContaining([
        "Águilas – Rival",
        "72–65",
        "6 periodos",
        "Alevín A",
        "2015",
      ]),
    );
  });

  it("RF-074 RF-083: a match without a score shows no score and one without a time shows no time, and the one with both shows them", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    expect(itemScores()).toEqual([null, null, "72–65"]);
    expect(itemTimes()).toEqual([null, "12:00", null]);
  });

  it("RF-074: a team without a category shows only its name, with no empty line", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    const eighth = itemTexts()[1] ?? [];
    expect(eighth.filter((text) => text.trim() === "")).toEqual([]);
    expect(eighth.join("|")).not.toContain("null");
  });

  it("RF-074: two matches on 2026-11-08 at 10:00 and 12:00 are listed 12:00 first, and a match with no time goes after both", async () => {
    seedThreeMatches(db);
    addMatch(db, 1, { date: "2026-11-08", time: "10:00" });
    addMatch(db, 1, { date: "2026-11-08" });
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(5));
    expect(itemDates()).toEqual([
      "15/11/2026",
      "08/11/2026",
      "08/11/2026",
      "08/11/2026",
      "01/11/2026",
    ]);
    expect(itemTimes().slice(1, 4)).toEqual(["12:00", "10:00", null]);
  });

  it("RF-074 E-023: a single match without a score or a time is listed once, with only its date, names and format", async () => {
    seedTeams(db);
    addMatch(db, 1, { date: "2026-03-01" });
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    expect(itemDates()).toEqual(["01/03/2026"]);
    expect(itemScores()).toEqual([null]);
    expect(itemTimes()).toEqual([null]);
    expect(itemTexts()[0]).toEqual(
      expect.arrayContaining(["Local – Visitante", "6 periodos", "Alevín A"]),
    );
  });
});

describe("list of every match, odd data", () => {
  it("RF-074: with no matches the screen shows «Todavía no hay partidos.» and no item", async () => {
    await openAllAlone();
    expect(await screen.findByText(EMPTY_MATCHES)).toBeOnTheScreen();
    expect(screenTexts()).toEqual([EMPTY_MATCHES]);
    expect(itemButtons()).toHaveLength(0);
  });

  it("RF-074: with matches the empty-list text is not shown", async () => {
    seedThreeMatches(db);
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(3));
    expect(screen.queryByText(EMPTY_MATCHES)).toBeNull();
  });

  it("RF-074: if reading the matches fails the screen shows «Todavía no hay partidos.» and no other text", async () => {
    seedThreeMatches(db);
    breakMatchReads(db);
    await openAllAlone();
    expect(await screen.findByText(EMPTY_MATCHES)).toBeOnTheScreen();
    expect(screenTexts()).toEqual([EMPTY_MATCHES]);
  });

  it("RF-074: long team names and categories, and a match with no names, are shown whole in lines cut by a line limit", async () => {
    const long = "Club Baloncesto Alevín Aragón Zaragoza Femenino 2015 A";
    const record = createTeam(db, {
      name: long,
      category: long,
      defaultFormat: 6,
    });
    addMatch(db, record.id, { date: "2026-11-11" });
    await openAllAlone();
    await waitFor(() => expect(itemButtons()).toHaveLength(1));
    const [name, category] = screen.getAllByText(long);
    expect(name?.props.numberOfLines).toBe(1);
    expect(category?.props.numberOfLines).toBe(1);
    expect(itemTexts()[0]).toContain("Local – Visitante");
  });

  it("RF-074: the header of the list is titled «Todos los partidos» and is visible", async () => {
    await openAllAlone();
    await screen.findByText(EMPTY_MATCHES);
    expect(headerConfigs()).toEqual([{ title: ALL_MATCHES, hidden: false }]);
  });
});
