// Fourth Codex review, finding 2 (RF-025, RF-082): every mounted new-match form shares one draft,
// so after team 2's form is pushed over team 1's and the coach goes Back, «Guardar» must still save
// the match for team 1 (the team of that form's route) with team 1's players only. Fields typed in
// the form before leaving may be lost (RF-082: a form left is lost), so no test pins them. Real
// src/app routes and stores on the in-memory database; doubles as new-match.unknown-team.test.tsx.
import { fireEvent, testRouter, waitFor } from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import {
  checkedFormats,
  freshDraft,
  homeField,
  openFormFromTeam,
  pressNewMatch,
  seedTeams,
  typeIn,
} from "../support/new-match-form";
import {
  saveMatchButton,
  startMatchSession,
  waitForPathname,
} from "../support/new-match-save";
import {
  backToFirst,
  listedPlayers,
  matchesPerTeam,
  openThenPushOther,
  saveAndRead,
} from "../support/new-match-two-teams";

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

// Team 1 «Alevín A» (default 6) has Ana (4); team 2 «Cadete B» (default 8) has Eva (5).
beforeEach(() => {
  db = resetMockDatabase();
  useMockSquadStore(createSquadStore(db));
  freshDraft(db);
  startMatchSession(db);
  seedTeams(db);
});

describe("new-match, two team forms in the same stack", () => {
  it("RF-025 RF-082: team 1's form, team 2's form over it, Back and «Guardar» saves the match under team 1 with Ana only", async () => {
    await openThenPushOther("Alevín A", 2);
    await backToFirst(1);
    expect(await saveAndRead(db)).toEqual(["4 Ana"]);
    expect(savedMatches(db)).toMatchObject([{ teamId: 1 }]);
    expect(matchesPerTeam(db)).toEqual([1, 0]);
  });

  it("RF-025 RF-082: after Back, the form shows team 1's call-up and its default format, not team 2's", async () => {
    await openThenPushOther("Alevín A", 2);
    await backToFirst(1);
    await waitFor(() => expect(listedPlayers()).toEqual(["4 Ana"]));
    expect(checkedFormats()).toEqual([6]);
  });

  it("RF-025 RF-082: the reverse order, team 2's form, team 1's over it, Back and «Guardar» saves under team 2 with Eva only", async () => {
    await openThenPushOther("Cadete B", 1);
    await backToFirst(2);
    expect(await saveAndRead(db)).toEqual(["5 Eva"]);
    expect(matchesPerTeam(db)).toEqual([0, 1]);
    expect(savedMatches(db)).toMatchObject([{ teamId: 2, format: 8 }]);
  });

  it("RF-025: a double press of «Guardar» after coming Back to team 1's form still creates one match, under team 1", async () => {
    await openThenPushOther("Alevín A", 2);
    await backToFirst(1);
    const button = saveMatchButton();
    await fireEvent.press(button);
    await fireEvent.press(button);
    await waitForPathname("/matches/1");
    expect(matchesPerTeam(db)).toEqual([1, 0]);
  });

  it("RF-082: leaving team 1's form for its own team screen and opening it again resets it, with no typed text", async () => {
    await openFormFromTeam("Alevín A");
    await typeIn(homeField(), "Typed once");
    await testRouter.back();
    await pressNewMatch();
    await waitFor(() => expect(homeField().props.value).toBe(""));
    expect(listedPlayers()).toEqual(["4 Ana"]);
    expect(checkedFormats()).toEqual([6]);
  });
});
