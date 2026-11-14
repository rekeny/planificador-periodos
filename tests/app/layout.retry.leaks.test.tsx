// T087: what the start-up failure never shows or logs, and what happens when the layout goes away
// (RF-085, principle 5: no error text, path or player name on screen or in a log; principle 2:
// nothing is deleted). Same doubles as layout.retry.test.tsx; the real routes run through
// renderRouter.
import {
  act,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";

import { createSquadStore } from "@/state/squad-store";
import { ALEVIN } from "../support/squad-fixtures";
import {
  deferred,
  fail,
  LEAKY_MESSAGE,
  OPEN_FAILED,
  plan,
  RETRY,
  succeed,
  watchConsole,
} from "../support/database-start-harness";
import { useMockSquadStore } from "../support/mock-app-stores";
import { resetMockDatabase } from "../support/mock-database";
import { screenTexts } from "../support/screen-reading";

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
let output: ReturnType<typeof watchConsole>;

beforeEach(() => {
  hideAsync.mockClear();
  useMockSquadStore(createSquadStore(resetMockDatabase()));
  output = watchConsole();
});

afterEach(() => output.restore());

function expectNoLeak(): void {
  const drawn = JSON.stringify(screen.toJSON());
  expect(drawn).not.toMatch(/Ana|planificador|\/data\//);
  expect(output.calls()).toBe(0);
}

describe("root layout, nothing leaks from the failure", () => {
  it("RF-085: an Error whose message holds a player name and a path shows neither on screen nor in any console channel, through the retries", async () => {
    const [first, second, third] = [deferred(), deferred(), deferred()];
    plan(initializeDatabase, [first, second, third]);
    await renderRouter("./src/app");
    await fail(first, new Error(LEAKY_MESSAGE));
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    expectNoLeak();
    await fireEvent.press(retryButton());
    await fail(second, new Error(LEAKY_MESSAGE));
    expectNoLeak();
    await fireEvent.press(retryButton());
    await succeed(third);
    expectNoLeak();
  });

  it.each([
    ["a string", LEAKY_MESSAGE],
    ["undefined", undefined],
    ["null", null],
    ["a number", 42],
    ["an object with a path", { path: LEAKY_MESSAGE }],
  ])(
    "RF-085: a rejection that is not an Error behaves the same: the message and «Reintentar» only, no leak and no console output",
    async (_name, reason) => {
      const first = deferred();
      plan(initializeDatabase, [first]);
      await renderRouter("./src/app");
      await fail(first, reason);
      expect(screenTexts()).toEqual([OPEN_FAILED, RETRY]);
      expect(retryButton()).toBeEnabled();
      expectNoLeak();
    },
  );
});

describe("root layout, interruptions", () => {
  it("RF-085: the layout unmounted while a retry runs gets no error and writes nothing when the retry ends", async () => {
    const [first, second] = [deferred(), deferred()];
    plan(initializeDatabase, [first, second]);
    await renderRouter("./src/app");
    await fail(first);
    await fireEvent.press(retryButton());
    await act(async () => screen.unmount());
    await succeed(second);
    expect(output.calls()).toBe(0);
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it("RF-085: the app closed while the message is shown and opened again with a working database lists the teams that were saved", async () => {
    const database = resetMockDatabase();
    const saver = createSquadStore(database);
    saver.getState().createTeam(ALEVIN);
    useMockSquadStore(createSquadStore(database));
    const first = deferred();
    plan(initializeDatabase, [first]);
    await renderRouter("./src/app");
    await fail(first);
    expect(screen.getByText(OPEN_FAILED)).toBeOnTheScreen();
    await act(async () => screen.unmount());

    useMockSquadStore(createSquadStore(database));
    const relaunch = deferred();
    plan(initializeDatabase, [relaunch]);
    hideAsync.mockClear();
    await renderRouter("./src/app");
    await succeed(relaunch);
    expect(await screen.findByText("Alevín A")).toBeTruthy();
    expect(screen.queryByText(OPEN_FAILED)).toBeNull();
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });
});
