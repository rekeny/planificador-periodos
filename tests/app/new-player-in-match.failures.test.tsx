// T047: the new-player-from-the-match form when saving fails and on quick presses (RF-035, RF-085).
// Same doubles as new-player-in-match.save.test.tsx. Failures are real SQLite triggers.
import { fireEvent, screen, testRouter } from "expo-router/testing-library";

import { squadSpecs } from "../support/match-session-fixtures";
import {
  allowWrites,
  failWrites,
  savedCallUp,
  savedTeam,
} from "../support/match-session-call-up";
import { SAVE_FAILED, pressSave, saveButton } from "../support/new-team-form";
import { addViaForm, typeNumber, typePlayerName } from "../support/team-screen";
import { removeButtons, shows, startSession } from "../support/call-up-screen";
import {
  countOf,
  openFormAlone,
  openFormFromMatch,
} from "../support/new-player-in-match";

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

describe("new player from the match, when saving fails", () => {
  it.each(["players", "call_up_entries"] as const)(
    "RF-085 RF-035: a failed write in %s shows the message, keeps the form and its text, and the player exists neither in the team nor in the call-up",
    async (table) => {
      const s = startSession(squadSpecs(9));
      failWrites(s.db, table, "INSERT");
      await openFormAlone(s);
      await addViaForm("Nora", "15");
      expect(await screen.findByText(SAVE_FAILED)).toBeTruthy();
      expect(screen).toHavePathname(`/matches/${s.matchId}/new-player`);
      expect(screen.getByLabelText("Nombre")).toHaveDisplayValue("Nora");
      expect(screen.getByLabelText("Dorsal")).toHaveDisplayValue("15");
      expect(savedTeam(s.db, s.teamId)).toHaveLength(9);
      expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
      expect(s.store.getState().view?.rows).toHaveLength(9);
    },
  );

  it("RF-085 RF-035: after a failed save, pressing «Guardar» again once the device has space creates the player once and hides the message", async () => {
    const s = startSession(squadSpecs(9));
    failWrites(s.db, "players", "INSERT");
    await openFormAlone(s);
    await addViaForm("Nora", "15");
    await screen.findByText(SAVE_FAILED);
    allowWrites(s.db, "players", "INSERT");
    await pressSave();
    expect(screen.queryByText(SAVE_FAILED)).toBeNull();
    expect(countOf(savedTeam(s.db, s.teamId), "15 Nora")).toBe(1);
    expect(countOf(savedCallUp(s.db, s.matchId), "15 Nora")).toBe(1);
  });

  it("RF-085 RF-035: a failed save from the call-up flow leaves the call-up screen with its nine rows", async () => {
    const s = startSession(squadSpecs(9));
    await openFormFromMatch(s);
    failWrites(s.db, "players", "INSERT");
    await addViaForm("Nora", "15");
    expect((await screen.findAllByText(SAVE_FAILED)).length).toBeGreaterThan(0);
    expect(screen).toHavePathname(`/matches/${s.matchId}/new-player`);
    await testRouter.back();
    expect(removeButtons()).toHaveLength(9);
    expect(shows("Nora")).toBe(false);
  });
});

describe("new player from the match, quick presses", () => {
  it("RF-035: two quick presses on «Guardar» create one player in the team and one entry in the call-up", async () => {
    // A deep link leaves the form as the only screen, so it stays mounted after the save and the
    // second press reaches the very same button: only a guard that outlives the save ignores it.
    const s = startSession(squadSpecs(9));
    await openFormAlone(s);
    await typePlayerName("Nora");
    await typeNumber("15");
    const save = saveButton();
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(countOf(savedTeam(s.db, s.teamId), "15 Nora")).toBe(1);
    expect(countOf(savedCallUp(s.db, s.matchId), "15 Nora")).toBe(1);
    expect(savedTeam(s.db, s.teamId)).toHaveLength(10);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(10);
  });
});
