// F-D3-03b (second Codex review of PR 25, finding 1, RF-029): a match that also sits EARLIER in the
// stack, under other screens, is gone after its deletion too. Popping only the routes of the match
// at the top leaves the earlier `/matches/1`, and Back then reaches the deleted match. After the
// deletion no screen of match 1 is in the stack at all (hidden ones included), Back never reaches
// one nor «not found», the session is closed and the app is on a route that exists (which safe
// screen it is, is not pinned). Real src/app routes through renderRouter; same doubles as
// match-details.delete.stacks.test.tsx.
import { screen } from "expo-router/testing-library";

import { seedDetails } from "../support/match-details";
import {
  backThroughTheStack,
  deleteAndSettle,
  details_list_grid_details,
  expectNoTraceOfTheMatch,
  grid_list_grid_details,
  grid_team_grid_details,
  waitForDeletion,
  watchTheWay,
} from "../support/match-details-stacks";
import { matchIds } from "../support/match-details-actions";

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

afterEach(() => {
  jest.restoreAllMocks();
});

const STACKS = [
  [
    "/, the grid, the list, the grid again and its details",
    grid_list_grid_details,
  ],
  [
    "/, the grid and its details, the list, the grid again and its details",
    details_list_grid_details,
  ],
  [
    "/, the grid, the team screen, the grid again and its details",
    grid_team_grid_details,
  ],
] as const;

describe("match details, deleting a match that also sits earlier in the stack (F-D3-03b, RF-029)", () => {
  it.each(STACKS)(
    "F-D3-03b RF-029: with the stack %s, the deletion leaves no screen of the deleted match anywhere in the stack, closes the session and ends on a route that exists",
    async (_name, open) => {
      const seeded = seedDetails({ format: 6 });
      await open(seeded);
      const way = watchTheWay(seeded);
      await deleteAndSettle();
      await waitForDeletion(seeded);
      expectNoTraceOfTheMatch(seeded, way);
      expect(matchIds(seeded.db)).toEqual([]);
      expect(screen.toJSON()).not.toBeNull();
    },
  );

  it.each(STACKS)(
    "F-D3-03b RF-029: with the stack %s, going Back repeatedly after the deletion never reaches a screen of the deleted match or «not found»",
    async (_name, open) => {
      const seeded = seedDetails({ format: 6 });
      await open(seeded);
      const way = watchTheWay(seeded);
      await deleteAndSettle();
      await waitForDeletion(seeded);
      await backThroughTheStack();
      way.stop();
      expect(way.seen).not.toContain("notFound");
      expect(way.notFound).not.toHaveBeenCalled();
      expect(seeded.store.getState().status).toBe("closed");
    },
  );
});
