// T072: the match details when «Guardar» does not save, and the limits of the fields (RF-025,
// RF-082, RF-085, E-022). Same doubles and assumed screens as match-details.form.test.tsx. Failures
// are real SQLite triggers, so no repository is mocked.
import { act, screen } from "expo-router/testing-library";
import { sql } from "drizzle-orm";

import { resetMockDatabase } from "../support/mock-database";
import {
  SAVE_FAILED,
  SCORE_INCOMPLETE,
  allowMatchUpdates,
  failMatchUpdates,
  loggedUpdates,
  logMatchUpdates,
  openDetailsFromGrid,
  pressHandlerOf,
  savedMatch,
  seedDetails,
  shown,
} from "../support/match-details";
import {
  awayField,
  homeField,
  notesField,
  scoreFields,
  typeIn,
} from "../support/new-match-form";
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

// Both presses reach the handler before the screen has drawn anything again: a second press after
// the first one saved and left would find the screen gone, and Testing Library ignores it. The
// handler is called by hand, inside one act, because two fireEvent calls would overlap their acts.
async function pressTwiceAtOnce(): Promise<void> {
  const save = pressHandlerOf(screen.getByRole("button", { name: "Guardar" }));
  await act(async () => {
    save();
    save();
  });
}

const messageShown = (text: string): boolean =>
  screen.queryByText(text) !== null;

describe("match details, the limits of the fields (RF-025, E-022)", () => {
  it("RF-025 E-022: home and away stop at 40 characters, notes at 500 and each score at 3 digits (maxLength props)", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    expect(homeField().props.maxLength).toBe(40);
    expect(awayField().props.maxLength).toBe(40);
    expect(notesField().props.maxLength).toBe(500);
    expect(scoreFields().map((field) => field.props.maxLength)).toEqual([3, 3]);
  });

  it("RF-025 RF-028 E-022: 40-character names, 500-character notes and a score of 999 to 0 are saved as typed", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "H".repeat(40));
    await typeIn(awayField(), "A".repeat(40));
    await typeIn(notesField(), "N".repeat(500));
    await typeIn(scoreFields()[0]!, "999");
    await typeIn(scoreFields()[1]!, "0");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({
      homeName: "H".repeat(40),
      awayName: "A".repeat(40),
      notes: "N".repeat(500),
      homeScore: 999,
      awayScore: 0,
    });
  });

  it("RF-025 E-022: only the digits of what is typed in a score reach the draft", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(scoreFields()[0]!, "1a2-3");
    expect(scoreFields()[0]).toHaveDisplayValue("123");
  });
});

describe("match details, an incomplete score (RF-025)", () => {
  it.each([
    ["home", 0],
    ["away", 1],
  ] as const)(
    "RF-025: only the %s score typed and «Guardar» pressed shows «Escribe los dos resultados o ninguno.», saves nothing and stays on the details",
    async (_side, index) => {
      ({ db } = seedDetails({ values: { date: "2026-11-11" } }));
      await openDetailsFromGrid(1);
      await typeIn(scoreFields()[index]!, "54");
      expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
      await pressSaveMatch();
      expect(messageShown(SCORE_INCOMPLETE)).toBe(true);
      expect(savedMatch(db, 1)).toMatchObject({
        homeScore: null,
        awayScore: null,
      });
      expect(screen).toHavePathname("/matches/1/edit");
      expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    },
  );

  it("RF-025: with one score emptied on a match that had both, the old score stays saved, and filling it again saves the match", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(scoreFields()[1]!, "");
    await pressSaveMatch();
    expect(messageShown(SCORE_INCOMPLETE)).toBe(true);
    expect(savedMatch(db, 1)).toMatchObject({ homeScore: 72, awayScore: 65 });
    await typeIn(scoreFields()[1]!, "70");
    expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({ homeScore: 72, awayScore: 70 });
  });
});

describe("match details, the save fails (RF-085)", () => {
  it("RF-085: a failing save shows «No se ha podido guardar el cambio. Inténtalo de nuevo.», does not leave, saves nothing and keeps what was typed", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Cadete B");
    await typeIn(scoreFields()[0]!, "54");
    await typeIn(notesField(), "Nota nueva");
    failMatchUpdates(db);
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
    expect(screen).toHavePathname("/matches/1/edit");
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
    expect(shown()).toMatchObject({ home: "Cadete B", notes: "Nota nueva" });
    expect(scoreFields()[0]).toHaveDisplayValue("54");
  });

  it("RF-085: a second «Guardar» once the failure stops saves the kept text, goes back and writes once", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Cadete B");
    failMatchUpdates(db);
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toBeTruthy();
    allowMatchUpdates(db);
    logMatchUpdates(db);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Cadete B" });
    expect(loggedUpdates(db)).toBe(1);
  });

  it("RF-085: the match deleted behind the app's back makes «Guardar» show the save error and leave nothing written", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    db.run(sql`DELETE FROM matches WHERE id = 1`);
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
    expect(screen).toHavePathname("/matches/1/edit");
    expect(savedMatch(db, 1)).toBeUndefined();
  });
});

describe("match details, quick presses (RF-025, RF-085)", () => {
  it("RF-025 RF-085: two quick presses on «Guardar» write the match once", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Cadete B");
    logMatchUpdates(db);
    await pressTwiceAtOnce();
    await waitForPathname("/matches/1");
    expect(loggedUpdates(db)).toBe(1);
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Cadete B" });
  });

  it("RF-025 RF-085: two quick presses on «Guardar» while the save fails show the error once and write nothing", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Cadete B");
    failMatchUpdates(db);
    await pressTwiceAtOnce();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(savedMatch(db, 1)).toMatchObject({ homeName: "Águilas" });
  });
});
