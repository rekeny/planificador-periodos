// T064: the question dialog in the assembled match screen at every window size (RF-045, RF-050,
// RF-076, D3 rule 6): with an overtime, at 375 × 667, 667 × 375, 1024 × 768 and 768 × 1024, the
// title, every option and «Cancelar» are drawn, and a window that turns while the dialog is open
// keeps it open. Jest has no layout engine: the geometry is checked on a device (T094). Same
// doubles as match-screen.questions.test.tsx.
import { screen } from "expo-router/testing-library";

import { PHONE, TABLET } from "../support/match-screen-grid";
import { KINDS, dialog, openKind } from "../support/match-screen-questions";
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

describe("match screen, the dialog in every window", () => {
  const WINDOWS = [
    PHONE,
    { width: 667, height: 375 },
    TABLET,
    { width: 768, height: 1024 },
  ];
  it.each(
    KINDS.flatMap((kind) =>
      WINDOWS.map(
        (size) => [kind.name, size.width, size.height, kind, size] as const,
      ),
    ),
  )(
    "RF-045 RF-076: %s with an overtime shows its title, its options and «Cancelar» at %s × %s",
    async (_name, _width, _height, kind, size) => {
      await setWindow(size.width, size.height);
      await openKind(kind, { overtimeCount: 1 });
      expect(screen.getByText(kind.title)).toBeOnTheScreen();
      expect(dialog().getAllByRole("button")).toHaveLength(kind.buttons);
      expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
    },
  );

  it.each(KINDS.map((kind) => [kind.name, kind] as const))(
    "RF-045 RF-050: with %s open, the window turning from 375 × 667 to 667 × 375 keeps it open with every option and «Cancelar»",
    async (_name, kind) => {
      const s = await openKind(kind, { overtimeCount: 1 });
      await setWindow(667, 375);
      expect(screen.getByText(kind.title)).toBeOnTheScreen();
      expect(dialog().getAllByRole("button")).toHaveLength(kind.buttons);
      expect(s.store.getState().pending).not.toBeNull();
    },
  );
});
