// D2 review (third run, finding 3): the tablet threshold is 768 pt on the SHORTEST side (decided
// 2026-11-14, replacing 600), so the 12 rows without scrolling (RF-081) hold on every tablet and
// windows of 600-767 pt use the phone layout (RF-076): in portrait (and square) the grid buttons are
// in a toolbar under the grid and the call-up button in the body; in landscape (width > height,
// decided 2026-11-15, sixth Codex review) both go in the header so the grid keeps its height. The
// warnings use the bounded scroll strip on every phone. Same doubles as the tablet budget test.
import { screen } from "expo-router/testing-library";

import { tabletGridViewportHeight } from "@/ui/grid/tablet-budget";
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
  ADD,
  UNDO,
  afterGrid,
  buttonsNamed,
  inHeader,
  openPlan,
} from "../support/match-screen-grid";
import { seedsOf } from "../support/match-screen-warnings";
import { JUAN, marksIn } from "../support/match-view-warnings";
import { RULE_IMPOSSIBLE } from "../support/warning-reading";
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
// Tablets under the 768 rule, both orientations, and the square window right on the boundary.
const TABLETS = [
  [1024, 768],
  [768, 1024],
  [768, 768],
];
// Phones under the 768 rule, 600-767 pt on the shortest side, and just under. Portrait or square
// (width not above height): the call-up button in the body and the buttons in the toolbar.
const PORTRAIT_PHONES = [
  [600, 900],
  [767, 1024],
  [375, 667],
  [700, 700],
];
// Landscape (width above height): the call-up button and the grid buttons are in the header.
const LANDSCAPE_PHONES = [
  [900, 600],
  [1024, 767],
  [667, 375],
  [568, 320],
];
const ALL_PHONES = [...PORTRAIT_PHONES, ...LANDSCAPE_PHONES];

async function openWorstCase(width: number, height: number, players = 12) {
  await setWindow(width, height);
  await openPlan(players, JUAN_FOUR, { format: 6, overtimeCount: 1 });
  expect(screen.queryByText(RULE_IMPOSSIBLE)).not.toBeNull();
}

describe("match screen, windows under 768 pt use the phone layout", () => {
  it.each(PORTRAIT_PHONES)(
    "RF-076 RF-032: in a portrait or square %s × %s window the call-up button is in the body, once, and not in the header",
    async (width, height) => {
      await openWorstCase(width, height);
      const found = buttonsNamed(CALL_UP);
      expect(found).toHaveLength(1);
      expect(found[0] === undefined ? true : inHeader(found[0])).toBe(false);
    },
  );

  it.each(PORTRAIT_PHONES)(
    "RF-076 RF-058 RF-059: in a portrait or square %s × %s window «Deshacer» and «Añadir prórroga» are in the toolbar under the grid, once each",
    async (width, height) => {
      await openWorstCase(width, height);
      for (const name of [UNDO, ADD]) {
        const found = buttonsNamed(name);
        expect(found).toHaveLength(1);
        const [button] = found;
        if (button === undefined) throw new Error(`No button «${name}»`);
        expect(inHeader(button)).toBe(false);
        expect(afterGrid(button)).toBe(true);
      }
    },
  );

  it.each(LANDSCAPE_PHONES)(
    "RF-076 RF-032 RF-058 RF-059: in a landscape %s × %s phone window the call-up button, «Deshacer» and «Añadir prórroga» are in the header, once each",
    async (width, height) => {
      await openWorstCase(width, height);
      for (const name of [CALL_UP, UNDO, ADD]) {
        const found = buttonsNamed(name);
        expect(found).toHaveLength(1);
        expect(found[0] === undefined ? false : inHeader(found[0])).toBe(true);
      }
    },
  );

  it.each(ALL_PHONES)(
    "RF-076 RF-081: in a %s × %s phone window the warnings sit in the bounded scroll strip above the grid",
    async (width, height) => {
      await openWorstCase(width, height);
      expect(screen.queryByTestId("warning-strip")).not.toBeNull();
    },
  );
});

describe("match screen, every tablet of 768 pt or more keeps the 12 rows", () => {
  it.each(TABLETS)(
    "RF-076 RF-081: in a %s × %s window the call-up button and the grid buttons are in the header",
    async (width, height) => {
      await openWorstCase(width, height);
      for (const name of [CALL_UP, UNDO, ADD]) {
        const found = buttonsNamed(name);
        expect(found).toHaveLength(1);
        expect(found[0] === undefined ? false : inHeader(found[0])).toBe(true);
      }
      expect(screen.queryByTestId("warning-strip")).not.toBeNull();
    },
  );

  it.each(TABLETS)(
    "RF-081 RF-076: in a %s × %s window with the worst-case strip the 12 rows have no vertical scroll and rows of at least 44 pt",
    async (width, height) => {
      await openWorstCase(width, height);
      await measureHeaderRow(HEADER_ROW_HEIGHT);
      await measureViewport(width, tabletGridViewportHeight(height));
      expect(scrolls(VERTICAL)).toBe(false);
      expect(cellSize().height).toBeGreaterThanOrEqual(44);
    },
  );
});
