// D2 review F2: the real match screen with REALISTIC measured heights (RF-076 to RF-081). The real
// screen never gives the grid the window height: the grid container reports what it really has
// (contract in tests/support/grid-viewport.ts) and rows are never clipped with scrolling disabled.
// Tablet 1024 × 768: window minus status bar and header (74), call-up button (76), legend (24) =
// 594 for the grid; phone 375 × 667 also loses the toolbar (56) = 437. Same doubles as
// match-screen.toolbar.test.tsx.
import {
  measureHeaderRow,
  scrolls,
  VERTICAL,
} from "../support/match-grid-reading";
import {
  cellSize,
  HEADER_ROW_HEIGHT,
  measureViewport,
  rowHeightFor,
} from "../support/grid-viewport";
import {
  PHONE,
  TABLET,
  UNDO,
  buttonsNamed,
  inHeader,
  openPlan,
} from "../support/match-screen-grid";
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

async function openMeasured(
  window: { width: number; height: number },
  players: number,
  viewport: number,
) {
  await setWindow(window.width, window.height);
  await openPlan(players, [], { format: 8 });
  await measureHeaderRow(HEADER_ROW_HEIGHT);
  await measureViewport(window.width, viewport);
}

describe("match screen, tablet with 12 players", () => {
  it("RF-076 RF-081: a 1024 × 768 tablet with 12 players and a measured viewport of 596 pt fits the 12 rows at 46 pt with no vertical scroll", async () => {
    await openMeasured(TABLET, 12, 596);
    expect(scrolls(VERTICAL)).toBe(false);
    expect(cellSize().height).toBe(46);
  });

  it.each([
    [716, 56, false],
    [572, 44, false],
    [571, 44, true],
    [560, 44, true],
    [400, 44, true],
  ])(
    "RF-076 RF-081: on a 1024 × 768 tablet with 12 players a measured viewport of %s pt gives rows of %s pt and vertical scroll %s, so no row is clipped and unreachable",
    async (viewport, rowHeight, vertical) => {
      await openMeasured(TABLET, 12, viewport);
      expect(cellSize().height).toBe(rowHeight);
      expect(scrolls(VERTICAL)).toBe(vertical);
    },
  );

  it.each([
    [13, 596],
    [16, 700],
    [20, 716],
  ])(
    "RF-081: a 1024 × 768 tablet with %s players and a measured viewport of %s pt scrolls vertically with rows of 44 pt",
    async (players, viewport) => {
      await openMeasured(TABLET, players, viewport);
      expect(scrolls(VERTICAL)).toBe(true);
      expect(cellSize().height).toBe(44);
    },
  );

  it("RF-076: when a banner appears or goes away the grid is measured again and its sizes follow", async () => {
    await openMeasured(TABLET, 12, 596);
    expect(scrolls(VERTICAL)).toBe(false);
    await measureViewport(TABLET.width, 560);
    expect(scrolls(VERTICAL)).toBe(true);
    expect(cellSize().height).toBe(44);
    await measureViewport(TABLET.width, 596);
    expect(scrolls(VERTICAL)).toBe(false);
    expect(cellSize().height).toBe(46);
  });
});

describe("match screen, phone with the toolbar", () => {
  it("RF-076 RF-081: a 375 × 667 phone with 8 players and a measured viewport of 437 pt fits the rows with no vertical scroll and scrolls sideways", async () => {
    await openMeasured(PHONE, 8, 437);
    const [undo] = buttonsNamed(UNDO);
    expect(undo === undefined ? true : inHeader(undo)).toBe(false);
    expect(scrolls(VERTICAL)).toBe(false);
    expect(cellSize().height).toBeCloseTo(rowHeightFor(437 - 44, 8), 5);
    expect(cellSize().width).toBe(44);
  });

  it.each([
    [10, 437],
    [10, 400],
    [13, 437],
  ])(
    "RF-076 RF-081: a 375 × 667 phone with %s players and a measured viewport of %s pt scrolls vertically with rows of 44 pt",
    async (players, viewport) => {
      await openMeasured(PHONE, players, viewport);
      expect(scrolls(VERTICAL)).toBe(true);
      expect(cellSize().height).toBe(44);
    },
  );
});
