// T065: the long-press menu in every window (RF-052, RF-076): its title, its three options and
// «Cancelar» are inside the dialog on a phone and a tablet, in portrait and in landscape, with an
// overtime in the grid, and turning the window with the menu open keeps it open and usable. Same
// doubles and steps as match-screen.menu.test.tsx.
import {
  CIRCLED_IN_4X,
  REMOVE_OPTION,
  STARTER_OPTION,
  SUB_OPTION,
  labelOf,
  openMenu,
} from "../support/match-screen-menu";
import {
  PHONE,
  TABLET,
  cellState,
  dialogTexts,
} from "../support/match-screen-grid";
import { dialog, press } from "../support/match-screen-questions";
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

const TITLE = labelOf("Jugador 1", "P2", "sub");
const MENU = [TITLE, STARTER_OPTION, SUB_OPTION, REMOVE_OPTION, "Cancelar"];

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

describe("match screen, the long-press menu in every window", () => {
  it.each([
    PHONE,
    { width: 667, height: 375 },
    TABLET,
    { width: 768, height: 1024 },
  ])(
    "RF-052 RF-076: with an overtime in the grid the menu shows its title, its three options and «Cancelar» at $width × $height",
    async (size) => {
      await setWindow(size.width, size.height);
      await openMenu(CIRCLED_IN_4X, 0, "P2", { overtimeCount: 1 });
      expect(dialog().getByText(TITLE)).toBeTruthy();
      expect(dialogTexts()).toEqual(MENU);
      expect(dialog().getAllByRole("button")).toHaveLength(4);
    },
  );

  it("RF-052 RF-076: the window turning from 375 × 667 to 667 × 375 with the menu open keeps it open with its three options and «Cancelar», and a choice still works", async () => {
    const s = await openMenu(CIRCLED_IN_4X, 0, "P2", { overtimeCount: 1 });
    await setWindow(667, 375);
    expect(dialogTexts()).toEqual(MENU);
    expect(dialog().getAllByRole("button")).toHaveLength(4);
    expect(s.store.getState().pending).toEqual({
      kind: "cellMenu",
      cell: expect.objectContaining({ entryId: s.entryIds[0] }),
    });
    await press(STARTER_OPTION);
    expect(cellState("Jugador 1", "P2")).toBe("starter");
  });
});
