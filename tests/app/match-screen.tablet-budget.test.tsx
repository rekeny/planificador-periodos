// D2 review (Codex re-run): the real match screen keeps the tablet's 12 rows without scrolling
// (RF-081) BY CONSTRUCTION, with warnings present. CONTRACT (the Implementer chooses the rest):
//   - On a tablet (shortest side >= 600) the call-up button «Convocatoria» is in the navigation
//     header (headerRight, with the grid buttons), once, and not in the body; on a phone it stays
//     in the body.
//   - On a tablet a View testID `warning-strip` wraps the banners (`warning-banners`) and the
//     legend (`warning-legend`) above the grid, with a flattened `maxHeight` of at most
//     TABLET_STRIP_MAX_HEIGHT (src/ui/grid/tablet-budget.ts, see tablet-budget.test.ts).
//   - On a tablet the legend container is a wrapping row (flexDirection "row", flexWrap "wrap")
//     that keeps one Text per item; the general warning and the range banner have numberOfLines 1.
//   - The existing testIDs, texts and tap behaviour stay as T059 fixed them.
import { screen, within } from "expo-router/testing-library";
import { StyleSheet } from "react-native";

import {
  TABLET_STRIP_MAX_HEIGHT,
  tabletGridViewportHeight,
} from "@/ui/grid/tablet-budget";
import { rangeBanner } from "../support/call-up-screen";
import {
  HEADER_ROW_HEIGHT,
  cellSize,
  measureViewport,
} from "../support/grid-viewport";
import {
  measureHeaderRow,
  scrolls,
  VERTICAL,
} from "../support/match-grid-reading";
import {
  PHONE,
  TABLET,
  buttonsNamed,
  inHeader,
  openPlan,
} from "../support/match-screen-grid";
import { seedsOf } from "../support/match-screen-warnings";
import { JUAN, marksIn } from "../support/match-view-warnings";
import {
  BANNERS,
  LEGEND,
  RULE_IMPOSSIBLE,
  legendTexts,
} from "../support/warning-reading";
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

const CALL_UP = "Convocatoria";
const JUAN_FOUR = seedsOf(marksIn(JUAN, ["P1", "P2", "P3", "P4"]));
const TABLETS = [
  [TABLET.width, TABLET.height],
  [TABLET.height, TABLET.width],
];

// The worst case of the review: six periods, twelve players, one marked in P1-P4.
async function openWorstCase(width: number, height: number, players = 12) {
  await setWindow(width, height);
  await openPlan(players, JUAN_FOUR, { format: 6 });
  expect(screen.queryByText(RULE_IMPOSSIBLE)).not.toBeNull();
  expect(legendTexts().length).toBeGreaterThan(1);
}

function styleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ??
    {}) as Record<string, unknown>;
}

describe("match screen, tablet chrome above the grid", () => {
  it.each(TABLETS)(
    "RF-081 RF-076: in a %s × %s window the call-up button is once in the header and not in the body",
    async (width, height) => {
      await openWorstCase(width, height);
      const found = buttonsNamed(CALL_UP);
      expect(found).toHaveLength(1);
      expect(found[0] === undefined ? false : inHeader(found[0])).toBe(true);
    },
  );

  it("RF-081 RF-032: on a phone the call-up button stays in the body, once", async () => {
    await openWorstCase(PHONE.width, PHONE.height, 10);
    const found = buttonsNamed(CALL_UP);
    expect(found).toHaveLength(1);
    expect(found[0] === undefined ? true : inHeader(found[0])).toBe(false);
  });

  it.each(TABLETS)(
    "RF-081 RF-087: in a %s × %s window the legend is one wrapping row that keeps one Text per item",
    async (width, height) => {
      await openWorstCase(width, height);
      expect(styleOf(LEGEND)).toMatchObject({
        flexDirection: "row",
        flexWrap: "wrap",
      });
      expect(legendTexts().length).toBeGreaterThan(1);
    },
  );

  it.each(TABLETS)(
    "RF-081 RF-067: in a %s × %s window the general warning is a one-line chip",
    async (width, height) => {
      await openWorstCase(width, height);
      expect(screen.getByText(RULE_IMPOSSIBLE).props.numberOfLines).toBe(1);
    },
  );

  it("RF-081 RF-068: on a tablet the call-up range banner is a one-line chip", async () => {
    await setWindow(TABLET.width, TABLET.height);
    await openPlan(5, [], { format: 6 });
    expect(screen.getByText(rangeBanner(6, 5)).props.numberOfLines).toBe(1);
  });

  it.each(TABLETS)(
    "RF-081: in a %s × %s window one strip above the grid holds the banners and the legend, with a bounded height",
    async (width, height) => {
      await openWorstCase(width, height);
      const strip = screen.getByTestId("warning-strip");
      expect(within(strip).getByTestId(BANNERS)).toBeTruthy();
      expect(within(strip).getByTestId(LEGEND)).toBeTruthy();
      expect(within(strip).queryByTestId("grid-viewport")).toBeNull();
      const { maxHeight } = styleOf("warning-strip");
      expect(typeof maxHeight).toBe("number");
      expect(maxHeight as number).toBeLessThanOrEqual(TABLET_STRIP_MAX_HEIGHT);
    },
  );
});

describe("match screen, tablet rows with the strip at its worst", () => {
  async function measured(width: number, height: number, players: number) {
    await openWorstCase(width, height, players);
    await measureHeaderRow(HEADER_ROW_HEIGHT);
    await measureViewport(width, tabletGridViewportHeight(height));
  }

  it.each(TABLETS)(
    "RF-081 RF-076: in a %s × %s window with the warnings present the 12 rows have no vertical scroll and rows of at least 44 pt",
    async (width, height) => {
      await measured(width, height, 12);
      expect(scrolls(VERTICAL)).toBe(false);
      expect(cellSize().height).toBeGreaterThanOrEqual(44);
    },
  );

  it("RF-081: with 13 players on the 1024 × 768 tablet the grid scrolls vertically with rows of 44 pt", async () => {
    await measured(TABLET.width, TABLET.height, 13);
    expect(scrolls(VERTICAL)).toBe(true);
    expect(cellSize().height).toBe(44);
  });
});
