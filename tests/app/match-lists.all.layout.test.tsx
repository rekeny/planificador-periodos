// T071 (D3 rule 6): the assembled screens of this task, at 375 × 667 and 667 × 375 (phone) and
// 1024 × 768 and 768 × 1024 (tablet): the list of teams with its two buttons, and the list of every
// match with its items. Jest has no layout engine, so these tests check the configuration (the
// buttons and items are rendered, the long lists scroll vertically and nothing disables the scroll,
// the lines that can grow are cut by a line limit); the geometry is checked on a device (T079).
// Real src/app routes and stores on the in-memory database, as in match-lists.all.test.tsx.
import { renderRouter, screen, within } from "expo-router/testing-library";

import { createTeam } from "@/data/team-repository";
import { createMatchSessionStore } from "@/state/match-session-store";
import { createSquadStore } from "@/state/squad-store";
import {
  setMockMatchSessionStore,
  useMockSquadStore,
} from "../support/mock-app-stores";
import {
  ALL_MATCHES,
  addMatch,
  itemButtons,
  itemTexts,
  matchesStoreOn,
  openAllAlone,
  seedThreeMatches,
} from "../support/match-lists";
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
  setMockMatchSessionStore(createMatchSessionStore(db));
  matchesStoreOn(db);
});
afterEach(restoreWindow);

/** The vertical, enabled ScrollViews of the screen (the FlatLists draw one each). */
function scrolls() {
  return screen.container
    .queryAll((node) => node.type === "RCTScrollView")
    .filter(
      (view) =>
        view.props.horizontal !== true && view.props.scrollEnabled !== false,
    );
}

describe("list of teams with «Todos los partidos», in the assembled screen", () => {
  it.each(SIZES)(
    "RF-074 RF-076: on %s, with no teams, «Nuevo equipo» and «Todos los partidos» are both rendered",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await renderRouter("./src/app");
      expect(
        await screen.findByRole("button", { name: "Nuevo equipo" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: ALL_MATCHES }),
      ).toBeOnTheScreen();
    },
  );

  it.each(SIZES)(
    "RF-074 RF-076: on %s, with 12 teams, both buttons are rendered inside a vertical scroll that the coach can reach",
    async (_kind, width, height) => {
      await setWindow(width, height);
      for (let team = 1; team <= 12; team += 1) {
        createTeam(db, {
          name: `Equipo ${team}`,
          category: null,
          defaultFormat: 6,
        });
      }
      await renderRouter("./src/app");
      await screen.findByText("Equipo 1");
      const inScroll = (name: string): boolean =>
        scrolls().some(
          (view) => within(view).queryByRole("button", { name }) !== null,
        );
      expect(inScroll("Nuevo equipo")).toBe(true);
      expect(inScroll(ALL_MATCHES)).toBe(true);
    },
  );
});

describe("list of every match, in the assembled screen", () => {
  it.each(SIZES)(
    "RF-074 RF-076: on %s, 12 matches are in a vertical scroll that is not disabled, and the newest item is rendered with its texts",
    async (_kind, width, height) => {
      await setWindow(width, height);
      seedThreeMatches(db);
      for (let day = 1; day <= 9; day += 1) {
        addMatch(db, 1, { date: `2026-12-0${day}` });
      }
      await openAllAlone();
      const names = await screen.findAllByText("Local – Visitante");
      const [list] = scrolls();
      expect(list).toBeDefined();
      expect(
        names.some(
          (name) =>
            list &&
            within(list).queryAllByText("Local – Visitante").includes(name),
        ),
      ).toBe(true);
      expect(itemButtons().length).toBeGreaterThan(0);
      expect(itemTexts()[0]).toContain("09/12/2026");
      expect(itemTexts()[0]).toContain("Alevín A");
      expect(
        itemButtons().every(
          (button) =>
            list && within(list).queryAllByRole("button").includes(button),
        ),
      ).toBe(true);
    },
  );

  it.each(SIZES)(
    "RF-074 RF-076: on %s, a team with a very long name and category and a match with very long home and away names are rendered with every line limited to a line count",
    async (_kind, width, height) => {
      await setWindow(width, height);
      const team = createTeam(db, {
        name: LONG,
        category: LONG,
        defaultFormat: 8,
      });
      addMatch(db, team.id, {
        format: 8,
        homeName: LONG,
        awayName: LONG,
        homeScore: 100,
        awayScore: 99,
      });
      await openAllAlone();
      const names = await screen.findAllByText(LONG);
      expect(names).toHaveLength(2);
      names.forEach((name) => expect(name.props.numberOfLines).toBe(1));
      const sides = screen.getByText(`${LONG} – ${LONG}`);
      expect(sides.props.numberOfLines).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("100–99")).toBeOnTheScreen();
      expect(screen.getByText("8 periodos")).toBeOnTheScreen();
    },
  );

  it.each(SIZES)(
    "RF-074 RF-076: on %s, with no matches the empty text is rendered",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await openAllAlone();
      expect(
        await screen.findByText("Todavía no hay partidos."),
      ).toBeOnTheScreen();
    },
  );
});
