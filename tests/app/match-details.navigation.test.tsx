// T072: how the match details are reached and left (RF-057, RF-082, RF-076, D3 rules 3 and 4). The
// button «Editar» of the match screen pushes `/matches/<id>/edit` as a modal titled «Editar»; Back
// returns to the grid with its session and its Undo history untouched. Real src/app routes through
// renderRouter, with the real match session store and details draft on the in-memory database; only
// expo-sqlite, the splash screen, initializeDatabase and the store getters of `@/state/app-stores`
// are doubles. Assumed screens: tests/support/match-details.ts. Route ownership is in
// match-details.ownership.test.tsx.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import { resetMockDatabase } from "../support/mock-database";
import { savedMarkKeys } from "../support/match-session-call-up";
import {
  openDetailsFromGrid,
  pressEdit,
  savedMatch,
  seedDetails,
  shown,
} from "../support/match-details";
import { cellState, tap } from "../support/match-screen-grid";
import { presentations } from "../support/screen-presentation";
import { headerConfigs } from "../support/screen-reading";
import { homeField, typeIn } from "../support/new-match-form";
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

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let store: ReturnType<typeof seedDetails>["store"];

beforeEach(() => {
  ({ db, store } = seedDetails());
});

const undoButton = () => screen.getByRole("button", { name: "Deshacer" });

describe("match details, the button «Editar» (RF-057)", () => {
  it("RF-057: the match screen has «Convocatoria» and «Editar», and «Editar» opens /matches/1/edit with the saved details", async () => {
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    expect(
      await screen.findByRole("button", { name: "Convocatoria" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(screen).toHavePathname("/matches/1/edit");
    expect(shown().home).toBe("Águilas");
  });

  it("RF-076: the details are a modal over the grid, titled «Editar»", async () => {
    await openDetailsFromGrid(1);
    expect(presentations().at(-1)).toBe("modal");
    expect(headerConfigs().at(-1)?.title).toBe("Editar");
  });

  it("RF-057: «Editar» does not touch the grid's session: it stays open for the match, with nothing saved", async () => {
    await openDetailsFromGrid(1);
    expect(store.getState().status).toBe("open");
    expect(store.getState().view?.matchId).toBe(1);
    await testRouter.back();
    expect(screen).toHavePathname("/matches/1");
    expect(store.getState().status).toBe("open");
    expect(store.getState().view?.matchId).toBe(1);
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
  });
});

describe("match details, back to the grid keeps the marks and the Undo history (RF-057)", () => {
  it("RF-057: mark a cell, open the details, go back: «Deshacer» removes that mark", async () => {
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    await screen.findByRole("button", { name: "Editar" });
    await tap("Jugador 1", "P1");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    await pressEdit();
    await screen.findByLabelText("Local");
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(undoButton()).toBeEnabled();
    await fireEvent.press(undoButton());
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(savedMarkKeys(db, 1)).toEqual([]);
  });

  it("RF-057 RF-082: mark a cell, open the details, «Guardar»: the grid shows the mark, the database keeps it and «Deshacer» removes it", async () => {
    await renderRouter("./src/app", { initialUrl: "/matches/1" });
    await screen.findByRole("button", { name: "Editar" });
    await tap("Jugador 1", "P1");
    await pressEdit();
    await screen.findByLabelText("Local");
    await typeIn(homeField(), "Cadete B");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(savedMarkKeys(db, 1)).toHaveLength(1);
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Cadete B" });
    await fireEvent.press(undoButton());
    expect(cellState("Jugador 1", "P1")).toBe("empty");
  });

  it("RF-057: with no mark at all, the details and Back leave «Deshacer» with nothing to undo", async () => {
    await openDetailsFromGrid(1);
    await testRouter.back();
    await waitForPathname("/matches/1");
    expect(undoButton()).toBeDisabled();
  });
});

describe("match details, opening them again (RF-028, RF-082)", () => {
  it("RF-082: the details opened twice in a row show the saved values each time, and not what the first one had typed", async () => {
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Sin guardar");
    await testRouter.back();
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(shown().home).toBe("Águilas");
    await typeIn(homeField(), "Guardado");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(shown().home).toBe("Guardado");
  });
});
