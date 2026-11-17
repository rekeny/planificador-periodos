// Seventh Codex review, finding 1 (RF-025, RF-082): two new-match forms of the SAME team share one
// draft. After the second form saves (its route is replaced by the grid) and the coach goes Back to
// the first form, that first form must start with a fresh draft: no saved result left over from the
// second form, so «Guardar» there creates a DISTINCT second match with the values typed in the first
// form, never reopening the first one. Real src/app routes and stores on the in-memory database.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import {
  awayField,
  freshDraft,
  homeField,
  openFormFromTeam,
  seedTeams,
  typeIn,
} from "../support/new-match-form";
import {
  pressSaveMatch,
  startMatchSession,
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

beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  freshDraft(db);
  startMatchSession(db);
  seedTeams(db);
});

/** Team 1's form from the list, then a second form of team 1 pushed over it. */
async function openAndPushSameTeam(): Promise<void> {
  await openFormFromTeam("Alevín A");
  await testRouter.push("/teams/1/matches/new");
  await screen.findByLabelText("Local");
  expect(screen).toHavePathname("/teams/1/matches/new");
}

/** Saves the second form (match 1) and goes Back from its grid to the first form. */
async function saveSecondThenBack(): Promise<void> {
  await typeIn(homeField(), "Second form");
  await pressSaveMatch();
  await waitForPathname("/matches/1");
  await testRouter.back();
  await waitFor(() => expect(screen).toHavePathname("/teams/1/matches/new"));
  await screen.findByLabelText("Local");
}

const names = () => savedMatches(db).map((match) => match.homeName);

describe("new-match, two forms of the same team in the same stack", () => {
  it("RF-025 RF-082: the second form saves, Back to the first form shows a fresh draft with no text of the saved match", async () => {
    await openAndPushSameTeam();
    await saveSecondThenBack();
    await waitFor(() => expect(homeField().props.value).toBe(""));
    expect(awayField().props.value).toBe("");
  });

  it("RF-025 RF-082: after Back, the first form's own values and «Guardar» create a distinct second match, not the first one again", async () => {
    await openAndPushSameTeam();
    await saveSecondThenBack();
    await typeIn(homeField(), "First form");
    await typeIn(awayField(), "Rivals");
    await pressSaveMatch();
    await waitForPathname("/matches/2");
    expect(savedMatches(db)).toHaveLength(2);
    expect(savedMatches(db)).toMatchObject([
      { teamId: 1, homeName: "Second form" },
      { teamId: 1, homeName: "First form", awayName: "Rivals" },
    ]);
  });

  it("RF-025 RF-082: a second form left without saving, Back and «Guardar» in the first form creates exactly one match, with its own values", async () => {
    await openAndPushSameTeam();
    await typeIn(homeField(), "Abandoned");
    await testRouter.back();
    await waitFor(() => expect(screen).toHavePathname("/teams/1/matches/new"));
    await screen.findByLabelText("Local");
    await typeIn(homeField(), "First form");
    await pressSaveMatch();
    await waitForPathname("/matches/1");
    expect(names()).toEqual(["First form"]);
  });
});
