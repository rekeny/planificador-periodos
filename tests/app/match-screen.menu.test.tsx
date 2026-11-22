// T065: the long-press menu on the match screen (RF-052, RF-053, RF-054). A long press on a marked
// cell, driven with the gesture-handler utility (tests/support/cell-long-press.ts), opens the ONE
// question dialog of T064 with the cell's accessible label as its title, the options «Titular»,
// «Entró de cambio» and «Quitar», and «Cancelar» apart under them. Real src/app routes through
// renderRouter with the real match session store on the in-memory database; only expo-sqlite, the
// splash screen, initializeDatabase and the store getters of `@/state/app-stores` are doubles.
// Cancelling, empty cells and failures are in match-screen.menu.cancel.test.tsx and the windows in
// match-screen.menu.layout.test.tsx. Steps: tests/support/match-screen-menu.ts.
import { screen } from "expo-router/testing-library";

import { savedMarks } from "../support/match-session-marks";
import { P3_WITH_SUB } from "../support/match-session-questions";
import {
  CIRCLED_IN_4X,
  CIRCLED_IN_5X,
  REMOVE_OPTION,
  STARTER_OPTION,
  SUB_OPTION,
  X_IN_4X,
  labelOf,
  openMenu,
  startersIn,
} from "../support/match-screen-menu";
import {
  PHONE,
  UNDO,
  buttonsNamed,
  cellState,
  dialogOpen,
  dialogTexts,
  pressButton,
} from "../support/match-screen-grid";
import {
  CHOICE,
  REMINDER,
  REMOVE_ANYWAY,
  dialog,
  hosts,
  press,
} from "../support/match-screen-questions";
import { headerMarks } from "../support/warning-reading";
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

