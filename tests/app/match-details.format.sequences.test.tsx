// T096: the details after a confirmed format change, as a sequence (RF-025, RF-057, RF-082, RF-086,
// D50, D3 rule 3): Undo, «Guardar», leaving without it, and no update while rendering. Same doubles
// and assumed screens as match-details.format.test.tsx.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import {
  openDetailsFromGrid,
  pressEdit,
  renderUpdateWarnings,
  savedMatch,
  seedDetails,
  shown,
} from "../support/match-details";
import {
  FORMAT_CONFIRM,
  gridCellState,
  gridHeaders,
  gridUndo,
  headers,
  pickFormat,
  pressInDialog,
} from "../support/match-details-actions";
import { tap } from "../support/match-screen-grid";
import { savedMarkKeys } from "../support/match-session-call-up";
import { checkedFormats, homeField, typeIn } from "../support/new-match-form";
import { pressSaveMatch, waitForPathname } from "../support/new-match-save";

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

afterEach(() => {
  jest.restoreAllMocks();
});

const undoButton = () => gridUndo()!;

describe("match details, Undo after a format change (RF-057, RF-086)", () => {
  it("RF-057 RF-086: mark P2, change 6 → 8 in the details and go back to the grid: «Deshacer» reverts P2", async () => {
    const { db } = seedDetails({ format: 6 });
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    await screen.findByRole("button", { name: "Editar" });
    await tap("Jugador 1", "P2");
    await pressEdit();
    await screen.findByLabelText("Local");
    await pickFormat(8);
    await pressInDialog(FORMAT_CONFIRM);
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(gridHeaders()).toEqual(headers(8));
    expect(gridCellState("Jugador 1", "P2")).toBe("starter");
    expect(undoButton()).toBeEnabled();
    await fireEvent.press(undoButton());
    expect(gridCellState("Jugador 1", "P2")).toBe("empty");
    expect(savedMarkKeys(db, 1)).toEqual([]);
  });

  it("RF-086: a mark in P6 that 8 → 4 deletes is skipped by «Deshacer», which reverts the mark of P1 in the same press and then has nothing left", async () => {
    const { db } = seedDetails({ format: 8 });
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    await screen.findByRole("button", { name: "Editar" });
    await tap("Jugador 1", "P1");
    await tap("Jugador 2", "P6");
    await pressEdit();
    await screen.findByLabelText("Local");
    await pickFormat(4);
    await pressInDialog(FORMAT_CONFIRM);
    await testRouter.back();
    await waitForPathname("/matches/1");
    await fireEvent.press(undoButton());
    expect(gridCellState("Jugador 1", "P1")).toBe("empty");
    expect(savedMarkKeys(db, 1)).toEqual([]);
    expect(undoButton()).toBeDisabled();
  });
});

describe("match details, the format change and «Guardar» (RF-025, RF-082, D50)", () => {
  it("RF-082 RF-025: change the format and then «Guardar» the details: the new format and the typed name are both saved, and the grid shows it", async () => {
    const { db } = seedDetails({ format: 6 });
    await openDetailsFromGrid(1);
    await pickFormat(4);
    await pressInDialog(FORMAT_CONFIRM);
    await typeIn(homeField(), "Cadete B");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({
      format: 4,
      homeName: "Cadete B",
    });
    expect(gridHeaders()).toEqual(headers(4));
  });

  it("RF-082 RF-039: type a new home name, change the format to 8 and confirm, go back without «Guardar»: the match has 8 periods and the old home name", async () => {
    const { db } = seedDetails({ format: 6 });
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Nuevo local");
    await pickFormat(8);
    await pressInDialog(FORMAT_CONFIRM);
    expect(shown().home).toBe("Nuevo local");
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(gridHeaders()).toEqual(headers(8));
    expect(savedMatch(db, 1)).toMatchObject({ format: 8, homeName: "Águilas" });
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(shown().home).toBe("Águilas");
    expect(checkedFormats()).toEqual([8]);
  });
});

describe("match details, no update while rendering (D3 rule 3)", () => {
  it("RF-082: going to the details, changing the format, confirming and going back raises no «Cannot update a component» error", async () => {
    const errors = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    seedDetails({ format: 6 });
    await openDetailsFromGrid(1);
    await pickFormat(8);
    await pressInDialog(FORMAT_CONFIRM);
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
