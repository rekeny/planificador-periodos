// T055: the match screen with the grid, Undo and the save error (RF-055, RF-057, RF-058, RF-082,
// RF-085, E-025). Real src/app routes through
// renderRouter with the real match session store on the in-memory database; only expo-sqlite, the
// splash screen, initializeDatabase and the store getters of `@/state/app-stores` are doubles. The
// grid is read through the labels of its cells. Window: a phone, so the buttons are in the toolbar
// (the header ones are in match-screen.toolbar.test.tsx). Assumed screen: match-screen-grid.ts.
import { screen, waitFor } from "expo-router/testing-library";

import {
  allowMarkWrites,
  failMarkWrites,
  fillColumn,
  savedMarks,
  type SeedMark,
} from "../support/match-session-marks";
import { SAVE_FAILED } from "../support/call-up-screen";
import {
  ADD,
  PHONE,
  UNDO,
  buttonsNamed,
  cellState,
  columnTitles,
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

const FULL_P1: SeedMark[] = fillColumn("P1", [0, 1, 2, 3, 4]);

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

function undoButton() {
  const [button] = buttonsNamed(UNDO);
  if (button === undefined) throw new Error("No «Deshacer» button");
  return button;
}

describe("match screen, Undo", () => {
  it("RF-055 RF-057: «Deshacer» is disabled with an empty history, even with saved marks, and enabled after a tap", async () => {
    await openPlan(9, FULL_P1);
    expect(undoButton()).toBeDisabled();
    await tap("Jugador 6", "P2");
    expect(undoButton()).toBeEnabled();
  });

  it("RF-055 RF-082: «Deshacer» reverts the last tap, saved, and is disabled again", async () => {
    const s = await openPlan(9);
    await tap("Jugador 1", "P1");
    await tap("Jugador 2", "P1");
    await pressButton(UNDO);
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
    expect(undoButton()).toBeDisabled();
  });

  it("RF-055 RF-058: mark, add an overtime, «Deshacer» twice: the mark is gone and the overtime stays", async () => {
    const s = await openPlan(9);
    await tap("Jugador 1", "P1");
    await pressButton(ADD);
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    await pressButton(UNDO);
    expect(columnTitles()).toContain("PR1");
    expect(undoButton()).toBeDisabled();
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });

  it("RF-055: pressing «Deshacer» more times than there are marks changes nothing", async () => {
    const s = await openPlan(9, FULL_P1);
    await tap("Jugador 6", "P2");
    for (let press = 0; press < 5; press += 1) await pressButton(UNDO);
    expect(cellState("Jugador 6", "P2")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(cellState("Jugador 1", "P1")).toBe("starter");
  });
});

describe("match screen, a save that fails", () => {
  it("RF-085 E-025: a failed tap leaves the cell empty, shows the message and leaves nothing to undo", async () => {
    const s = await openPlan(9, fillColumn("P1", [0, 1, 2]));
    failMarkWrites(s.db, "INSERT");
    await tap("Jugador 4", "P1");
    expect(cellState("Jugador 4", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(3);
    expect(screen.getByText(SAVE_FAILED)).toBeTruthy();
    expect(undoButton()).toBeDisabled();
  });

  it("RF-085: the message goes away after the next successful tap", async () => {
    const s = await openPlan(9);
    failMarkWrites(s.db, "INSERT");
    await tap("Jugador 1", "P1");
    expect(screen.getByText(SAVE_FAILED)).toBeTruthy();
    allowMarkWrites(s.db, "INSERT");
    await tap("Jugador 1", "P1");
    await waitFor(() => expect(screen.queryByText(SAVE_FAILED)).toBeNull());
    expect(cellState("Jugador 1", "P1")).toBe("starter");
  });

  it("RF-085: a failed removal of an X keeps the X and the message", async () => {
    const s = await openPlan(9, FULL_P1);
    failMarkWrites(s.db, "DELETE");
    await tap("Jugador 1", "P1");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(screen.getByText(SAVE_FAILED)).toBeTruthy();
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
  });

  it("RF-085 RF-055: after a failed tap «Deshacer» reverts the action before it, not the failed one", async () => {
    const s = await openPlan(9);
    await tap("Jugador 1", "P1");
    failMarkWrites(s.db, "INSERT");
    await tap("Jugador 2", "P1");
    expect(undoButton()).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(cellState("Jugador 2", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });
});
