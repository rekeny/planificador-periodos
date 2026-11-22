// T065: what the long-press menu does not do (RF-052, RF-053, RF-085): «Cancelar», a tap outside and
// Android Back close it and change nothing; a long press on an empty cell, one that fails because
// the grid scrolls, and one that is only begun open nothing; a long press followed by a short tap;
// and a write that fails. Same doubles and steps as match-screen.menu.test.tsx.
import { act, screen } from "expo-router/testing-library";

import { SAVE_FAILED } from "../support/call-up-screen";
import { hold, longPress } from "../support/cell-long-press";
import {
  pressBack,
  pressCancel,
  tapOutside,
} from "../support/choice-dialog-harness";
import {
  CIRCLED_IN_5X,
  CIRCLED_IN_4X,
  REMOVE_OPTION,
  STARTER_OPTION,
  X_IN_4X,
  openMenu,
} from "../support/match-screen-menu";
import {
  PHONE,
  UNDO,
  buttonsNamed,
  cellButtons,
  cellState,
  dialogOpen,
  openPlan,
  tap,
} from "../support/match-screen-grid";
import { CHOICE, REMINDER, press } from "../support/match-screen-questions";
import {
  allowMarkWrites,
  failMarkWrites,
  savedMarks,
} from "../support/match-session-marks";
import { P3_WITH_SUB } from "../support/match-session-questions";
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

describe("match screen, closing the long-press menu", () => {
  const WAYS = [
    ["«Cancelar»", pressCancel],
    ["a tap outside the menu", tapOutside],
    ["Android Back", async () => act(async () => pressBack())],
  ] as const;
  const CELLS = [
    ["an X", X_IN_4X, "starter"],
    ["a circled X", CIRCLED_IN_4X, "sub"],
  ] as const;
  it.each(
    CELLS.flatMap(([name, seeds, state]) =>
      WAYS.map(([way, close]) => [name, way, seeds, state, close] as const),
    ),
  )(
    "RF-052: the menu on %s closed with %s changes nothing, leaves nothing to undo and the match screen is still shown",
    async (_name, _way, seeds, state, close) => {
      const s = await openMenu(seeds);
      const before = savedMarks(s.db, s.matchId);
      expect(dialogOpen()).toBe(true);
      await close();
      expect(dialogOpen()).toBe(false);
      expect(cellState("Jugador 1", "P2")).toBe(state);
      expect(savedMarks(s.db, s.matchId)).toEqual(before);
      expect(s.store.getState().pending).toBeNull();
      expect(cellButtons()).toHaveLength(54);
      expect(buttonsNamed(UNDO)[0]).toBeDisabled();
    },
  );

  it.each([
    [
      "the choice of the replaced X",
      CIRCLED_IN_5X,
      0,
      "P2",
      STARTER_OPTION,
      CHOICE,
    ],
    ["the reminder", P3_WITH_SUB, 4, "P3", REMOVE_OPTION, REMINDER],
  ] as const)(
    "RF-052 RF-053: «Cancelar» on %s reached from the menu leaves the cell as it was and nothing to undo",
    async (_name, seeds, row, key, option, title) => {
      const s = await openMenu(seeds, row, key);
      const before = savedMarks(s.db, s.matchId);
      await press(option);
      expect(screen.getByText(title)).toBeOnTheScreen();
      await pressCancel();
      expect(dialogOpen()).toBe(false);
      expect(savedMarks(s.db, s.matchId)).toEqual(before);
      expect(s.store.getState().pending).toBeNull();
      expect(buttonsNamed(UNDO)[0]).toBeDisabled();
    },
  );
});

describe("match screen, a long press that opens no menu", () => {
  it("RF-052: a long press on an empty cell neither marks it nor opens a menu, and saves nothing", async () => {
    const s = await openPlan(9, X_IN_4X);
    const before = savedMarks(s.db, s.matchId);
    await longPress(s.entryIds[8] ?? 0, "P2");
    expect(cellState("Jugador 9", "P2")).toBe("empty");
    expect(dialogOpen()).toBe(false);
    expect(s.store.getState().pending).toBeNull();
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
    expect(buttonsNamed(UNDO)[0]).toBeDisabled();
  });

  it.each([
    ["fails because the finger moved while the grid scrolls", "fails"],
    ["is cancelled by the system", "isCancelled"],
    ["has begun but not yet activated", "isOnlyBegun"],
  ] as const)(
    "RF-052 RF-076: a long press on a marked cell that %s opens no menu and changes nothing",
    async (_name, finger) => {
      const s = await openPlan(9, X_IN_4X);
      const before = savedMarks(s.db, s.matchId);
      await hold(`cell-long-press:${s.entryIds[0]}:P2`, finger);
      expect(dialogOpen()).toBe(false);
      expect(s.store.getState().pending).toBeNull();
      expect(cellState("Jugador 1", "P2")).toBe("starter");
      expect(savedMarks(s.db, s.matchId)).toEqual(before);
      await tap("Jugador 9", "P2");
      expect(cellState("Jugador 9", "P2")).toBe("starter");
    },
  );
});

describe("match screen, the long press and the short tap together", () => {
  it("RF-052: a long press, «Cancelar», then a short tap on another cell marks that cell as a tap marks it", async () => {
    const s = await openMenu(X_IN_4X);
    await pressCancel();
    const before = savedMarks(s.db, s.matchId);
    await tap("Jugador 9", "P3");
    expect(cellState("Jugador 9", "P3")).toBe("starter");
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(before.length + 1);
    expect(dialogOpen()).toBe(false);
    expect(buttonsNamed(UNDO)[0]).toBeEnabled();
  });

  it("RF-052: after «Cancelar» the same long press opens the menu again and it can be answered", async () => {
    const s = await openMenu(X_IN_4X);
    await pressCancel();
    await longPress(s.entryIds[0] ?? 0, "P2");
    expect(dialogOpen()).toBe(true);
    await press(REMOVE_OPTION);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
  });
});

describe("match screen, a menu choice that fails to save", () => {
  it("RF-052 RF-085: a failing write on «Quitar» closes the dialog, leaves the cell as it was, shows the message and leaves nothing to undo", async () => {
    const s = await openMenu(X_IN_4X);
    const before = savedMarks(s.db, s.matchId);
    failMarkWrites(s.db, "DELETE");
    await press(REMOVE_OPTION);
    expect(dialogOpen()).toBe(false);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
    expect(screen.getByText(SAVE_FAILED)).toBeOnTheScreen();
    expect(buttonsNamed(UNDO)[0]).toBeDisabled();
    allowMarkWrites(s.db, "DELETE");
  });
});
