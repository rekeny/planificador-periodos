// Sixth Codex review, finding 1 (RF-010, RF-076, RF-080): on a phone in landscape (667 × 375) a
// 6-period match with 13 players and one player marked in P1-P4 shows both banners and a legend of
// several lines. The warnings are bounded and scroll inside their bound so the grid keeps room, also
// after a failed save. The contract and the budget are in tests/support/phone-landscape-budget.ts.
import { screen, waitFor, within } from "expo-router/testing-library";

import { failMarkWrites } from "../support/match-session-marks";
import { openPlan, tap } from "../support/match-screen-grid";
import { reportHeight, seedsOf } from "../support/match-screen-warnings";
import { JUAN, marksIn } from "../support/match-view-warnings";
import {
  LANDSCAPE,
  MIN_GRID,
  gridHeight,
  stripBound,
} from "../support/phone-landscape-budget";
import { SAVE_FAILED } from "../support/call-up-screen";
import {
  BANNERS,
  LEGEND,
  RULE_IMPOSSIBLE,
  legendTexts,
} from "../support/warning-reading";
import {
  STRIP,
  STRIP_SCROLL,
  isInside,
  stripScrollFlag,
} from "../support/warning-strip";
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

afterEach(async () => restoreWindow());

const JUAN_FOUR = seedsOf(marksIn(JUAN, ["P1", "P2", "P3", "P4"]));

// 13 players: call-up range banner and rule-impossible banner; Juan in P1-P4: the legend explains more.
async function openWorstCase() {
  await setWindow(LANDSCAPE.width, LANDSCAPE.height);
  const s = await openPlan(13, JUAN_FOUR, { format: 6 });
  expect(screen.queryByText(RULE_IMPOSSIBLE)).not.toBeNull();
  expect(screen.getByTestId(BANNERS)).toBeTruthy();
  expect(legendTexts().length).toBeGreaterThan(1);
  return s;
}

describe("match screen on a phone in landscape, the warnings leave the grid usable", () => {
  it("RF-010 RF-076 RF-080: in a 667 × 375 window with 13 players the banners and the legend sit in a bounded scroll container", async () => {
    await openWorstCase();
    stripBound();
    const scroll = within(screen.getByTestId(STRIP)).getByTestId(STRIP_SCROLL);
    expect(isInside(screen.getByTestId(BANNERS), scroll)).toBe(true);
    expect(isInside(screen.getByTestId(LEGEND), scroll)).toBe(true);
    expect(isInside(screen.getByTestId("grid-viewport"), scroll)).toBe(false);
  });

  it("RF-010 RF-076 RF-080: in a 667 × 375 window with both banners and three legend entries the grid keeps at least a header row and two rows", async () => {
    await openWorstCase();
    expect(gridHeight(false)).toBeGreaterThanOrEqual(MIN_GRID);
  });

  it.each([
    [0, 10, false],
    [250, 250, true],
    [0, 500, true],
  ])(
    "RF-080 RF-076: with the banners measured at %s pt and the legend at %s pt the phone strip scrolls: %s",
    async (banners, legend, scrolls) => {
      await openWorstCase();
      const bound = stripBound();
      expect(stripScrollFlag()).toBe(false);
      if (banners > 0) await reportHeight(BANNERS, banners);
      await reportHeight(LEGEND, legend);
      expect(banners + legend > bound).toBe(scrolls);
      expect(stripScrollFlag()).toBe(scrolls);
    },
  );
});

describe("match screen on a phone in landscape after a failed save", () => {
  it("RF-010 RF-076 RF-080 RF-085: after a failed tap the save banner joins the warnings and the grid still keeps a header row and two rows", async () => {
    const s = await openWorstCase();
    failMarkWrites(s.db, "INSERT");
    await tap("Jugador 2", "P1");
    await waitFor(() => expect(screen.getByText(SAVE_FAILED)).toBeTruthy());
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
    expect(gridHeight(true)).toBeGreaterThanOrEqual(MIN_GRID);
    expect(screen.getByTestId(STRIP)).toBeTruthy();
    expect(screen.queryByTestId(BANNERS)).not.toBeNull();
  });
});
