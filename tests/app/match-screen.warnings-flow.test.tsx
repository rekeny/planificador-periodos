// T059: the warnings of the real match screen in their surroundings (RF-060, RF-062, RF-063, RF-065,
// RF-067, RF-087, E-001, E-003, E-008): where the general warning and the legend are, that the legend
// does not depend on what is scrolled into view, that reopening shows the same, and that the
// heights of the banners and the legend reach the grid layout (T083). Same setup as
// match-screen.warnings.test.tsx; the testIDs are named in tests/support/warning-reading.ts.
import { screen } from "expo-router/testing-library";
import { act } from "@testing-library/react-native";

import { createMatchSessionStore } from "@/state/match-session-store";
import { HORIZONTAL, VERTICAL, scrolls } from "../support/match-grid-reading";
import { openMatchScreen } from "../support/call-up-screen";
import { setMockMatchSessionStore } from "../support/mock-app-stores";
import { PHONE, TABLET, openPlan, tap } from "../support/match-screen-grid";
import {
  CALM_SEEDS,
  reportHeight,
  scrollSideways,
  seedsOf,
} from "../support/match-screen-warnings";
import { JUAN, marksIn } from "../support/match-view-warnings";
import {
  BANNERS,
  LEGEND,
  LEGEND_TEXT,
  RULE_IMPOSSIBLE,
  legendTexts,
  positionOf,
  warningsDrawn,
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

const JUAN_FOUR = seedsOf(marksIn(JUAN, ["P1", "P2", "P3", "P4"]));

describe("match screen, order of the warnings", () => {
  it("RF-067 RF-087: the general warning is above the legend and both are above the grid", async () => {
    await setWindow(PHONE.width, PHONE.height);
    await openPlan(10, JUAN_FOUR);
    const warning = positionOf(RULE_IMPOSSIBLE);
    const legend = positionOf(LEGEND_TEXT.lightRedCell);
    expect(warning).toBeLessThan(legend);
    expect(legend).toBeLessThan(positionOf("P1"));
  });
});

describe("match screen, the legend and the scroll", () => {
  it("RF-087 E-008: scrolling the grid sideways, the legend still explains the light red cells and does not change", async () => {
    await setWindow(PHONE.width, PHONE.height);
    await openPlan(10, JUAN_FOUR, { format: 8 });
    const before = legendTexts();
    expect(before).toEqual([
      LEGEND_TEXT.lightRedCell,
      LEGEND_TEXT.incompletePeriod,
    ]);
    await scrollSideways(HORIZONTAL, 400);
    expect(legendTexts()).toEqual(before);
    await scrollSideways(HORIZONTAL, 0);
    expect(legendTexts()).toEqual(before);
  });
});

describe("match screen, reopening", () => {
  it("RF-060 RF-087 E-003: closing the app after tapping Juan's four X and opening the match again with new stores shows the same colours, marks and legend", async () => {
    await setWindow(PHONE.width, PHONE.height);
    const s = await openPlan(10);
    for (const period of ["P1", "P2", "P3", "P4"]) {
      await tap("Jugador 1", period);
    }
    const drawn = warningsDrawn();
    expect(drawn.inRed).toEqual(["Jugador 1"]);
    expect(drawn.general).toBe(true);
    await act(async () => screen.unmount());
    setMockMatchSessionStore(createMatchSessionStore(s.db));
    await openMatchScreen(s.matchId);
    expect(warningsDrawn()).toEqual(drawn);
  });

  it("RF-060 RF-067 E-003: a match saved with Juan's four X shows the colours and the banner the first time it is opened", async () => {
    await setWindow(PHONE.width, PHONE.height);
    await openPlan(10, JUAN_FOUR);
    expect(warningsDrawn()).toMatchObject({
      lightRed: ["Jugador 1, P5"],
      inRed: ["Jugador 1"],
      general: true,
    });
  });
});

describe("match screen, heights above the rows", () => {
  it("RF-067 E-003: the height the banners report reaches the grid, which then needs a vertical scroll", async () => {
    await setWindow(TABLET.width, TABLET.height);
    await openPlan(10, JUAN_FOUR);
    expect(scrolls(VERTICAL)).toBe(false);
    await reportHeight(BANNERS, 600);
    expect(scrolls(VERTICAL)).toBe(true);
  });

  it("RF-087 E-001: the height the legend reports reaches the grid, and when the legend goes away the height goes with it", async () => {
    await setWindow(TABLET.width, TABLET.height);
    await openPlan(12, CALM_SEEDS, { format: 8 });
    expect(screen.queryByTestId(LEGEND)).toBeNull();
    await tap("Jugador 1", "P1");
    expect(scrolls(VERTICAL)).toBe(false);
    await reportHeight(LEGEND, 600);
    expect(scrolls(VERTICAL)).toBe(true);
    await tap("Jugador 1", "P1");
    expect(screen.queryByTestId(LEGEND)).toBeNull();
    expect(scrolls(VERTICAL)).toBe(false);
  });
});
