// T044: «Guardar» of the new-match screen when it does not save: a failed save, an incomplete or
// unreachable score, and leaving without «Guardar» (RF-025, RF-031, RF-082, RF-085, E-029 style
// interruptions). Same doubles as new-match.save.test.tsx. Failures are real SQLite triggers. The
// button «Guardar» and the call-up list do not exist yet (see tests/support/new-match-save.ts).
import { act, screen, testRouter } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import {
  allowInserts,
  failInserts,
  savedEntryCount,
  savedEntryLabels,
  savedMatches,
} from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  SCORE_INCOMPLETE,
  awayField,
  freshDraft,
  homeField,
  notesField,
  openFormAlone,
  openFormFromTeam,
  pressNewMatch,
  scoreFields,
  typeIn,
} from "../support/new-match-form";
import { SAVE_FAILED } from "../support/call-up-screen";
import {
  boxStates,
  checkedCount,
  pressSaveMatch,
  seedSquadTeam,
  squadOf,
  startMatchSession,
  toggleAt,
  waitForPathname,
} from "../support/new-match-save";

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
let draft: NewMatchDraft;
let team: number;

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
  startMatchSession(db);
  team = seedSquadTeam(db, squadOf(12));
});

const messageShown = (text: string): boolean =>
  screen.queryByText(text) !== null;

describe("new-match «Guardar», the score (RF-025)", () => {
  it.each([
    ["home", 0],
    ["away", 1],
  ] as const)(
    "RF-025: only the %s score typed and «Guardar» pressed shows «Escribe los dos resultados o ninguno.», saves nothing and stays on the form",
    async (_side, index) => {
      await openFormAlone(team);
      await typeIn(scoreFields()[index]!, "54");
      expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
      await pressSaveMatch();
      expect(messageShown(SCORE_INCOMPLETE)).toBe(true);
      expect(savedMatches(db)).toEqual([]);
      expect(screen).toHavePathname(`/teams/${team}/matches/new`);
      expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    },
  );

  it("RF-025: the message disappears once the other score is filled, and «Guardar» then saves the match", async () => {
    await openFormAlone(team);
    await typeIn(scoreFields()[0]!, "54");
    await pressSaveMatch();
    expect(messageShown(SCORE_INCOMPLETE)).toBe(true);
    await typeIn(scoreFields()[1]!, "48");
    expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toMatchObject([{ homeScore: 54, awayScore: 48 }]);
  });

  it("RF-025: the message disappears once both scores are emptied, and «Guardar» then saves a match with no score", async () => {
    await openFormAlone(team);
    await typeIn(scoreFields()[0]!, "54");
    await pressSaveMatch();
    expect(messageShown(SCORE_INCOMPLETE)).toBe(true);
    await typeIn(scoreFields()[0]!, "");
    expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toMatchObject([
      { homeScore: null, awayScore: null },
    ]);
  });

  it("RF-025: a score that the digit filter can never let through (scoreInvalid, written in the draft) shows no message, saves nothing and stays on the form", async () => {
    await openFormAlone(team);
    await act(() => {
      draft.setState({ homeScore: "abc", awayScore: "1" });
    });
    await pressSaveMatch();
    expect(messageShown(SCORE_INCOMPLETE)).toBe(false);
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(savedMatches(db)).toEqual([]);
    expect(screen).toHavePathname(`/teams/${team}/matches/new`);
  });
});

describe("new-match «Guardar», the save fails (RF-085)", () => {
  it("RF-085: a failing save shows «No se ha podido guardar el cambio. Inténtalo de nuevo.», does not navigate, saves no match and keeps what was typed and selected", async () => {
    await openFormAlone(team);
    await typeIn(homeField(), "Cadete B");
    await typeIn(scoreFields()[0]!, "54");
    await typeIn(scoreFields()[1]!, "48");
    await toggleAt(1);
    failInserts(db, "matches");
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
    expect(screen).toHavePathname(`/teams/${team}/matches/new`);
    expect(savedMatches(db)).toEqual([]);
    expect(homeField()).toHaveDisplayValue("Cadete B");
    expect(scoreFields()[0]).toHaveDisplayValue("54");
    expect(scoreFields()[1]).toHaveDisplayValue("48");
    expect(checkedCount()).toBe(11);
    expect(boxStates()[1]?.checked).toBe(false);
  });

  it("RF-085: a second «Guardar» once the failure stops saves exactly one match with the kept selection", async () => {
    await openFormAlone(team);
    await typeIn(notesField(), "Final");
    await toggleAt(0);
    failInserts(db, "matches");
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toBeTruthy();
    allowInserts(db, "matches");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toMatchObject([{ notes: "Final" }]);
    expect(savedEntryLabels(db, 1)).toHaveLength(11);
  });

  it("RF-085: a failure while writing the third entry leaves no match and no entry, and the retry saves one match with all of them", async () => {
    await openFormAlone(team);
    failInserts(db, "call_up_entries", "3");
    await pressSaveMatch();
    expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
    expect(savedMatches(db)).toEqual([]);
    expect(savedEntryCount(db)).toBe(0);
    allowInserts(db, "call_up_entries");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryLabels(db, 1)).toHaveLength(12);
  });
});

describe("new-match «Guardar», leaving without it (RF-031, RF-082)", () => {
  it("RF-082: the app closed on the new-match screen before «Guardar» saves no match, and the screen opened again shows the defaults with everyone selected", async () => {
    await openFormAlone(team);
    await typeIn(awayField(), "Infantil C");
    await toggleAt(0);
    await toggleAt(5);
    expect(checkedCount()).toBe(10);
    await act(async () => screen.unmount());
    expect(savedMatches(db)).toEqual([]);
    useMockSquadStore(createSquadStore(db));
    draft = freshDraft(db);
    startMatchSession(db);
    await openFormAlone(team);
    expect(awayField()).toHaveDisplayValue("");
    expect(boxStates()).toHaveLength(12);
    expect(checkedCount()).toBe(12);
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-031 RF-082: Back with players deselected saves nothing, asks nothing, and the next new match starts with everyone selected", async () => {
    await openFormFromTeam("Alevín A");
    await toggleAt(0);
    await toggleAt(1);
    expect(checkedCount()).toBe(10);
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${team}`);
    expect(savedMatches(db)).toEqual([]);
    expect(screen.queryByRole("alert")).toBeNull();
    await pressNewMatch();
    expect(boxStates()).toHaveLength(12);
    expect(checkedCount()).toBe(12);
    expect(savedMatches(db)).toEqual([]);
  });
});