describe("match screen, the long-press menu", () => {
  it("RF-052: a long press on a circled X in a period with 4 X opens the menu without saving, and «Titular» leaves an X, saved, with one undo entry", async () => {
    const s = await openMenu(CIRCLED_IN_4X);
    const before = savedMarks(s.db, s.matchId);
    expect(dialogTexts()).toEqual([
      labelOf("Jugador 1", "P2", "sub"),
      STARTER_OPTION,
      SUB_OPTION,
      REMOVE_OPTION,
      "Cancelar",
    ]);
    expect(dialog().getAllByRole("button")).toHaveLength(4);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
    expect(buttonsNamed(UNDO)[0]).toBeDisabled();
    await press(STARTER_OPTION);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    expect(startersIn("P2")).toBe(5);
    expect(savedMarks(s.db, s.matchId)).toHaveLength(before.length);
    expect(savedMarks(s.db, s.matchId)).not.toEqual(before);
    expect(dialogOpen()).toBe(false);
    expect(buttonsNamed(UNDO)[0]).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
  });

  it.each([
    ["an X", X_IN_4X, "starter"],
    ["a circled X", CIRCLED_IN_4X, "sub"],
  ] as const)(
    "RF-052: the menu on %s is titled with that cell's accessible label and lists exactly three options and «Cancelar», which is not one of them",
    async (_name, seeds, state) => {
      await openMenu(seeds);
      const title = labelOf("Jugador 1", "P2", state);
      expect(dialog().getByText(title)).toBeOnTheScreen();
      expect(dialog().getAllByRole("button")).toHaveLength(4);
      expect(
        dialog().getAllByRole("button", { name: "Cancelar" }),
      ).toHaveLength(1);
      expect(dialogTexts().slice(1, 4)).toEqual([
        STARTER_OPTION,
        SUB_OPTION,
        REMOVE_OPTION,
      ]);
      expect(dialogTexts().at(-1)).toBe("Cancelar");
    },
  );

  it.each([
    ["«Entró de cambio» on an X", X_IN_4X, SUB_OPTION, "sub"],
    [
      "«Quitar» on an X in a period with no sub",
      X_IN_4X,
      REMOVE_OPTION,
      "empty",
    ],
    ["«Quitar» on a circled X", CIRCLED_IN_4X, REMOVE_OPTION, "empty"],
  ] as const)(
    "RF-052: %s changes the cell, saved, with no question and one undo entry",
    async (_name, seeds, option, expected) => {
      const s = await openMenu(seeds);
      const before = savedMarks(s.db, s.matchId);
      await press(option);
      expect(cellState("Jugador 1", "P2")).toBe(expected);
      expect(dialogOpen()).toBe(false);
      expect(savedMarks(s.db, s.matchId)).not.toEqual(before);
      expect(buttonsNamed(UNDO)[0]).toBeEnabled();
    },
  );

  it.each([
    ["«Titular» on an X", X_IN_4X, STARTER_OPTION, "starter"],
    ["«Entró de cambio» on a circled X", CIRCLED_IN_4X, SUB_OPTION, "sub"],
  ] as const)(
    "RF-052: %s, the option that matches the cell, changes nothing and leaves nothing to undo",
    async (_name, seeds, option, state) => {
      const s = await openMenu(seeds);
      const before = savedMarks(s.db, s.matchId);
      await press(option);
      expect(cellState("Jugador 1", "P2")).toBe(state);
      expect(savedMarks(s.db, s.matchId)).toEqual(before);
      expect(dialogOpen()).toBe(false);
      expect(buttonsNamed(UNDO)[0]).toBeDisabled();
    },
  );

  it("RF-052 RF-053: «Titular» on a circled X in a period with 5 X shows the choice of the replaced X in the same open dialog, and the period keeps 5 X", async () => {
    const s = await openMenu(CIRCLED_IN_5X);
    const before = savedMarks(s.db, s.matchId);
    const [menu] = hosts();
    await press(STARTER_OPTION);
    expect(screen.getByText(CHOICE)).toBeOnTheScreen();
    expect(screen.queryByText(STARTER_OPTION)).toBeNull();
    expect(hosts().map((host) => host.props.visible)).toEqual([true]);
    expect(hosts()[0]).toBe(menu);
    expect(dialog().getAllByText(/^Jugador \d+$/)).toHaveLength(5);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
    await press(/Jugador 5/);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
    expect(cellState("Jugador 5", "P2")).toBe("empty");
    expect(startersIn("P2")).toBe(5);
    expect(dialogOpen()).toBe(false);
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(cellState("Jugador 5", "P2")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
  });

  it("RF-052 RF-050 RF-054: «Quitar» on an X in a period with a sub shows the reminder in the same open dialog, and «Quitar de todos modos» empties it, keeps the sub and makes P3 «≠»", async () => {
    const s = await openMenu(P3_WITH_SUB, 4, "P3");
    const before = savedMarks(s.db, s.matchId);
    expect(
      dialog().getByText(labelOf("Jugador 5", "P3", "starter")),
    ).toBeTruthy();
    const [menu] = hosts();
    await press(REMOVE_OPTION);
    expect(screen.getByText(REMINDER)).toBeOnTheScreen();
    expect(hosts().map((host) => host.props.visible)).toEqual([true]);
    expect(hosts()[0]).toBe(menu);
    expect(cellState("Jugador 5", "P3")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toEqual(before);
    await press(REMOVE_ANYWAY);
    expect(cellState("Jugador 5", "P3")).toBe("empty");
    expect(cellState("Jugador 6", "P3")).toBe("sub");
    expect(headerMarks().P3).toBe("≠");
    expect(dialogOpen()).toBe(false);
  });

  it.each([
    ["a free period", [[0, "P6", "starter"]], "P6", "P6"],
    ["an overtime", [[0, "OT1", "starter"]], "OT1", "PR1"],
  ] as const)(
    "RF-052: a long press works on a cell of %s: its menu is titled with its label and «Entró de cambio» makes a circled X",
    async (_name, seeds, key, title) => {
      await openMenu(seeds, 0, key, { overtimeCount: 1 });
      expect(
        dialog().getByText(labelOf("Jugador 1", title, "starter")),
      ).toBeOnTheScreen();
      await press(SUB_OPTION);
      expect(cellState("Jugador 1", title)).toBe("sub");
    },
  );
});
