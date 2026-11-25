// F-D3-08 (Codex review run 4, finding 1, RF-045, RF-052): with the stack `/ → /matches/1 →
// /matches → /matches/1` two grids of the same match are mounted and share one session, so one
// pending question must open ONE dialog, from the focused grid only (two native dialogs on
// Android). Real src/app routes through renderRouter; same doubles as match-screen.questions.test.tsx.
import { screen, testRouter } from "expo-router/testing-library";

import { FULL_P2 } from "../support/match-session-questions";
import { PHONE, openPlan, tap } from "../support/match-screen-grid";
import { QUESTION, SUB, hosts, press } from "../support/match-screen-questions";
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

describe("match screen, two grids of the same match in the stack", () => {
  it("RF-045 RF-052: a pending question opens one dialog, not one per mounted grid, and it can be answered", async () => {
    const s = await openPlan(9, FULL_P2);
    await testRouter.push("/matches");
    await testRouter.push(`/matches/${s.matchId}`);
    expect(screen).toHavePathname(`/matches/${s.matchId}`);
    await tap("Jugador 1", "P2");
    expect(hosts()).toHaveLength(1);
    expect(screen.getByText(QUESTION)).toBeOnTheScreen();
    await press(SUB);
    expect(hosts()).toHaveLength(0);
  });
});
