// F-D3-03 (Codex review of PR 25, finding 1, RF-029): deleting a match from its details leaves no
// screen of the deleted match, whatever the stack under the details. `dismiss(2)` is right for
// the normal stacks (team or list, grid, details: T096) but keeps the grid when it is the root of
// the stack (a restored session) and when two details screens of the same match are stacked. The
// app then ends on a safe screen that exists (the list of teams or of every match: the Implementer
// decides which, so the test pins both), the session is closed and «not found» never shows on the
// way. Real src/app routes through renderRouter; same doubles as match-details.delete.lists.test.tsx.
import { screen, testRouter } from "expo-router/testing-library";

import { seedDetails } from "../support/match-details";
import {
  SAFE_ROOTS,
  deleteAndSettle,
  expectNoTraceOfTheMatch,
  openDetailsOverRootGrid,
  openTwoDetailsOverRootGrid,
  waitForDeletion,
  watchTheWay,
} from "../support/match-details-stacks";
import {
  matchIds,
  openDetailsFromTeam,
} from "../support/match-details-actions";

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

const ROOT_STACKS = [
  [
    "the grid opened directly (a restored stack) with the details on it",
    openDetailsOverRootGrid,
  ],
  [
    "the grid opened directly with two details screens of the same match on it",
    openTwoDetailsOverRootGrid,
  ],
] as const;

describe("match details, deleting when the grid is the root of the stack (F-D3-03, RF-029)", () => {
  it.each(ROOT_STACKS)(
    "F-D3-03 RF-029: with %s, confirming the deletion leaves no screen of the deleted match, closes the session and ends on the list of teams or of every match",
    async (_name, open) => {
      const seeded = seedDetails({ format: 6 });
      await open(seeded);
      const way = watchTheWay(seeded);
      await deleteAndSettle();
      await waitForDeletion(seeded);
      expectNoTraceOfTheMatch(seeded, way);
      expect(screen).toHavePathname(expect.stringMatching(SAFE_ROOTS));
      expect(matchIds(seeded.db)).toEqual([]);
    },
  );
});

describe("match details, two details screens of the same match over the team screen (F-D3-03, RF-029)", () => {
  it("F-D3-03 RF-029: confirming the deletion from the top one leaves no screen of the deleted match and ends on the team screen", async () => {
    const seeded = seedDetails({ format: 6 });
    await openDetailsFromTeam(seeded);
    await testRouter.push(`/matches/${seeded.matchId}/edit`);
    await screen.findByLabelText("Local");
    const way = watchTheWay(seeded);
    await deleteAndSettle();
    await waitForDeletion(seeded);
    expectNoTraceOfTheMatch(seeded, way);
    expect(screen).toHavePathname(`/teams/${seeded.teamId}`);
  });
});
