// T055: the match screen with the grid and tapping cells (RF-044, RF-048, RF-049, RF-051, RF-055,
// RF-056, RF-060, RF-068, RF-070, E-012). Real src/app routes through
// renderRouter with the real match session store on the in-memory database; only expo-sqlite, the
// splash screen, initializeDatabase and the store getters of `@/state/app-stores` are doubles. The
// grid is read through the labels of its cells. Window: a phone, so the buttons are in the toolbar
// (the header ones are in match-screen.toolbar.test.tsx). Assumed screen: match-screen-grid.ts.
import { screen } from "expo-router/testing-library";

import {
  fillColumn,
  savedMarks,
  type SeedMark,
} from "../support/match-session-marks";
import {
  SAVE_FAILED,
  rangeBanner,
  bannerTexts,
} from "../support/call-up-screen";
import {
  PHONE,
  UNDO,
  buttonsNamed,
  cellButtons,
  cellState,
  openPlan,
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

describe("match screen, tapping cells", () => {
  it("RF-044 RF-070: five taps in P1 mark five starters, saved at once, and the counters follow", async () => {
    const s = await openPlan(9);
    expect(cellButtons()).toHaveLength(54);
    for (const row of [1, 2, 3, 4, 5]) await tap(`Jugador ${row}`, "P1");
    for (const row of [1, 2, 3, 4, 5]) {
      expect(cellState(`Jugador ${row}`, "P1")).toBe("starter");
    }
    expect(cellState("Jugador 6", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(screen.getAllByText("J 1 · D 5")).toHaveLength(5);
    expect(screen.getAllByText("J 0 · D 6")).toHaveLength(4);
  });

  it("RF-044: a tap calls the session's tapCell with the cell of that player and period", async () => {
    const s = await openPlan(9);
    const tapCell = jest.spyOn(s.store.getState(), "tapCell");
    await tap("Jugador 3", "P2");
    expect(tapCell).toHaveBeenCalledTimes(1);
    expect(tapCell).toHaveBeenCalledWith({
      entryId: s.entryIds[2],
      column: { kind: "period", number: 2 },
    });
  });

  it("RF-049: tapping an X in a period with no sub leaves it empty and the period with 4 X", async () => {
    const s = await openPlan(9, FULL_P1);
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    await tap("Jugador 1", "P1");
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(cellState("Jugador 2", "P1")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(4);
  });

  it("RF-056: a mark can be changed at any moment: mark, remove and mark again", async () => {
    const s = await openPlan(9);
    await tap("Jugador 1", "P3");
    await tap("Jugador 1", "P3");
    expect(cellState("Jugador 1", "P3")).toBe("empty");
    await tap("Jugador 1", "P3");
    expect(cellState("Jugador 1", "P3")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(1);
  });

  it("RF-055 RF-044: a sixth tap in a full P1 changes nothing, shows nothing and leaves nothing to undo (D2 limit)", async () => {
    const s = await openPlan(9, FULL_P1);
    await tap("Jugador 6", "P1");
    expect(cellState("Jugador 6", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(undoButton()).toBeDisabled();
  });

  it("RF-060 RF-044: a tap that breaks the rest minimum is marked, nothing blocks it", async () => {
    const seeds: SeedMark[] = [
      [0, "P1", "starter"],
      [0, "P2", "starter"],
      [0, "P3", "starter"],
    ];
    const s = await openPlan(9, seeds);
    await tap("Jugador 1", "P4");
    expect(cellState("Jugador 1", "P4")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(4);
  });

  it.each(["OT1", "P6"] as const)(
    "RF-048 E-012 RF-051: in %s with 5 X an empty cell gets a circled X without asking, and tapping it again empties it",
    async (key) => {
      // The cell label names an overtime «PR1», the key of the domain is «OT1».
      const column = key === "OT1" ? "PR1" : key;
      const s = await openPlan(9, fillColumn(key, [0, 1, 2, 3, 4]), {
        overtimeCount: 1,
      });
      await tap("Jugador 6", column);
      expect(cellState("Jugador 6", column)).toBe("sub");
      expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
      expect(savedMarks(s.db, s.matchId)).toHaveLength(6);
      await tap("Jugador 6", column);
      expect(cellState("Jugador 6", column)).toBe("empty");
      expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    },
  );

  it("RF-049 RF-055: an X in a period with a sub does nothing yet (D2 limit), and the circled X still empties", async () => {
    const seeds: SeedMark[] = [
      ...fillColumn("P6", [0, 1, 2, 3, 4]),
      [5, "P6", "sub"],
    ];
    const s = await openPlan(9, seeds);
    await tap("Jugador 1", "P6");
    expect(cellState("Jugador 1", "P6")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(6);
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    await tap("Jugador 6", "P6");
    expect(cellState("Jugador 6", "P6")).toBe("empty");
  });

  it("RF-068: a match with 13 players shows the range banner and the whole grid, still tappable", async () => {
    await openPlan(13);
    expect(bannerTexts()).toEqual([rangeBanner(6, 13)]);
    expect(cellButtons()).toHaveLength(78);
    await tap("Jugador 13", "P1");
    expect(cellState("Jugador 13", "P1")).toBe("starter");
  });
});
