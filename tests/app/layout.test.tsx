// T029: the root layout keeps the splash screen and shows no screen until initializeDatabase() ends
// (RF-011, RF-082). The splash screen, the router and initializeDatabase are doubles; the layout
// is the real file. `@/state/database-ready` does not exist until the Implementer writes it, so it
// is mocked through a factory and read back with `jest.requireMock`.
import { act, render, screen } from "@testing-library/react-native";

import RootLayout from "@/app/_layout";

const READY_MODULE = "../../src/state/database-ready";
type ReadyModule = { initializeDatabase: jest.Mock<Promise<void>, []> };

jest.mock(
  "../../src/state/database-ready",
  () => ({ initializeDatabase: jest.fn() }),
  {
    virtual: true,
  },
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  const native =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { Stack: () => react.createElement(native.Text, null, "SCREENS") };
});

const splash = jest.requireMock<{
  preventAutoHideAsync: jest.Mock;
  hideAsync: jest.Mock;
}>("expo-splash-screen");
const { initializeDatabase } = jest.requireMock<ReadyModule>(READY_MODULE);

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

function deferred(): Deferred {
  let resolve = (): void => {};
  let reject = (_error: Error): void => {};
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  splash.hideAsync.mockClear();
  initializeDatabase.mockReset();
});

describe("root layout, start-up", () => {
  it("RF-011 RF-082: it keeps the splash screen from the start", async () => {
    initializeDatabase.mockReturnValue(deferred().promise);
    await render(<RootLayout />);
    expect(splash.preventAutoHideAsync).toHaveBeenCalled();
  });

  it("RF-011 RF-082: it starts the database once and shows no screen and no splash hiding while it opens", async () => {
    initializeDatabase.mockReturnValue(deferred().promise);
    const view = await render(<RootLayout />);
    await view.rerender(<RootLayout />);
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("SCREENS")).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it("RF-011 RF-082: when the database is ready it shows the screens and hides the splash screen once", async () => {
    const pending = deferred();
    initializeDatabase.mockReturnValue(pending.promise);
    await render(<RootLayout />);
    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(screen.getByText("SCREENS")).toBeTruthy();
    expect(splash.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("RF-011 RF-082: when the database fails it keeps the splash screen and renders no screen", async () => {
    const pending = deferred();
    initializeDatabase.mockReturnValue(pending.promise);
    await render(<RootLayout />);
    await act(async () => {
      pending.reject(new Error("migration failed"));
      await pending.promise.catch(() => undefined);
    });
    expect(screen.queryByText("SCREENS")).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });
});
