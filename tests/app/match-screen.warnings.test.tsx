// T059: the warnings drawn on the real match screen (RF-006, RF-060, RF-061, RF-062, RF-063, RF-064,
// RF-065, RF-067, RF-072, RF-087, E-001, E-003, E-004, E-005, E-007, E-008). Real src/app routes
// through renderRouter with the real match session store on the in-memory database; only
// expo-sqlite, the splash screen, initializeDatabase and the store getters are doubles (as
// match-screen.marks). The colours and marks are read as tests/support/warning-reading.ts
// describes. Window: a phone. The flows (order, scrolling, reopening, heights) are in
// match-screen.warnings-flow.test.tsx.
import { screen } from "expo-router/testing-library";

import { PHONE, openPlan, tap } from "../support/match-screen-grid";
import { CALM_SEEDS, seedsOf } from "../support/match-screen-warnings";
import {
  JUAN,
  fillPeriods,
  marksIn,
  pedroGrid,
  poolOf,
} from "../support/match-view-warnings";
import {
  LEGEND,
  LEGEND_TEXT,
  generalWarningShown,
  headerMarks,
  legendTexts,
  lightRedCells,
  redPlayers,
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

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

const NOTHING = {
  lightRed: [],
  inRed: [],
  marks: {},
  general: false,
  legend: [],
};
const BANG_P1_P5 = { P1: "!", P2: "!", P3: "!", P4: "!", P5: "!" };
const JUAN_P1_P3 = seedsOf(marksIn(JUAN, ["P1", "P2", "P3"]));

describe("match screen, warnings by default", () => {
  it("RF-061 RF-087: a match with nothing to warn about shows no colour, no mark, no general warning and no legend", async () => {
    await openPlan(12, CALM_SEEDS, { format: 8 });
    expect(warningsDrawn()).toEqual(NOTHING);
    expect(screen.queryByTestId(LEGEND)).toBeNull();
  });

  it("RF-065 RF-087: a new match with no mark shows «!» on P1 to P5 and only that line of the legend, no colour and no banner", async () => {
    await openPlan(10);
    expect(warningsDrawn()).toEqual({
      ...NOTHING,
      marks: BANG_P1_P5,
      legend: [LEGEND_TEXT.incompletePeriod],
    });
  });
});

describe("match screen, tapping into the warnings", () => {
  it("RF-060 RF-062 RF-065 RF-067 E-001: tapping Juan's P1, P2 and P3 turns P4 and P5 light red only on the third X, marks P1 to P5 and no general warning", async () => {
    await openPlan(10);
    await tap("Jugador 1", "P1");
    await tap("Jugador 1", "P2");
    expect(lightRedCells()).toEqual([]);
    await tap("Jugador 1", "P3");
    expect(warningsDrawn()).toEqual({
      lightRed: ["Jugador 1, P4", "Jugador 1, P5"],
      inRed: [],
      marks: BANG_P1_P5,
      general: false,
      legend: [LEGEND_TEXT.lightRedCell, LEGEND_TEXT.incompletePeriod],
    });
  });

  it("RF-060 RF-087 E-001: tapping Juan's X in P3 again removes the light red cells and the line of the legend that explained them", async () => {
    await openPlan(10, JUAN_P1_P3);
    expect(lightRedCells()).toEqual(["Jugador 1, P4", "Jugador 1, P5"]);
    await tap("Jugador 1", "P3");
    expect(warningsDrawn()).toEqual({
      ...NOTHING,
      marks: BANG_P1_P5,
      legend: [LEGEND_TEXT.incompletePeriod],
    });
  });

  it("RF-060 RF-063 RF-067 E-003: the fourth X puts Juan in red, colours P5 and shows the general warning and the lines of the legend", async () => {
    await openPlan(10, JUAN_P1_P3);
    expect(redPlayers()).toEqual([]);
    expect(generalWarningShown()).toBe(false);
    await tap("Jugador 1", "P4");
    expect(redPlayers()).toEqual(["Jugador 1"]);
    expect(lightRedCells()).toEqual(["Jugador 1, P5"]);
    expect(generalWarningShown()).toBe(true);
    expect(legendTexts()).toEqual([
      LEGEND_TEXT.lightRedCell,
      LEGEND_TEXT.playerInRed,
      LEGEND_TEXT.incompletePeriod,
    ]);
  });

  it("RF-060 RF-063 E-003: removing the fourth X takes the red, the general warning and the line of the player in red away", async () => {
    await openPlan(10, seedsOf(marksIn(JUAN, ["P1", "P2", "P3", "P4"])));
    expect(redPlayers()).toEqual(["Jugador 1"]);
    await tap("Jugador 1", "P4");
    expect(redPlayers()).toEqual([]);
    expect(generalWarningShown()).toBe(false);
    expect(legendTexts()).not.toContain(LEGEND_TEXT.playerInRed);
  });

  it("RF-065 RF-087: a window period with 4 X shows «!» and with its 5th X it does not, and the line of the legend goes with it", async () => {
    await openPlan(12, CALM_SEEDS, { format: 8 });
    await tap("Jugador 1", "P1");
    expect(headerMarks()).toEqual({ P1: "!" });
    expect(legendTexts()).toContain(LEGEND_TEXT.incompletePeriod);
    await tap("Jugador 1", "P1");
    expect(warningsDrawn()).toEqual(NOTHING);
  });
});

describe("match screen, the spec examples", () => {
  it("RF-063 RF-064 RF-067 E-004: with P1 to P5 complete, Pedro with one X is in red and the general warning is shown", async () => {
    await openPlan(12, seedsOf(pedroGrid(5).marks));
    expect(redPlayers()).toContain("Jugador 1");
    expect(generalWarningShown()).toBe(true);
    expect(legendTexts()).toContain(LEGEND_TEXT.playerInRed);
  });

  it("RF-064 RF-065 RF-067 E-005: with P5 incomplete Pedro is not in red, only P5 shows «!», nothing is light red and there is no general warning", async () => {
    await openPlan(12, seedsOf(pedroGrid(3).marks));
    expect(warningsDrawn()).toEqual({
      ...NOTHING,
      marks: { P5: "!" },
      legend: [LEGEND_TEXT.incompletePeriod],
    });
  });

  it("RF-062 RF-065 RF-067 E-007: with no subs and P5 and P6 empty only P5 shows «!», no colour, no general warning and a legend of one line", async () => {
    const marks = fillPeriods([5, 5, 5, 5], poolOf(10));
    await openPlan(10, seedsOf(marks));
    expect(warningsDrawn()).toEqual({
      ...NOTHING,
      marks: { P5: "!" },
      legend: [LEGEND_TEXT.incompletePeriod],
    });
  });

  it("RF-006 RF-065 RF-072 E-008: in 8 periods with an overtime P5 and P6 are light red and marked, P7, P8 and the overtime never are, even with marks in them", async () => {
    const seeds = seedsOf(marksIn(JUAN, ["P1", "P2", "P3", "P4"]));
    await openPlan(10, seeds, { format: 8, overtimeCount: 1 });
    const colours = ["Jugador 1, P5", "Jugador 1, P6"];
    const marks = { P1: "!", P2: "!", P3: "!", P4: "!", P5: "!", P6: "!" };
    expect(lightRedCells()).toEqual(colours);
    expect(headerMarks()).toEqual(marks);
    await tap("Jugador 1", "P7");
    await tap("Jugador 2", "PR1");
    expect(lightRedCells()).toEqual(colours);
    expect(headerMarks()).toEqual(marks);
    expect(redPlayers()).toEqual([]);
  });
});
