// F-A4 (run of the Maestro flow on an Android phone, 2026-11-21): on a phone in portrait the strip
// of warnings was bounded at 60 pt, the bound chosen for a landscape phone, and showed about one
// line of the first banner, so «Convocatoria fuera del rango» was not in view. In portrait the bound
// is 160 pt (small-change-form-phone-strip-portrait.md); landscape phones (60) and tablets (80) keep
// theirs. Jest has no layout engine: the tests read the bound the strip is given, as the landscape
// ones do (tests/support/phone-landscape-budget.ts).
import { screen } from "expo-router/testing-library";

import {
  PHONE_PORTRAIT_STRIP_MAX_HEIGHT,
  PHONE_STRIP_MAX_HEIGHT,
  TABLET_STRIP_MAX_HEIGHT,
} from "@/ui/grid/tablet-budget";
import { openPlan } from "../support/match-screen-grid";
import { reportHeight, seedsOf } from "../support/match-screen-warnings";
import { JUAN, marksIn } from "../support/match-view-warnings";
import {
  CALL_UP,
  CHROME,
  MIN_GRID,
  TOOLBAR,
  stripBound,
} from "../support/phone-landscape-budget";
import { BANNERS, RULE_IMPOSSIBLE } from "../support/warning-reading";
import { stripScrollFlag } from "../support/warning-strip";
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
const PORTRAIT = { width: 411, height: 914 };
const SHORT_PHONE = { width: 360, height: 640 };
const LANDSCAPE = { width: 667, height: 375 };
const TABLET = { width: 1024, height: 768 };

// 13 players: call-up range banner and rule-impossible banner; Juan in P1-P4: the legend explains more.
async function openWorstCase(window: { width: number; height: number }) {
  await setWindow(window.width, window.height);
  const s = await openPlan(13, JUAN_FOUR, { format: 6 });
  expect(screen.queryByText(RULE_IMPOSSIBLE)).not.toBeNull();
  return s;
}

describe("match screen on a phone in portrait, the banners are in view (F-A4, RF-010, RF-076)", () => {
  it("RF-010 RF-076 F-A4: in a 411 × 914 window the strip of warnings is bounded at 160 pt", async () => {
    await openWorstCase(PORTRAIT);
    expect(PHONE_PORTRAIT_STRIP_MAX_HEIGHT).toBe(160);
    expect(stripBound()).toBe(PHONE_PORTRAIT_STRIP_MAX_HEIGHT);
  });

  it.each([
    [150, 0, false],
    [90, 70, false],
    [90, 80, true],
    [0, 200, true],
  ])(
    "RF-010 RF-076 F-A4: with the banners measured at %s pt and the legend at %s pt the strip of a phone in portrait scrolls: %s",
    async (banners, legend, scrolls) => {
      await openWorstCase(PORTRAIT);
      expect(stripScrollFlag()).toBe(false);
      await reportHeight(BANNERS, banners);
      await reportHeight("warning-legend", legend);
      expect(banners + legend > PHONE_PORTRAIT_STRIP_MAX_HEIGHT).toBe(scrolls);
      expect(stripScrollFlag()).toBe(scrolls);
    },
  );

  it("RF-010 RF-076 RF-081 F-A4: on a 360 × 640 phone the grid keeps at least a header row and two rows with the strip at its bound", async () => {
    await openWorstCase(SHORT_PHONE);
    const left = SHORT_PHONE.height - CHROME - CALL_UP - TOOLBAR - stripBound();
    expect(left).toBeGreaterThanOrEqual(MIN_GRID);
  });

  it.each([
    ["a phone in landscape", LANDSCAPE, PHONE_STRIP_MAX_HEIGHT, 60],
    ["a tablet", TABLET, TABLET_STRIP_MAX_HEIGHT, 80],
  ])(
    "RF-080 RF-081 F-A4: on %s the strip keeps its bound",
    async (_name, window, constant, points) => {
      await openWorstCase(window);
      expect(constant).toBe(points);
      expect(stripBound()).toBe(points);
    },
  );
});
