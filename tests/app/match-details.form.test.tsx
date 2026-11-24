// T072: the match details screen, its form and «Guardar» when it works (RF-001, RF-025, RF-027,
// RF-028, RF-082). Real src/app routes through renderRouter, with the real match session store and
// the real details draft on the in-memory database; only expo-sqlite, the splash screen,
// initializeDatabase and the store getters of `@/state/app-stores` are doubles. The route
// `/matches/[matchId]/edit` and the button «Editar» do not exist yet; their assumed shape is in
// tests/support/match-details.ts. The time field is in match-details.time.test.tsx, the limits and
// the failures in match-details.failures.test.tsx.
import { screen, testRouter } from "expo-router/testing-library";

import { resetMockDatabase } from "../support/mock-database";
import { createdDetailsDrafts } from "../support/mock-app-stores";
import {
  FILLED,
  SCORE_INCOMPLETE,
  openDetailsFromGrid,
  pressEdit,
  savedMatch,
  seedDetails,
  shown,
} from "../support/match-details";
import {
  awayField,
  checkedFormats,
  homeField,
  notesField,
  pressQuick,
  scoreFields,
  typeIn,
} from "../support/new-match-form";
import { pressSaveMatch, waitForPathname } from "../support/new-match-save";
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

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

afterEach(async () => restoreWindow());

const SAVED = {
  home: "Águilas",
  away: "Rival",
  scores: ["72", "65"],
  notes: "Llevar petos",
};

describe("match details, what the form shows (RF-025, RF-001)", () => {
  it("RF-025 RF-028: the details open with the saved names, score, notes and date", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    expect(shown()).toEqual(SAVED);
    expect(screen.getByText("01/11/2026")).toBeTruthy();
    expect(screen).toHavePathname("/matches/1/edit");
  });

  it("RF-025 RF-028: a match with no names, score or notes opens with empty fields and no message", async () => {
    ({ db } = seedDetails({ values: { date: "2026-11-11" } }));
    await openDetailsFromGrid(1);
    expect(shown()).toEqual({
      home: "",
      away: "",
      scores: ["", ""],
      notes: "",
    });
    expect(screen.queryByText(SCORE_INCOMPLETE)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([4, 6, 8] as const)(
    "RF-001: the format picker of a %i-period match shows 4, 6 and 8 periods with only the session's format selected",
    async (format) => {
      ({ db } = seedDetails({ format }));
      await openDetailsFromGrid(1);
      for (const periods of [4, 6, 8]) {
        expect(
          screen.getByRole("radio", { name: `${periods} periodos` }),
        ).toBeTruthy();
      }
      expect(checkedFormats()).toEqual([format]);
    },
  );

  it("RF-025 RF-082: the form has its own draft, and a re-render (the window turns) keeps what was typed and builds no second draft", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Escrito");
    await setWindow(667, 375);
    expect(homeField().props.value).toBe("Escrito");
    expect(createdDetailsDrafts()).toHaveLength(1);
  });
});

describe("match details, «Guardar» saves and goes back (RF-025, RF-028)", () => {
  it("RF-028 RF-025: new names and score, «Guardar» → the grid again, the database has them, and the details opened again show them", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "Cadete B");
    await typeIn(awayField(), "Zorros");
    await typeIn(scoreFields()[0]!, "54");
    await typeIn(scoreFields()[1]!, "48");
    await typeIn(notesField(), "Ganamos");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(screen.queryByLabelText("Local")).toBeNull();
    expect(savedMatch(db, 1)).toMatchObject({
      homeName: "Cadete B",
      awayName: "Zorros",
      homeScore: 54,
      awayScore: 48,
      notes: "Ganamos",
    });
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(shown()).toEqual({
      home: "Cadete B",
      away: "Zorros",
      scores: ["54", "48"],
      notes: "Ganamos",
    });
  });

  it.each([4, 6, 8] as const)(
    "RF-082 RF-025: «Guardar» in a %i-period match keeps its format, its overtimes and its team",
    async (format) => {
      ({ db } = seedDetails({ format, overtimeCount: 1 }));
      await openDetailsFromGrid(1);
      await typeIn(homeField(), "Otro");
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({
        format,
        overtimeCount: 1,
        teamId: 1,
        homeName: "Otro",
      });
    },
  );

  it("RF-025 RF-028: names are saved trimmed, and a score of 0–0 is a score", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "  Cadete B  ");
    await typeIn(scoreFields()[0]!, "0");
    await typeIn(scoreFields()[1]!, "0");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({
      homeName: "Cadete B",
      homeScore: 0,
      awayScore: 0,
    });
  });

  it("RF-025 RF-028: every optional field cleared and «Guardar» saves no names, no score and no notes, and keeps the date", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "");
    await typeIn(awayField(), "");
    await typeIn(scoreFields()[0]!, "");
    await typeIn(scoreFields()[1]!, "");
    await typeIn(notesField(), "");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({
      homeName: null,
      awayName: null,
      homeScore: null,
      awayScore: null,
      notes: null,
      date: FILLED.date,
    });
  });
});

describe("match details, «Mi equipo es local» and «Mi equipo es visitante» (RF-027)", () => {
  it.each([
    ["home", "Alevín A", "Rival"],
    ["away", "Águilas", "Alevín A"],
  ] as const)(
    "RF-027: «Mi equipo es %s» and «Guardar» write the team's name, without the category, in that field only",
    async (side, home, away) => {
      ({ db } = seedDetails());
      await openDetailsFromGrid(1);
      await pressQuick(side);
      await pressSaveMatch();
      await waitForPathname("/matches/1");
      expect(savedMatch(db, 1)).toMatchObject({
        homeName: home,
        awayName: away,
      });
    },
  );
});

describe("match details, leaving without «Guardar» (RF-082)", () => {
  it("RF-082: a new home name and score and Back leave the old ones saved, and the details opened again show them", async () => {
    ({ db } = seedDetails());
    await openDetailsFromGrid(1);
    await typeIn(homeField(), "No se guarda");
    await typeIn(scoreFields()[0]!, "1");
    await testRouter.back();
    expect(screen).toHavePathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({
      homeName: "Águilas",
      homeScore: 72,
    });
    await pressEdit();
    await screen.findByLabelText("Local");
    expect(shown()).toEqual(SAVED);
  });
});
