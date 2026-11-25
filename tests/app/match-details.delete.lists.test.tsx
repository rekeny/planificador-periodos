// T096: a confirmed deletion from the match details leaves the match (RF-029, RF-057, RF-082,
// D3 rules 3 and 5). The details and the grid are popped together; the session closes with the
// grid's unmount; the screen below (the team, or the list of every match) no longer lists the match
// and never shows «No encontrado» or the grid of the deleted match. Real src/app routes through
// renderRouter, both lists reading the matches store; same doubles as
// match-details.navigation.test.tsx. Assumed screens: tests/support/match-details-actions.ts.
import { screen, testRouter } from "expo-router/testing-library";

import { renderUpdateWarnings, seedDetails } from "../support/match-details";
import {
  DELETE_CONFIRM,
  gridCells,
  gridUndo,
  matchIds,
  openDetailsFromAllMatches,
  openDetailsFromTeam,
  pressDelete,
  pressInDialog,
  recordStatuses,
  rowsOf,
  seedMarks,
} from "../support/match-details-actions";
import { NOT_FOUND } from "../support/edit-team";
import {
  EMPTY_MATCHES,
  addMatch,
  itemDates,
  matchesStoreOn,
} from "../support/match-lists";
import { waitForPathname } from "../support/new-match-save";

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

/** The seeded match (1 November, with marks) and a second one of the same team (6 December). */
function seedTwoMatches() {
  const seeded = seedDetails({ format: 6 });
  seedMarks(seeded, [
    [0, "P", 1, "starter"],
    [1, "P", 2, "sub"],
  ]);
  const second = addMatch(seeded.db, seeded.teamId, { date: "2026-12-06" });
  return { ...seeded, second, matches: matchesStoreOn(seeded.db) };
}

async function deleteFromDetails(): Promise<void> {
  await pressDelete();
  await pressInDialog(DELETE_CONFIRM);
}

const SOURCES = [
  ["the team's screen", openDetailsFromTeam, "/teams/1"],
  ["the list of every match", openDetailsFromAllMatches, "/matches"],
] as const;

describe("match details, deleting from the screen it was opened from (RF-029, RF-057)", () => {
  it.each(SOURCES)(
    "RF-029 RF-057: from %s, confirming calls deleteMatch(1) and pops the details and the grid together to that screen, which no longer lists the match",
    async (_name, open, pathname) => {
      const seeded = seedTwoMatches();
      const remove = jest.spyOn(seeded.matches.getState(), "deleteMatch");
      await open(seeded);
      await deleteFromDetails();
      await waitForPathname(pathname);
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(1);
      expect(screen.queryByLabelText("Local")).toBeNull();
      expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
      expect(itemDates()).toEqual(["06/12/2026"]);
      expect(screen.queryByText(NOT_FOUND)).toBeNull();
      expect(matchIds(seeded.db)).toEqual([seeded.second]);
    },
  );

  it.each(SOURCES)(
    "RF-029 RF-082: from %s, the deletion removes the match's call-up and marks and leaves the other match and the team's players",
    async (_name, open, pathname) => {
      const seeded = seedTwoMatches();
      await open(seeded);
      await deleteFromDetails();
      await waitForPathname(pathname);
      expect(rowsOf(seeded.db, 1)).toEqual({ entries: 0, marks: 0 });
      expect(matchIds(seeded.db)).toEqual([seeded.second]);
    },
  );

  it.each(SOURCES)(
    "RF-029 RF-057: from %s, the session is closed after the deletion and never reports «not found» or reopens the deleted match on the way",
    async (_name, open, pathname) => {
      const seeded = seedTwoMatches();
      await open(seeded);
      const { seen, stop } = recordStatuses(seeded.store);
      await deleteFromDetails();
      await waitForPathname(pathname);
      stop();
      expect(seeded.store.getState().status).toBe("closed");
      expect(seen).not.toContain("notFound");
      expect(seeded.store.getState().view).toBeNull();
    },
  );

  it("RF-029 RF-074: the only match deleted from the list of every match leaves that list with its empty text", async () => {
    const seeded = seedDetails({ format: 6 });
    matchesStoreOn(seeded.db);
    await openDetailsFromAllMatches();
    await deleteFromDetails();
    await waitForPathname("/matches");
    expect(await screen.findByText(EMPTY_MATCHES)).toBeTruthy();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(matchIds(seeded.db)).toEqual([]);
  });

  it("RF-029 RF-057: after the deletion, going back and opening the other match shows its own grid, with no mark of the deleted one", async () => {
    const seeded = seedTwoMatches();
    await openDetailsFromAllMatches();
    await deleteFromDetails();
    await waitForPathname("/matches");
    await testRouter.push(`/matches/${seeded.second}`);
    await screen.findByRole("button", { name: "Editar" });
    expect(seeded.store.getState().view?.matchId).toBe(seeded.second);
    expect(gridUndo()).toBeDisabled();
    expect(gridCells()).toHaveLength(0);
  });
});

describe("match details, no update while rendering (D3 rule 3)", () => {
  it("RF-029: deleting from the list of every match raises no «Cannot update a component» error", async () => {
    const errors = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const seeded = seedTwoMatches();
    await openDetailsFromAllMatches();
    await deleteFromDetails();
    await waitForPathname("/matches");
    expect(matchIds(seeded.db)).toEqual([seeded.second]);
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(seeded.store.getState().status).toBe("closed");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
