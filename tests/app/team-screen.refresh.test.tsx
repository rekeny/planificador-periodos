// D2 review F4 (RF-035, RF-069): the team screen stays mounted under the match, so a player
// created from the match must show on it, with the duplicate-number banner, when the coach comes
// back. Real src/app routes through renderRouter, the real squad store and match session store on
// the same in-memory database (the stack set up as in match-undo-routes.call-up.test.tsx).
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { createPlayer } from "@/data/player-repository";
import { savedTeam } from "../support/match-session-call-up";
import { startSession } from "../support/call-up-screen";
import { PHONE } from "../support/match-screen-grid";
import { openFromTeam, pressCallUp } from "../support/match-undo-routes";
import { pressCreatePlayer } from "../support/new-player-in-match";
import { squadSpecs } from "../support/match-session-fixtures";
import { DUPLICATE_BANNER, addViaForm } from "../support/team-screen";
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

beforeEach(async () => setWindow(PHONE.width, PHONE.height));
afterEach(async () => restoreWindow());

describe("team screen, back from a player created in the match", () => {
  it("RF-035 RF-069: team, match, call-up, «Crear jugador nuevo» with the number of «Jugador 9», then Back to the team: the new player is listed and the duplicate banner shows", async () => {
    const s = startSession(squadSpecs(9));
    await openFromTeam(s);
    expect(screen.queryByText(DUPLICATE_BANNER)).toBeNull();
    await pressCallUp();
    await pressCreatePlayer();
    await addViaForm("Nora", "9");
    await waitFor(() =>
      expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`),
    );
    expect(savedTeam(s.db, s.teamId)).toContain("9 Nora");
    await testRouter.back();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(await screen.findByText("Nora")).toBeTruthy();
    expect(screen.getByText("Jugador 9")).toBeTruthy();
    expect(screen.getByText(DUPLICATE_BANNER)).toBeTruthy();
  });

  it("RF-035: a player created from the match with a free number is listed on the team screen when Back arrives, with no duplicate banner", async () => {
    const s = startSession(squadSpecs(9));
    await openFromTeam(s);
    await pressCallUp();
    await pressCreatePlayer();
    await addViaForm("Nora", "15");
    await waitFor(() =>
      expect(screen).toHavePathname(`/matches/${s.matchId}/call-up`),
    );
    await testRouter.back();
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(await screen.findByText("Nora")).toBeTruthy();
    expect(screen.queryByText(DUPLICATE_BANNER)).toBeNull();
  });

  it("RF-035 RF-069: a player written in the database while the team screen is below the match is listed with the banner when the team screen regains focus", async () => {
    const s = startSession(squadSpecs(9));
    await openFromTeam(s);
    createPlayer(s.db, { teamId: s.teamId, name: "Nora", number: "9" });
    await testRouter.back();
    expect(screen).toHavePathname(`/teams/${s.teamId}`);
    expect(await screen.findByText("Nora")).toBeTruthy();
    expect(screen.getByText(DUPLICATE_BANNER)).toBeTruthy();
  });
});
