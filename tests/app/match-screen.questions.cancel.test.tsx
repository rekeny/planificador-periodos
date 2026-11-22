// T064: cancelling each question of the match screen (RF-045, RF-050): «Cancelar», a tap outside
// the dialog and Android Back (`onRequestClose`) change nothing and the match screen stays. Same
// doubles as match-screen.questions.test.tsx; the shared steps are in
// tests/support/match-screen-questions.ts.
import { act, screen } from "expo-router/testing-library";

import { SAVE_FAILED } from "../support/call-up-screen";
import {
  pressBack,
  pressCancel,
  tapOutside,
} from "../support/choice-dialog-harness";
import { savedMarks } from "../support/match-session-marks";
import {
  PHONE,
  UNDO,
  buttonsNamed,
  cellButtons,
  cellState,
  dialogOpen,
} from "../support/match-screen-grid";
import { KINDS, openKind } from "../support/match-screen-questions";
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

describe("match screen, cancelling a question", () => {
  const WAYS = [
    ["«Cancelar»", pressCancel],
    ["a tap outside the dialog", tapOutside],
    ["Android Back", async () => act(async () => pressBack())],
  ] as const;
  it.each(
    KINDS.flatMap((kind) =>
      WAYS.map(([way, cancel]) => [kind.name, way, kind, cancel] as const),
    ),
  )(
    "RF-045 RF-050: %s closed with %s changes nothing, and the match screen is still shown",
    async (_name, _way, kind, cancel) => {
      const s = await openKind(kind);
      const [player, column] = kind.cell;
      const state = cellState(player, column);
      const marks = savedMarks(s.db, s.matchId);
      expect(dialogOpen()).toBe(true);
      await cancel();
      expect(dialogOpen()).toBe(false);
      expect(cellState(player, column)).toBe(state);
      expect(savedMarks(s.db, s.matchId)).toEqual(marks);
      expect(s.store.getState().pending).toBeNull();
      expect(cellButtons()).toHaveLength(54);
      expect(buttonsNamed(UNDO)[0]).toBeDisabled();
      expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    },
  );
});
