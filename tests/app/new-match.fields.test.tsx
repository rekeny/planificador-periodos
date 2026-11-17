// T043: the fields of the new-match form: names, score, notes and the quick option (RF-025,
// RF-027, E-022). Same doubles as new-match.form.test.tsx. The draft keeps what is typed; to see
// what would be saved, the tests call the draft's `create()` (T086) after typing in the form,
// because «Guardar» comes in T044. The route and its files do not exist yet.
import { screen } from "expo-router/testing-library";

import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  awayField,
  chooseFormatInForm,
  homeField,
  notesField,
  openFormAlone,
  pressQuick,
  scoreFields,
  seedTeams,
  freshDraft,
  typeIn,
} from "../support/new-match-form";

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

const FORTY = "Club Baloncesto Alevín Aragón Zaragoza 1";
const FIVE_HUNDRED = "n".repeat(500);
const DIGIT_FILTER: [string, string][] = [
  ["7a-", "7"],
  ["abc", ""],
  ["1 2", "12"],
  ["12.5", "125"],
  ["-3", "3"],
  ["007", "007"],
  ["0", "0"],
  ["", ""],
];
type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let draft: NewMatchDraft;
let alevin: number;

beforeEach(() => {
  db = resetMockDatabase();
  alevin = seedTeams(db).alevin;
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
});

describe("new-match form, limits and keyboards (E-022)", () => {
  it("RF-025 E-022: home and away stop at 40 characters, notes at 500 and each score at 3 digits (maxLength props)", async () => {
    await openFormAlone(alevin);
    expect(homeField().props.maxLength).toBe(40);
    expect(awayField().props.maxLength).toBe(40);
    expect(notesField().props.maxLength).toBe(500);
    expect(scoreFields().map((field) => field.props.maxLength)).toEqual([3, 3]);
  });

  it("RF-025 E-022: 40-character names, 500-character notes and a score of 999 to 0 are kept as typed, with no message", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), FORTY);
    await typeIn(awayField(), FORTY.toUpperCase());
    await typeIn(notesField(), FIVE_HUNDRED);
    await typeIn(scoreFields()[0]!, "999");
    await typeIn(scoreFields()[1]!, "0");
    expect(homeField()).toHaveDisplayValue(FORTY);
    expect(awayField()).toHaveDisplayValue(FORTY.toUpperCase());
    expect(notesField()).toHaveDisplayValue(FIVE_HUNDRED);
    expect(scoreFields()[0]).toHaveDisplayValue("999");
    expect(scoreFields()[1]).toHaveDisplayValue("0");
    expect(draft.getState()).toMatchObject({
      homeName: FORTY,
      notes: FIVE_HUNDRED,
      homeScore: "999",
      awayScore: "0",
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-025: both score fields use the numeric keyboard and the names and notes do not", async () => {
    await openFormAlone(alevin);
    scoreFields().forEach((field) =>
      expect(field.props.keyboardType).toBe("number-pad"),
    );
    [homeField(), awayField(), notesField()].forEach((field) =>
      expect(field.props.keyboardType).not.toBe("number-pad"),
    );
  });

  it.each(DIGIT_FILTER)(
    "RF-025: typing «%s» in either score field leaves «%s» in the field and in the draft",
    async (typed, kept) => {
      await openFormAlone(alevin);
      await typeIn(scoreFields()[0]!, typed);
      await typeIn(scoreFields()[1]!, typed);
      expect(scoreFields()[0]).toHaveDisplayValue(kept);
      expect(scoreFields()[1]).toHaveDisplayValue(kept);
      expect(draft.getState().homeScore).toBe(kept);
      expect(draft.getState().awayScore).toBe(kept);
    },
  );
});

describe("new-match form, what is typed reaches the draft", () => {
  it("RF-025: the draft keeps the names and notes as typed, spaces included, and the fields show them", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), " Cadete B ");
    await typeIn(awayField(), "Águilas 🏀 Ñandú");
    await typeIn(notesField(), "  Pista cubierta ");
    expect(draft.getState()).toMatchObject({
      homeName: " Cadete B ",
      awayName: "Águilas 🏀 Ñandú",
      notes: "  Pista cubierta ",
    });
    expect(awayField()).toHaveDisplayValue("Águilas 🏀 Ñandú");
  });

  it("RF-025: « Cadete B » typed in the form is saved as «Cadete B», «007» as 7, and a 0–0 score is accepted", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), " Cadete B ");
    await typeIn(scoreFields()[0]!, "007");
    await typeIn(scoreFields()[1]!, "0");
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { homeName: "Cadete B", homeScore: 7, awayScore: 0, awayName: null },
    ]);
  });

  it("RF-025: a home name of only spaces and empty away, score and notes are saved as no home name, no away name, no score and no notes", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), "     ");
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      {
        homeName: null,
        awayName: null,
        homeScore: null,
        awayScore: null,
        notes: null,
      },
    ]);
  });

  it("RF-084 RF-025: changing the format after typing keeps every typed field", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), "Cadete B");
    await typeIn(scoreFields()[0]!, "12");
    await typeIn(notesField(), "Final de liga");
    await chooseFormatInForm(8);
    expect(homeField()).toHaveDisplayValue("Cadete B");
    expect(scoreFields()[0]).toHaveDisplayValue("12");
    expect(notesField()).toHaveDisplayValue("Final de liga");
  });
});

describe("new-match form, the quick option (RF-027)", () => {
  it("RF-027: «Mi equipo es local» writes the team name, without the category, in «Local» only, and the text can then be edited", async () => {
    await openFormAlone(alevin);
    await pressQuick("home");
    expect(homeField()).toHaveDisplayValue("Alevín A");
    expect(awayField()).toHaveDisplayValue("");
    expect(draft.getState().homeName).toBe("Alevín A");
    await typeIn(homeField(), "Alevín A - B");
    expect(homeField()).toHaveDisplayValue("Alevín A - B");
    expect(draft.getState().homeName).toBe("Alevín A - B");
  });

  it("RF-027: «Mi equipo es visitante» fills only «Visitante»", async () => {
    await openFormAlone(alevin);
    await pressQuick("away");
    expect(awayField()).toHaveDisplayValue("Alevín A");
    expect(homeField()).toHaveDisplayValue("");
    expect(draft.getState()).toMatchObject({
      awayName: "Alevín A",
      homeName: "",
    });
  });

  it("RF-027: the quick option replaces what was typed and, pressed twice, writes the name once", async () => {
    await openFormAlone(alevin);
    await typeIn(homeField(), "Otro equipo");
    await pressQuick("home");
    await pressQuick("home");
    expect(homeField()).toHaveDisplayValue("Alevín A");
  });

  it("RF-027: using the quick option never changes the team's name or category", async () => {
    await openFormAlone(alevin);
    await pressQuick("home");
    await pressQuick("away");
    await typeIn(homeField(), "Otro nombre");
    expect(
      listTeams(db)
        .filter((team) => team.id === alevin)
        .map(({ name, category }) => ({ name, category })),
    ).toEqual([{ name: "Alevín A", category: "2015" }]);
  });
});
