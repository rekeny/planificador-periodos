// T072, D3 rules 3 and 4: the details draw only what belongs to their own route parameter, own their
// draft (never shared between two screens) and update no shared store while rendering. A link to
// `/matches/1/edit` with the session closed, open for another match, or on a match that cannot be
// read shows «No encontrado» and no form. Real src/app routes through renderRouter, with the real
// stores on the in-memory database; the doubles are those of match-details.navigation.test.tsx.
import {
  renderRouter,
  screen,
  testRouter,
  waitFor,
} from "expo-router/testing-library";

import { resetMockDatabase } from "../support/mock-database";
import { createdDetailsDrafts } from "../support/mock-app-stores";
import {
  openDetailsAlone,
  openDetailsFromGrid,
  pressEdit,
  renderUpdateWarnings,
  savedMatch,
  seedDetails,
  shown,
} from "../support/match-details";
import { addMatch, breakMatchReads } from "../support/match-lists";
import { NOT_FOUND } from "../support/edit-team";
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
let seeded: ReturnType<typeof seedDetails>;
let errors: jest.SpyInstance;

beforeEach(() => {
  seeded = seedDetails();
  ({ db } = seeded);
  errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errors.mockRestore());

async function openLink(url: string): Promise<void> {
  await renderRouter("./src/app", { initialUrl: url });
  await screen.findByText(NOT_FOUND);
}

describe("match details, a link that does not belong to an open match (D3 rule 4)", () => {
  it("RF-082: a stale link to /matches/1/edit with the session closed shows «No encontrado» and no form, and opens nothing", async () => {
    await openLink("/matches/1/edit");
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(seeded.store.getState().status).toBe("closed");
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
  });

  it.each(["abc", "0", "-1", "1.5"])(
    "RF-082: /matches/%s/edit, a malformed id, shows «No encontrado» and no form",
    async (id) => {
      seeded.store.getState().openMatch(1);
      await openLink(`/matches/${id}/edit`);
      expect(screen.queryByLabelText("Local")).toBeNull();
    },
  );

  it("RF-082: the session open for a match that does not exist (not found) shows «No encontrado» on the link of that id", async () => {
    seeded.store.getState().openMatch(99);
    await openLink("/matches/99/edit");
    expect(screen.queryByLabelText("Local")).toBeNull();
  });

  it("RF-082: the session open for match 2 shows «No encontrado» on /matches/1/edit, and match 1 is not changed", async () => {
    const second = addMatch(db, seeded.teamId, { date: "2026-12-06" });
    seeded.store.getState().openMatch(second);
    await openLink("/matches/1/edit");
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(seeded.store.getState().view?.matchId).toBe(second);
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
  });

  it("RF-082 RF-085: a match that cannot be read shows «No encontrado» and no form, as the other screens do", async () => {
    seeded.store.getState().openMatch(1);
    breakMatchReads(db);
    await openLink("/matches/1/edit");
    expect(screen.queryByLabelText("Local")).toBeNull();
  });
});

describe("match details, route ownership over the grid (D3 rule 4)", () => {
  it("RF-082: details of match 1 with typed text, details of match 2 pushed on top show «No encontrado», and Back gives match 1's typed text", async () => {
    const second = addMatch(db, seeded.teamId, { homeName: "Otros" });
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Mi texto");
    await testRouter.push(`/matches/${second}/edit`);
    await screen.findByText(NOT_FOUND);
    expect(screen.queryByDisplayValue("Otros")).toBeNull();
    await testRouter.back();
    await waitForPathname("/matches/1/edit");
    expect(homeField().props.value).toBe("Mi texto");
    expect(savedMatch(db, second)).toMatchObject({ homeName: "Otros" });
    expect(seeded.store.getState().view?.matchId).toBe(1);
  });

  it("RF-082 RF-028: a second details screen of the same match does not share the first one's typed text, and each writes only its own", async () => {
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Primera");
    await testRouter.push("/matches/1/edit");
    await screen.findByLabelText("Local");
    expect(homeField().props.value).toBe("Águilas");
    await typeIn(homeField(), "Segunda");
    expect(createdDetailsDrafts()).toHaveLength(2);
    expect(createdDetailsDrafts()[0]).not.toBe(createdDetailsDrafts()[1]);
    await testRouter.back();
    await waitForPathname("/matches/1/edit");
    expect(homeField().props.value).toBe("Primera");
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Primera" });
  });

  it("RF-082: the second details screen saves its own text, and Back to the first one still shows what the first one typed", async () => {
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Primera");
    await testRouter.push("/matches/1/edit");
    await screen.findByLabelText("Local");
    await typeIn(homeField(), "Segunda");
    await pressSaveMatch();
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Segunda" });
    await waitFor(() => expect(homeField().props.value).toBe("Primera"));
  });
});

describe("match details, no update of a shared store while rendering (D3 rule 3)", () => {
  it("RF-082 F-03: from the grid to the details and back gives no React render-update warning", async () => {
    await openDetailsFromGrid(1);
    await testRouter.back();
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-082 F-03: the details alone, a stale link and a second details screen give no React render-update warning", async () => {
    await openDetailsAlone(seeded);
    await testRouter.push("/matches/1/edit");
    await screen.findByLabelText("Local");
    expect(shown().home).toBe("Águilas");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });

  it("RF-082 F-03: a stale link to the details gives no React render-update warning", async () => {
    await openLink("/matches/1/edit");
    expect(renderUpdateWarnings(errors)).toEqual([]);
  });
});
