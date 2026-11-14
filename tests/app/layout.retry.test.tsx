// T087: the root layout when the data cannot be opened (RF-085, RF-011, RF-082). The real routes
// of src/app run through renderRouter. Doubles: expo-splash-screen (native), initializeDatabase
// (each attempt is controlled by the test) and the squad store of the in-memory database (a real
// store, seeded before the failure). Leaks, odd rejections and interruptions are in
// layout.retry.leaks.test.tsx.
import {
  fireEvent,
  renderRouter,
  screen,
  testRouter,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { ALEVIN, CADETE } from "../support/squad-fixtures";
import {
  deferred,
  fail,
  OPEN_FAILED,
  plan,
  RETRY,
  succeed,
} from "../support/database-start-harness";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { headerConfigs, screenTexts } from "../support/screen-reading";

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
jest.mock("@/state/database-ready", () => ({ initializeDatabase: jest.fn() }));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);

const { initializeDatabase } = jest.requireMock<{
  initializeDatabase: jest.Mock<Promise<void>, []>;
}>("@/state/database-ready");
const { hideAsync } = jest.requireMock<{ hideAsync: jest.Mock }>(
  "expo-splash-screen",
);

const EMPTY = "Todavía no hay equipos. Crea el primero.";
const retryButton = () => screen.getByRole("button", { name: RETRY });

beforeEach(() => {
  hideAsync.mockClear();
  useMockSquadStore(createSquadStore(resetMockDatabase()));
});

describe("root layout, the data cannot be opened", () => {
  it("RF-085: while the first attempt runs nothing is drawn, the message is not shown and the splash screen is not hidden", async () => {
    plan(initializeDatabase, [deferred()]);
    await renderRouter("./src/app");
    expect(screen.queryByText(OPEN_FAILED)).toBeNull();
    expect(screen.queryByRole("button", { name: RETRY })).toBeNull();
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it("RF-085: when the first attempt fails the splash screen is hidden once, the message and «Reintentar» are shown and no route is drawn", async () => {
    const first = deferred();
    plan(initializeDatabase, [first]);
    await renderRouter("./src/app");
    await fail(first);
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expect(retryButton()).toBeEnabled();
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText("Equipos")).toBeNull();
    expect(headerConfigs()).toEqual([]);
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });

  it("RF-085: «Reintentar» that succeeds replaces the message with the list of teams and the splash screen was hidden once in total", async () => {
    const [first, second] = [deferred(), deferred()];
    plan(initializeDatabase, [first, second]);
    await renderRouter("./src/app");
    await fail(first);
    await fireEvent.press(retryButton());
    await succeed(second);
    expect(screen.queryByText(OPEN_FAILED)).toBeNull();
    expect(screen.queryByRole("button", { name: RETRY })).toBeNull();
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screen).toHavePathname("/");
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });

  it("RF-085: after a successful retry the teams saved before the failure are listed", async () => {
    const database = resetMockDatabase();
    const saver = createSquadStore(database);
    [CADETE, ALEVIN].forEach((team) => saver.getState().createTeam(team));
    useMockSquadStore(createSquadStore(database));
    const [first, second] = [deferred(), deferred()];
    plan(initializeDatabase, [first, second]);
    await renderRouter("./src/app");
    await fail(first);
    await fireEvent.press(retryButton());
    await succeed(second);
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screenTexts()).toEqual(["Alevín A", "2015", "Cadete B"]);
    expect(screen).toHavePathname("/");
    expect(testRouter.canGoBack()).toBe(false);
  });

  it("RF-085: while a retry runs the message stays, the button is disabled and two presses make one attempt", async () => {
    const [first, second] = [deferred(), deferred()];
    plan(initializeDatabase, [first, second]);
    await renderRouter("./src/app");
    await fail(first);
    await fireEvent.press(retryButton());
    await fireEvent.press(retryButton());
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expect(retryButton()).toBeDisabled();
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });

  it("RF-085: a retry that fails again keeps the message, enables the button, and a third press tries once more", async () => {
    const [first, second, third] = [deferred(), deferred(), deferred()];
    plan(initializeDatabase, [first, second, third]);
    await renderRouter("./src/app");
    await fail(first);
    await fireEvent.press(retryButton());
    await fail(second);
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expect(retryButton()).toBeEnabled();
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    await fireEvent.press(retryButton());
    expect(initializeDatabase).toHaveBeenCalledTimes(3);
    await succeed(third);
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it("RF-085: nothing retries by itself: the attempts equal the presses", async () => {
    jest.useFakeTimers();
    try {
      const first = deferred();
      plan(initializeDatabase, [first]);
      await renderRouter("./src/app");
      await fail(first);
      jest.advanceTimersByTime(10 * 60 * 1000);
      expect(initializeDatabase).toHaveBeenCalledTimes(1);
      expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it("RF-011 RF-082: when the first attempt succeeds there is no message, the teams are listed and the splash screen is hidden once", async () => {
    const first = deferred();
    plan(initializeDatabase, [first]);
    await renderRouter("./src/app");
    await succeed(first);
    expect(await screen.findByText(EMPTY)).toBeTruthy();
    expect(screen.queryByText(OPEN_FAILED)).toBeNull();
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });
});
