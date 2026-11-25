// F-D3-04 (Codex review of PR 25, finding 2, RF-023, RF-032): a player deactivated while a match
// session is open is no longer offered in the call-up screen and cannot be added. The stack is the
// team screen, the grid and the call-up screen, with the player's edit route pushed over the
// call-up: «Desactivar», Back. The refresh of the candidates keeps the Undo history and the marks
// of the grid. Real src/app routes and stores on the in-memory database; same doubles as
// match-undo-routes.call-up.test.tsx.
import { screen, testRouter, waitFor } from "expo-router/testing-library";

import { pressAdd, startSession } from "../support/call-up-screen";
import { deactivateOver } from "../support/deactivated-while-open";
import { savedCallUp } from "../support/match-session-call-up";
import { squadSpecs } from "../support/match-session-fixtures";
import { savedMarks } from "../support/match-session-marks";
import {
  PHONE,
  cellState,
  pressButton,
  tap,
  UNDO,
} from "../support/match-screen-grid";
import {
  openFromTeam,
  pressCallUp,
  undoButton,
} from "../support/match-undo-routes";
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

/** Nine players called up, Carla (20) and Dani (21) active and outside the call-up; the call-up screen is open. */
async function openCallUpWithBench() {
  const s = startSession(squadSpecs(9), [
    ["Carla", "20"],
    ["Dani", "21"],
  ]);
  await openFromTeam(s);
  await tap("Jugador 1", "P1");
  await pressCallUp();
  const [carla, dani] = s.benched;
  return { s, carla: carla?.id ?? 0, dani: dani?.id ?? 0 };
}

const offered = (name: string): boolean =>
  screen.queryByText(new RegExp(name)) !== null;
const offeredBySession = (
  s: Awaited<ReturnType<typeof openCallUpWithBench>>["s"],
) => (s.store.getState().view?.playersToAdd ?? []).map((player) => player.name);

describe("call-up screen, a player deactivated while the session is open (F-D3-04)", () => {
  it("F-D3-04 RF-023 RF-032: after «Desactivar» and Back the call-up screen offers Dani and no longer Carla, and neither does the session's playersToAdd", async () => {
    const { s, carla } = await openCallUpWithBench();
    expect(offered("Carla")).toBe(true);
    await deactivateOver(s.teamId, carla, `/matches/${s.matchId}/call-up`);
    expect(offered("Carla")).toBe(false);
    expect(offered("Dani")).toBe(true);
    expect(offeredBySession(s)).toEqual(["Dani"]);
  });

  it("F-D3-04 RF-023 RF-032: adding the deactivated player from the session returns unchanged and writes no entry", async () => {
    const { s, carla } = await openCallUpWithBench();
    await deactivateOver(s.teamId, carla, `/matches/${s.matchId}/call-up`);
    const before = savedCallUp(s.db, s.matchId);
    expect(s.store.getState().addToCallUp(carla)).toEqual({
      kind: "unchanged",
    });
    expect(savedCallUp(s.db, s.matchId)).toEqual(before);
    expect(savedCallUp(s.db, s.matchId)).toHaveLength(9);
  });

  it("F-D3-04 RF-023 RF-032: the other player is still added by pressing his name, and the deactivated one never shows in the grid", async () => {
    const { s, carla } = await openCallUpWithBench();
    await deactivateOver(s.teamId, carla, `/matches/${s.matchId}/call-up`);
    await screen.findByText(/Dani/);
    await pressAdd("Dani");
    expect(savedCallUp(s.db, s.matchId)).toContain("21 Dani");
    expect(savedCallUp(s.db, s.matchId)).not.toContain("20 Carla");
    expect(offered("Carla")).toBe(false);
  });

  it("F-D3-04 RF-023 RF-086: refreshing the candidates keeps the grid's mark and its Undo, which still reverts it after going back", async () => {
    const { s, carla } = await openCallUpWithBench();
    await deactivateOver(s.teamId, carla, `/matches/${s.matchId}/call-up`);
    await testRouter.back();
    await waitFor(() => expect(screen).toHavePathname(`/matches/${s.matchId}`));
    expect(cellState("Jugador 1", "P1")).toBe("starter");
    expect(undoButton()).toBeEnabled();
    await pressButton(UNDO);
    expect(cellState("Jugador 1", "P1")).toBe("empty");
    expect(savedMarks(s.db, s.matchId)).toEqual([]);
  });
});
