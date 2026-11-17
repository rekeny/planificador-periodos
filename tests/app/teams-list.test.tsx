// T033: the app opens on the list of teams (RF-073, RF-014, RF-012). The real src/app routes run
// through renderRouter. Doubles: expo-splash-screen (native), initializeDatabase (so a test can
// keep the database "not ready") and `@/state/app-stores`, which hands out the squad store of the
// test: a real store on the in-memory database of tests/support/mock-database.ts. The screen must
// read it with `getSquadStore()` from `@/state/app-stores` when it renders (never at import time)
// and ask it for the teams with `loadTeams()`; teams are seeded with ANOTHER store on the same
// database, so a screen that never calls `loadTeams()` shows nothing and the test fails.
// Assumed layout of a row: the team name in its own Text and, only if there is one, the category
// in the next Text; the screen has no other Text. The header title is read by `headerConfigs()`.
import {
  act,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import es from "@/i18n/es.json";
import { createSquadStore } from "@/state/squad-store";
import { ALEVIN, breakReads, CADETE } from "../support/squad-fixtures";
import type { SquadStore, TeamInput } from "../support/squad-fixtures";
import { headerConfigs, screenTexts } from "../support/screen-reading";
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
jest.mock("@/state/database-ready", () => ({ initializeDatabase: jest.fn() }));

let mockStore: SquadStore | undefined;
jest.mock("@/state/app-stores", () => ({
  getSquadStore: () => {
    if (mockStore === undefined) {
      throw new Error("The test gave no squad store");
    }
    return mockStore;
  },
}));

const { initializeDatabase } = jest.requireMock<{
  initializeDatabase: jest.Mock<Promise<void>, []>;
}>("@/state/database-ready");

const EMPTY = "Todavía no hay equipos. Crea el primero.";
const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

function seed(teams: readonly TeamInput[]): void {
  const seeder = createSquadStore(db);
  teams.forEach((team) => seeder.getState().createTeam(team));
}

function team(name: string, category: string | null = null): TeamInput {
  return { name, category, defaultFormat: 6 };
}

async function openApp(): Promise<void> {
  await renderRouter("./src/app");
}

beforeEach(() => {
  db = resetMockDatabase();
  mockStore = createSquadStore(db);
  initializeDatabase.mockReset();
  initializeDatabase.mockReturnValue(Promise.resolve());
});

describe("list of teams, opening the app", () => {
  it("RF-073: the app opens on the list of teams with «Alevín A» before «Cadete B»", async () => {
    seed([CADETE, ALEVIN]);
    await openApp();
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screenTexts()).toEqual(["Alevín A", "2015", "Cadete B"]);
    expect(screen).toHavePathname("/");
  });

  it("RF-073: the header shows «Equipos», it is visible and the root route has no back to go to", async () => {
    await openApp();
    await screen.findByText(EMPTY);
    expect(headerConfigs()).toEqual([{ title: "Equipos", hidden: false }]);
    expect(testRouter.canGoBack()).toBe(false);
  });

  it("RF-073 RF-012: with no team the screen shows only «Todavía no hay equipos. Crea el primero.»", async () => {
    await openApp();
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screenTexts()).toEqual([EMPTY]);
  });

  it("RF-012: es.json holds the texts of the list of teams", () => {
    const texts = es as unknown as { teams?: Record<string, string> };
    expect(texts.teams?.title).toBe("Equipos");
    expect(texts.teams?.empty).toBe(EMPTY);
  });

  it("RF-073 RF-012: with teams the screen shows only team names and categories, in Spanish, and no empty-list text", async () => {
    seed([CADETE, ALEVIN, team("Benjamín", "2017")]);
    await openApp();
    await screen.findByText("Alevín A");
    expect(screenTexts()).toEqual([
      "Alevín A",
      "2015",
      "Benjamín",
      "2017",
      "Cadete B",
    ]);
  });
});

describe("list of teams, boundaries and odd data", () => {
  it("RF-073: one team is listed with its category", async () => {
    seed([ALEVIN]);
    await openApp();
    await screen.findByText("Alevín A");
    expect(screenTexts()).toEqual(["Alevín A", "2015"]);
  });

  it("RF-014: two teams are both listed", async () => {
    seed([ALEVIN, CADETE]);
    await openApp();
    await screen.findByText("Alevín A");
    expect(screen.getByText("Cadete B")).toBeTruthy();
  });

  it("RF-014: two teams with the same name are both listed", async () => {
    seed([team("Alevín A", "2015"), team("Alevín A", "2016")]);
    await openApp();
    await screen.findAllByText("Alevín A");
    expect(screenTexts()).toEqual(["Alevín A", "2015", "Alevín A", "2016"]);
  });

  it("RF-073: a name typed with spaces around is shown without them", async () => {
    seed([team("  Alevín A  ")]);
    await openApp();
    await screen.findByText("Alevín A");
    expect(screenTexts()).toEqual(["Alevín A"]);
  });

  it("RF-073: a team without category shows no empty category line", async () => {
    seed([CADETE]);
    await openApp();
    await screen.findByText("Cadete B");
    expect(screenTexts()).toEqual(["Cadete B"]);
  });

  it("RF-073: a 40-character name is shown whole in one line and cut with an ellipsis if it does not fit", async () => {
    seed([team(FORTY)]);
    await openApp();
    const name = await screen.findByText(FORTY);
    expect(FORTY).toHaveLength(40);
    expect(name.props.numberOfLines).toBe(1);
  });

  it("RF-073: accents, ñ and emoji are shown as typed and sorted in Spanish order", async () => {
    seed([team("Zaragoza"), team("Águilas 🏀"), team("Ñandú"), team("Bravos")]);
    await openApp();
    await screen.findByText("Águilas 🏀");
    expect(screenTexts()).toEqual([
      "Águilas 🏀",
      "Bravos",
      "Ñandú",
      "Zaragoza",
    ]);
  });
});

describe("list of teams, sequences and interruptions", () => {
  it("RF-073: a team created through the store appears without restarting the app", async () => {
    await openApp();
    await screen.findByText(EMPTY);
    await act(async () => {
      mockStore?.getState().createTeam(ALEVIN);
    });
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText(EMPTY)).toBeNull();
  });

  it("RF-073: launching the app again, with a new store on the same database, shows the list of teams first", async () => {
    seed([CADETE, ALEVIN]);
    await openApp();
    await screen.findByText("Alevín A");
    await act(async () => screen.unmount());
    mockStore = createSquadStore(db);
    await openApp();
    await screen.findByText("Alevín A");
    expect(screenTexts()).toEqual(["Alevín A", "2015", "Cadete B"]);
    expect(screen).toHavePathname("/");
  });

  it("RF-073: nothing, not even the empty-list text, is drawn until the database is ready", async () => {
    seed([ALEVIN]);
    let ready = (): void => {};
    initializeDatabase.mockReturnValue(
      new Promise<void>((resolve) => {
        ready = resolve;
      }),
    );
    await openApp();
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screenTexts()).toEqual([]);
    await act(async () => {
      ready();
    });
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText(EMPTY)).toBeNull();
  });
});

describe("list of teams, when reading fails", () => {
  it("RF-073 RF-012: if reading the teams fails the screen shows the empty list and no other text", async () => {
    seed([ALEVIN]);
    breakReads(db, "teams");
    await openApp();
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screenTexts()).toEqual([EMPTY]);
  });
});
