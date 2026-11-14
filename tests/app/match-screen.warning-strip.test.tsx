// D2 review (third run, finding 4): the tablet warning strip keeps its bounded height but never
// clips what it explains: its content scrolls INSIDE the strip (RF-087, RF-081). The contract is in
// tests/support/warning-strip.ts. The legend texts must stay accessible, not only be in the tree.
import { screen, within } from "expo-router/testing-library";

import { TABLET_STRIP_MAX_HEIGHT } from "@/ui/grid/tablet-budget";
import { reportHeight, seedsOf } from "../support/match-screen-warnings";
import { TABLET, openPlan } from "../support/match-screen-grid";
import { JUAN, marksIn } from "../support/match-view-warnings";
import {
  BANNERS,
  LEGEND,
  LEGEND_TEXT,
  RULE_IMPOSSIBLE,
  legendTexts,
} from "../support/warning-reading";
import {
  STRIP,
  STRIP_SCROLL,
  chainUpTo,
  hiddenFromAccessibility,
  isInside,
  stripScrollFlag,
  stripScrolls,
  styleOf,
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
const TABLETS = [
  [TABLET.width, TABLET.height],
  [TABLET.height, TABLET.width],
];

// Six periods, twelve players, one marked in P1-P4: general warning plus a legend of several lines.
async function openWorstCase(width: number, height: number) {
  await setWindow(width, height);
  await openPlan(12, JUAN_FOUR, { format: 6 });
  expect(screen.queryByText(RULE_IMPOSSIBLE)).not.toBeNull();
  expect(legendTexts().length).toBeGreaterThan(1);
}

describe("match screen, tablet warning strip keeps all its content reachable", () => {
  it.each(TABLETS)(
    "RF-087 RF-081: in a %s × %s window the strip keeps a bounded height and holds a scroll container with the banners and the legend",
    async (width, height) => {
      await openWorstCase(width, height);
      const strip = screen.getByTestId(STRIP);
      expect(styleOf(strip).maxHeight).toBeLessThanOrEqual(
        TABLET_STRIP_MAX_HEIGHT,
      );
      const scroll = within(strip).getByTestId(STRIP_SCROLL);
      expect(within(scroll).getByTestId(BANNERS)).toBeTruthy();
      expect(within(scroll).getByTestId(LEGEND)).toBeTruthy();
      expect(isInside(screen.getByTestId(LEGEND), scroll)).toBe(true);
    },
  );

  it("RF-087: the strip's scroll container is vertical, shows its indicator and works inside the screen's scroll", async () => {
    await openWorstCase(TABLET.width, TABLET.height);
    const { props } = screen.getByTestId(STRIP_SCROLL);
    expect(props.nestedScrollEnabled).toBe(true);
    expect(props.showsVerticalScrollIndicator).toBe(true);
    expect(props.horizontal === true).toBe(false);
  });

  it("RF-087: nothing between the legend and the scroll container clips with overflow hidden", async () => {
    await openWorstCase(TABLET.width, TABLET.height);
    const scroll = screen.getByTestId(STRIP_SCROLL);
    const between = chainUpTo(screen.getByTestId(LEGEND), scroll);
    expect(between.length).toBeGreaterThan(0);
    for (const link of between)
      expect(styleOf(link).overflow).not.toBe("hidden");
    expect(styleOf(screen.getByTestId(BANNERS)).overflow).not.toBe("hidden");
  });

  it("RF-087: every legend explanation is an accessible text inside the strip, none hidden from accessibility", async () => {
    await openWorstCase(TABLET.width, TABLET.height);
    const strip = screen.getByTestId(STRIP);
    const scroll = within(strip).getByTestId(STRIP_SCROLL);
    const shown = legendTexts();
    expect(shown.length).toBeGreaterThan(1);
    for (const text of shown) {
      expect(Object.values(LEGEND_TEXT)).toContain(text);
      const node = within(scroll).getByText(text);
      expect(hiddenFromAccessibility(node, strip)).toBe(false);
    }
    expect(within(strip).getByText(RULE_IMPOSSIBLE)).toBeTruthy();
  });
});

describe("match screen, the strip scrolls when its content is taller than the strip", () => {
  it("RF-087 RF-081: before anything is measured the strip's scroll is an explicit false", async () => {
    await openWorstCase(TABLET.width, TABLET.height);
    expect(stripScrollFlag()).toBe(false);
  });

  it.each([
    [0, 50, false],
    [0, TABLET_STRIP_MAX_HEIGHT, false],
    [0, TABLET_STRIP_MAX_HEIGHT + 1, true],
    [40, 41, true],
    [40, 40, false],
  ])(
    "RF-087 RF-081: with the banners measured at %s pt and the legend at %s pt the strip scrolls: %s",
    async (banners, legend, scrolls) => {
      await openWorstCase(TABLET.width, TABLET.height);
      if (banners > 0) await reportHeight(BANNERS, banners);
      await reportHeight(LEGEND, legend);
      expect(stripScrollFlag()).toBe(scrolls);
      expect(stripScrolls()).toBe(scrolls);
    },
  );

  it("RF-087: when the legend shrinks again the strip stops scrolling", async () => {
    await openWorstCase(TABLET.width, TABLET.height);
    await reportHeight(LEGEND, 200);
    expect(stripScrolls()).toBe(true);
    await reportHeight(LEGEND, 30);
    expect(stripScrolls()).toBe(false);
  });
});
