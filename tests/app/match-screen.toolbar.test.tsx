// T055: where the three grid buttons are: the navigation header on tablets and a toolbar under the
// grid on phones, as grid-layout.ts decides with TABLET_MIN_SHORT_SIDE = 768 on the shortest side
// of the window (RF-076, RF-058, RF-059, RF-055). Same doubles as match-screen.marks.test.tsx.
// A header button is a host element under "RNSScreenStackHeaderConfig" (match-screen-grid.ts).
import { screen, waitFor } from "expo-router/testing-library";

import { fillColumn, savedMarks } from "../support/match-session-marks";
import { headerConfigs } from "../support/screen-reading";
import {
  ADD,
  REMOVE_OVERTIME,
  UNDO,
  afterGrid,
  buttonsNamed,
  cellButtons,
  cellState,
  columnTitles,
  inHeader,
  openPlan,
  pressButton,
  tap,
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

const BUTTONS = [UNDO, ADD, REMOVE_OVERTIME];
// [width, height, buttons are in the header]: the shortest side decides, in both orientations.
const WINDOWS: [number, number, boolean][] = [
  [375, 667, false],
  [667, 375, false],
  [767, 900, false],
  [900, 767, false],
  [768, 900, true],
  [900, 768, true],
  [768, 1024, true],
  [1024, 768, true],
];

afterEach(async () => restoreWindow());

function placements(): boolean[] {
  return BUTTONS.map((name) => {
    const found = buttonsNamed(name);
    expect(found).toHaveLength(1);
    const [button] = found;
    return button === undefined ? false : inHeader(button);
  });
}

describe("match screen, where the buttons are", () => {
  it.each(WINDOWS)(
    "RF-076 RF-058 RF-059: in a %s × %s window every button is in the header: %s, otherwise in the toolbar under the grid, each exactly once",
    async (width, height, inTheHeader) => {
      await setWindow(width, height);
      await openPlan(9, [], { overtimeCount: 1 });
      expect(placements()).toEqual([inTheHeader, inTheHeader, inTheHeader]);
      for (const name of BUTTONS) {
        const [button] = buttonsNamed(name);
        if (button !== undefined && !inTheHeader) {
          expect(afterGrid(button)).toBe(true);
        }
      }
      expect(cellButtons()).toHaveLength(63);
    },
  );

  it("RF-076: rotating from a phone to a tablet window moves the buttons to the header and keeps the marks", async () => {
    await setWindow(375, 667);
    const s = await openPlan(9, fillColumn("P1", [0, 1]), { overtimeCount: 1 });
    expect(placements()).toEqual([false, false, false]);
    await setWindow(1024, 768);
    await waitFor(() => expect(placements()).toEqual([true, true, true]));
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(2);
  });

  it("RF-033: the match screen still has no header title when the buttons are in the header", async () => {
    await setWindow(1024, 768);
    await openPlan(9, [], { overtimeCount: 1 });
    expect(buttonsNamed(ADD)).toHaveLength(1);
    const titles = headerConfigs()
      .filter((config) => config.hidden !== true)
      .map((config) => config.title)
      .filter((title) => typeof title === "string" && title !== "");
    expect(titles).toEqual([]);
  });

  it("RF-058 RF-059: a match with no overtime offers «Deshacer» and «Añadir prórroga» but not «Quitar prórroga»", async () => {
    await setWindow(1024, 768);
    await openPlan(9);
    expect(buttonsNamed(UNDO)).toHaveLength(1);
    expect(buttonsNamed(ADD)).toHaveLength(1);
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(0);
  });
});

describe("match screen, the header buttons work", () => {
  it("RF-055 RF-058 RF-059: on a tablet the header buttons follow the state: «Deshacer» enables after a tap, add and remove work", async () => {
    await setWindow(1024, 768);
    const s = await openPlan(9);
    const [undo] = buttonsNamed(UNDO);
    expect(undo).toBeDisabled();
    await tap("Jugador 1", "P1");
    await waitFor(() => expect(buttonsNamed(UNDO)[0]).toBeEnabled());
    await pressButton(ADD);
    await waitFor(() => expect(columnTitles()).toContain("PR1"));
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(1);
    await pressButton(REMOVE_OVERTIME);
    await waitFor(() => expect(columnTitles()).not.toContain("PR1"));
    expect(buttonsNamed(REMOVE_OVERTIME)).toHaveLength(0);
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    await waitFor(() => expect(buttonsNamed(UNDO)[0]).toBeDisabled());
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });

  it("RF-055: on a phone «Deshacer» in the toolbar is disabled with an empty history and enabled after a tap", async () => {
    await setWindow(375, 667);
    await openPlan(9);
    expect(screen.getByRole("button", { name: UNDO })).toBeDisabled();
    await tap("Jugador 1", "P1");
    expect(screen.getByRole("button", { name: UNDO })).toBeEnabled();
  });
});
