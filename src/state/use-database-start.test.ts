// T087: useDatabaseStart(), the hook that owns the start-up (RF-085, RF-011, RF-082). It calls
// initializeDatabase() on mount and returns { status: "opening" | "failed" | "ready", retrying,
// retry }. `initializeDatabase` is a Jest mock here, so each attempt is controlled by the test.
// `@/state/use-database-start` does not exist until the Implementer writes it (missing module).
import { act, renderHook } from "@testing-library/react-native";

import { useDatabaseStart } from "@/state/use-database-start";
import {
  deferred,
  fail,
  LEAKY_MESSAGE,
  plan,
  succeed,
  watchConsole,
} from "../../tests/support/database-start-harness";

jest.mock("@/state/database-ready", () => ({ initializeDatabase: jest.fn() }));

const { initializeDatabase } = jest.requireMock<{
  initializeDatabase: jest.Mock<Promise<void>, []>;
}>("@/state/database-ready");
let output: ReturnType<typeof watchConsole>;

beforeEach(() => {
  output = watchConsole();
});

afterEach(() => {
  output.restore();
  jest.useRealTimers();
});

async function start(attempts: ReturnType<typeof deferred>[]) {
  plan(initializeDatabase, attempts);
  return renderHook(() => useDatabaseStart());
}

describe("useDatabaseStart, the first attempt", () => {
  it("RF-011 RF-082: it starts as «opening», not retrying, and calls initializeDatabase once on mount and not again on re-render", async () => {
    const view = await start([deferred()]);
    await view.rerender(undefined);
    expect(view.result.current.status).toBe("opening");
    expect(view.result.current.retrying).toBe(false);
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });

  it("RF-011 RF-082: when the attempt resolves the status is «ready» and nothing is retrying", async () => {
    const first = deferred();
    const { result } = await start([first]);
    await succeed(first);
    expect(result.current.status).toBe("ready");
    expect(result.current.retrying).toBe(false);
  });

  it("RF-085: when the attempt rejects the status is «failed» and nothing is retrying", async () => {
    const first = deferred();
    const { result } = await start([first]);
    await fail(first);
    expect(result.current.status).toBe("failed");
    expect(result.current.retrying).toBe(false);
  });

  it("RF-085: it returns only status, retrying and retry: the error is dropped (no text, path or name is kept)", async () => {
    const first = deferred();
    const { result } = await start([first]);
    await fail(first, new Error(LEAKY_MESSAGE));
    expect(Object.keys(result.current).sort()).toEqual([
      "retry",
      "retrying",
      "status",
    ]);
    expect(JSON.stringify(result.current)).not.toMatch(/Ana|planificador/);
  });

  it("RF-085: a rejection that is not an Error (a string, undefined, null, a number) ends in «failed» without throwing or writing to the console", async () => {
    for (const reason of [LEAKY_MESSAGE, undefined, null, 42]) {
      const first = deferred();
      const { result, unmount } = await start([first]);
      await fail(first, reason);
      expect(result.current.status).toBe("failed");
      await unmount();
    }
    expect(output.calls()).toBe(0);
  });

  it("RF-085: after a failure nothing tries again by itself, however long it waits", async () => {
    jest.useFakeTimers();
    const first = deferred();
    await start([first]);
    await fail(first);
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });
});

describe("useDatabaseStart, retry", () => {
  it("RF-085: retry() after a failure calls initializeDatabase once more, keeps «failed» and sets retrying; it ends in «ready» when it succeeds", async () => {
    const [first, second] = [deferred(), deferred()];
    const { result } = await start([first, second]);
    await fail(first);
    await act(async () => result.current.retry());
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("failed");
    expect(result.current.retrying).toBe(true);
    await succeed(second);
    expect(result.current.status).toBe("ready");
    expect(result.current.retrying).toBe(false);
  });

  it("RF-085: a retry that fails again ends in «failed», not retrying, and a third press tries once more; nothing runs by itself", async () => {
    const [first, second, third] = [deferred(), deferred(), deferred()];
    const { result } = await start([first, second, third]);
    await fail(first);
    await act(async () => result.current.retry());
    await fail(second);
    expect(result.current.status).toBe("failed");
    expect(result.current.retrying).toBe(false);
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    await act(async () => result.current.retry());
    expect(initializeDatabase).toHaveBeenCalledTimes(3);
    await succeed(third);
    expect(result.current.status).toBe("ready");
  });

  it("RF-085: retry() does nothing while the first attempt is still opening and once the data is ready", async () => {
    const first = deferred();
    const { result } = await start([first]);
    await act(async () => result.current.retry());
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
    expect(result.current.retrying).toBe(false);
    await succeed(first);
    await act(async () => result.current.retry());
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ready");
  });

  it("RF-085: two presses in the same act start one attempt, because presses are ignored while one runs", async () => {
    const [first, second] = [deferred(), deferred()];
    const { result } = await start([first, second]);
    await fail(first);
    await act(async () => {
      result.current.retry();
      result.current.retry();
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });

  it("RF-085: a press in the same act in which the retry ends in a failure starts one more attempt, however many presses", async () => {
    const [first, second, third] = [deferred(), deferred(), deferred()];
    const { result } = await start([first, second, third]);
    await fail(first);
    await act(async () => result.current.retry());
    await act(async () => {
      second.reject(new Error("again"));
      await second.promise.catch(() => undefined);
      result.current.retry();
      result.current.retry();
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(3);
  });

  it("RF-085: a press in the same act in which the retry succeeds starts nothing more and the status is «ready»", async () => {
    const [first, second] = [deferred(), deferred()];
    const { result } = await start([first, second]);
    await fail(first);
    await act(async () => result.current.retry());
    await act(async () => {
      second.resolve();
      result.current.retry();
      await second.promise;
    });
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("ready");
  });

  it("RF-085: the whole fail, retry fail, retry succeed sequence writes nothing to the console", async () => {
    const [first, second, third] = [deferred(), deferred(), deferred()];
    const { result } = await start([first, second, third]);
    await fail(first, new Error(LEAKY_MESSAGE));
    await act(async () => result.current.retry());
    await fail(second, LEAKY_MESSAGE);
    await act(async () => result.current.retry());
    await succeed(third);
    expect(result.current.status).toBe("ready");
    expect(output.calls()).toBe(0);
  });
});

describe("useDatabaseStart, unmounted", () => {
  it("RF-085: unmounted while the first attempt runs, it ends later with no error and no console output", async () => {
    const first = deferred();
    const { unmount } = await start([first]);
    await unmount();
    await fail(first, new Error(LEAKY_MESSAGE));
    expect(output.calls()).toBe(0);
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
  });

  it("RF-085: unmounted while a retry runs, it ends later with no error, no console output and no new attempt", async () => {
    const [first, second] = [deferred(), deferred()];
    const { result, unmount } = await start([first, second]);
    await fail(first);
    await act(async () => result.current.retry());
    await unmount();
    await succeed(second);
    expect(output.calls()).toBe(0);
    expect(initializeDatabase).toHaveBeenCalledTimes(2);
  });
});
