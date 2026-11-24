// T064: the choice of the replaced X on the match screen (RF-045, RF-047, RF-055, RF-057, RF-085,
// E-011): «Titular en lugar de otro» turns the question into the choice IN THE SAME OPEN DIALOG
// (the one host `Modal` stays, visible), one option per starter of the column, each with its number
// and its name. Same doubles as match-screen.questions.test.tsx (which also covers cancelling the
// choice and the dialog in every window). Real stores, in-memory database.
import { screen } from "expo-router/testing-library";

import {
  SAVE_FAILED,
  openMatchScreen,
  startSession,
} from "../support/call-up-screen";
import {
  allowMarkWrites,
  failMarkWrites,
  savedMarks,
} from "../support/match-session-marks";
import { writeMark } from "../support/match-session-fixtures";
import { FULL_P2 } from "../support/match-session-questions";
import {
  PHONE,
  UNDO,
  cellState,
  dialogOpen,
  openPlan,
  pressButton,
  tap,
} from "../support/match-screen-grid";
import {
  CHOICE,
  STARTER,
  dialog,
  hosts,
  press,
} from "../support/match-screen-questions";
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

describe("match screen, choosing which X is replaced", () => {
  it("RF-045 RF-047 RF-055 RF-057 E-011: «Titular en lugar de otro» shows the choice in the same open dialog, Eva's option puts Ana's X in and Eva's out, and «Deshacer» gives both cells back", async () => {
    const s = await openPlan(9, FULL_P2);
    const saved = savedMarks(s.db, s.matchId);
    await tap("Jugador 1", "P2");
    const [question] = hosts();
    expect(hosts()).toHaveLength(1);
    await press(STARTER);
    expect(screen.getByText(CHOICE)).toBeOnTheScreen();
    expect(screen.queryByText(STARTER)).toBeNull();
    expect(hosts().map((host) => host.props.visible)).toEqual([true]);
    expect(hosts()[0]).toBe(question);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual(saved);
    await press(/Jugador 5/);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    expect(cellState("Jugador 5", "P2")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(dialogOpen()).toBe(false);
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
    expect(cellState("Jugador 5", "P2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toEqual(saved);
  });

  it("RF-047: the choice lists exactly the five starters of the column, in grid order, with their numbers, and «Cancelar» apart", async () => {
    await openPlan(9, FULL_P2);
    await tap("Jugador 1", "P2");
    await press(STARTER);
    const names = dialog().getAllByText(/^Jugador \d+$/);
    expect(names.map((name) => String(name.props.children))).toEqual([
      "Jugador 2",
      "Jugador 3",
      "Jugador 4",
      "Jugador 5",
      "Jugador 6",
    ]);
    for (const number of ["2", "3", "4", "5", "6"]) {
      expect(dialog().getByText(number)).toBeOnTheScreen();
    }
    expect(dialog().getAllByRole("button")).toHaveLength(6);
    expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("RF-047: two starters with the same number are both listed, told apart by name, and each option replaces its own player", async () => {
    const specs = [
      ["Ana", "1"],
      ["Bea", "7"],
      ["Carla", "7"],
      ["Dani", "4"],
      ["Eva", "5"],
      ["Fran", "6"],
      ["Gus", "8"],
      ["Hugo", "9"],
      ["Iván", "10"],
    ] as const;
    const s = startSession(specs);
    for (const row of [1, 2, 3, 4, 5]) {
      writeMark(s.db, s.entryIds[row] ?? 0, "P", 2, "starter");
    }
    await openMatchScreen(s.matchId);
    await tap("Ana", "P2");
    await press(STARTER);
    expect(dialog().getAllByText("7")).toHaveLength(2);
    expect(dialog().getByRole("button", { name: /Bea/ })).toBeTruthy();
    expect(dialog().getByRole("button", { name: /Carla/ })).toBeTruthy();
    await press(/Carla/);
    expect(cellState("Ana", "P2")).toBe("starter");
    expect(cellState("Carla", "P2")).toBe("empty");
    expect(cellState("Bea", "P2")).toBe("starter");
  });

  it("RF-045 RF-085: a failing write on a starter's option closes the dialog, leaves both cells as they were and shows the message", async () => {
    const s = await openPlan(9, FULL_P2);
    await tap("Jugador 1", "P2");
    await press(STARTER);
    failMarkWrites(s.db, "INSERT");
    await press(/Jugador 5/);
    expect(dialogOpen()).toBe(false);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
    expect(cellState("Jugador 5", "P2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(screen.getByText(SAVE_FAILED)).toBeOnTheScreen();
    allowMarkWrites(s.db, "INSERT");
  });
});
