// T064: the questions of the session on the match screen (RF-045, RF-046, RF-050, RF-054, RF-055,
// RF-085, E-011, E-012, E-013). One question dialog (`MatchQuestions`, a `ChoiceDialog` in question
// mode) whose content follows `pending`: the sub-or-starter question, the choice of the replaced X
// (match-screen.replace.test.tsx) and the removal reminder. Real src/app routes through renderRouter
// with the real match session store on the in-memory database; only expo-sqlite, the splash screen,
// initializeDatabase and the store getters of `@/state/app-stores` are doubles. Cancelling is in
// match-screen.questions.cancel.test.tsx and the windows in match-screen.questions.layout.test.tsx.
// The shared steps are in tests/support/match-screen-questions.ts.
import { screen, waitFor } from "expo-router/testing-library";

import { SAVE_FAILED } from "../support/call-up-screen";
import { pressCancel } from "../support/choice-dialog-harness";
import {
  allowMarkWrites,
  failMarkWrites,
  fillColumn,
  savedMarks,
} from "../support/match-session-marks";
import { FULL_P2, P3_WITH_SUB } from "../support/match-session-questions";
import {
  PHONE,
  UNDO,
  buttonsNamed,
  cellState,
  dialogOpen,
  dialogTexts,
  openPlan,
  tap,
} from "../support/match-screen-grid";
import {
  ASKS,
  REMINDS,
  QUESTION,
  REMINDER,
  REMOVE_ANYWAY,
  STARTER,
  SUB,
  openKind,
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

describe("match screen, the sub-or-starter question", () => {
  it("RF-045 RF-046 E-011: a tap on an empty cell of a full P2 asks, saves nothing, and «Entra de cambio» makes a circled X, saved", async () => {
    const s = await openPlan(9, FULL_P2);
    await tap("Jugador 1", "P2");
    expect(screen.getByText(QUESTION)).toBeOnTheScreen();
    expect(dialogTexts()).toEqual([QUESTION, SUB, STARTER, "Cancelar"]);
    expect(cellState("Jugador 1", "P2")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    await press(SUB);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(6);
    expect(dialogOpen()).toBe(false);
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
  });

  it.each([
    ["P6, a free period, with 5 X", "P6", [0, 1, 2, 3, 4], "Jugador 6", "sub"],
    ["P2 with 4 X", "P2", [1, 2, 3, 4], "Jugador 1", "starter"],
  ] as const)(
    "RF-048 E-012 RF-045: in %s an empty cell is marked at once, with no question",
    async (_name, column, rows, player, expected) => {
      const s = await openPlan(9, fillColumn(column, rows));
      await tap(player, column);
      expect(cellState(player, column)).toBe(expected);
      expect(screen.queryByText(QUESTION)).toBeNull();
      expect(dialogOpen()).toBe(false);
      expect(savedMarks(s.db, s.matchId)).toHaveLength(rows.length + 1);
    },
  );

  it("RF-045: after «Cancelar» the same tap asks again and that question can be answered", async () => {
    const s = await openPlan(9, FULL_P2);
    await tap("Jugador 1", "P2");
    await pressCancel();
    expect(dialogOpen()).toBe(false);
    await tap("Jugador 1", "P2");
    expect(screen.getByText(QUESTION)).toBeOnTheScreen();
    await press(SUB);
    expect(cellState("Jugador 1", "P2")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(6);
  });
});

describe("match screen, the removal reminder", () => {
  it("RF-050 RF-054 E-013: an X in a period with a sub asks, and «Quitar de todos modos» empties it, keeps the sub and makes P3 «≠»", async () => {
    const s = await openPlan(9, P3_WITH_SUB);
    await tap("Jugador 5", "P3");
    expect(screen.getByText(REMINDER)).toBeOnTheScreen();
    expect(dialogTexts()).toEqual([REMINDER, REMOVE_ANYWAY, "Cancelar"]);
    expect(cellState("Jugador 5", "P3")).toBe("starter");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(6);
    await press(REMOVE_ANYWAY);
    expect(cellState("Jugador 5", "P3")).toBe("empty");
    expect(cellState("Jugador 6", "P3")).toBe("sub");
    expect(savedMarks(s.db, s.matchId)).toHaveLength(5);
    expect(headerMarks().P3).toBe("≠");
    expect(dialogOpen()).toBe(false);
  });
});

describe("match screen, an answer that fails to save", () => {
  it.each([
    ["«Entra de cambio»", ASKS, "INSERT", SUB, "empty", 5],
    ["«Quitar de todos modos»", REMINDS, "DELETE", REMOVE_ANYWAY, "starter", 6],
  ] as const)(
    "RF-085: a failing write on %s closes the dialog, leaves the cell as it was, shows the message and leaves nothing to undo",
    async (_label, kind, operation, answer, expected, saved) => {
      const s = await openKind(kind);
      failMarkWrites(s.db, operation);
      await press(answer);
      const [player, column] = kind.cell;
      expect(dialogOpen()).toBe(false);
      expect(cellState(player, column)).toBe(expected);
      expect(savedMarks(s.db, s.matchId)).toHaveLength(saved);
      expect(screen.getByText(SAVE_FAILED)).toBeOnTheScreen();
      expect(buttonsNamed(UNDO)[0]).toBeDisabled();
      allowMarkWrites(s.db, operation);
      await tap(player, column);
      await waitFor(() => expect(dialogOpen()).toBe(true));
    },
  );
});
