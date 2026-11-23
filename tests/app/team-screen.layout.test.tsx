// T099 (D3 rule 6): the assembled team screen at 375 × 667 and 667 × 375 (phone) and 1024 × 768
// and 768 × 1024 (tablet), with its players and matches. Jest has no layout engine, so these tests
// check the configuration (every button and heading is rendered, the one list scrolls vertically
// and nothing disables the scroll, the lines that can grow are cut); the geometry is checked on a
// device (T079). Real src/app routes and stores on the in-memory database.
import { screen, within } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { addMatch, itemButtons, matchesStoreOn } from "../support/match-lists";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { ALEVIN } from "../support/squad-fixtures";
import {
  EMPTY_MATCHES,
  MATCHES,
  PLAYERS,
  scrollToEnd,
  scrolls,
} from "../support/team-matches";
import { openTeamAlone, seedTeam } from "../support/team-screen";
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

const SIZES = [
  ["a phone in portrait", 375, 667],
  ["a phone in landscape", 667, 375],
  ["a tablet in landscape", 1024, 768],
  ["a tablet in portrait", 768, 1024],
] as const;
const LONG = "Club Baloncesto Alevín Aragón Zaragoza Femenino 2015 A";

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  matchesStoreOn(db);
});
afterEach(restoreWindow);

/** A team of 13 players and 10 matches, on 1 to 10 December. */
function crowdedTeam(): number {
  const id = seedTeam(
    db,
    ALEVIN,
    Array.from({ length: 13 }, (_, n) => [`Jugador ${n + 1}`, String(n + 1)]),
  );
  for (let day = 1; day <= 10; day += 1) {
    addMatch(db, id, { date: `2026-12-${String(day).padStart(2, "0")}` });
  }
  return id;
}

describe("team screen with players and matches, in the assembled screen", () => {
  it.each(SIZES)(
    "RF-075 RF-076: on %s, the three buttons and the heading «Jugadores» are rendered and one vertical scroll that is not disabled holds the players",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openTeamAlone(crowdedTeam());
      expect(
        screen.getByRole("button", { name: "Nuevo partido" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Nuevo jugador" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Editar equipo" }),
      ).toBeOnTheScreen();
      const lists = scrolls();
      expect(lists).toHaveLength(1);
      const [list] = lists;
      expect(list && within(list).queryByText(PLAYERS)).not.toBeNull();
      expect(list && within(list).queryByText("Jugador 1")).not.toBeNull();
    },
  );

  it.each(SIZES)(
    "RF-075 RF-076: on %s, scrolled to its end the same list draws «Partidos» and every one of the 10 matches, as buttons",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openTeamAlone(crowdedTeam());
      const [list] = scrolls();
      if (list === undefined) throw new Error("No scroll");
      await scrollToEnd(list);
      expect(await screen.findByText(MATCHES)).toBeOnTheScreen();
      expect(within(list).getByText(MATCHES)).toBeOnTheScreen();
      expect(itemButtons()).toHaveLength(10);
      expect(
        itemButtons().every((item) =>
          within(list).queryAllByRole("button").includes(item),
        ),
      ).toBe(true);
    },
  );

  it.each(SIZES)(
    "RF-075 RF-076: on %s, a player with a very long name and a match with very long home and away names are rendered with their lines limited to a line count",
    async (_kind, width, height) => {
      await setWindow(width, height);
      const id = seedTeam(db, ALEVIN, [[LONG, "7"]]);
      addMatch(db, id, {
        homeName: LONG,
        awayName: LONG,
        homeScore: 100,
        awayScore: 99,
      });
      await openTeamAlone(id);
      const name = await screen.findByText(LONG);
      expect(name.props.numberOfLines).toBe(1);
      const sides = await screen.findByText(`${LONG} – ${LONG}`);
      expect(sides.props.numberOfLines).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("100–99")).toBeOnTheScreen();
    },
  );

  it.each(SIZES)(
    "RF-075 RF-076: on %s, a team with no matches draws «Partidos» and the empty text and the buttons",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openTeamAlone(seedTeam(db, ALEVIN, [["Ana", "4"]]));
      expect(await screen.findByText(EMPTY_MATCHES)).toBeOnTheScreen();
      expect(screen.getByText(MATCHES)).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Nuevo partido" }),
      ).toBeOnTheScreen();
    },
  );
});
