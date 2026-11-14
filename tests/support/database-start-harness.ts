// Helpers of the T087 tests (RF-085: the data cannot be opened at start-up). This file holds no
// test calls. `initializeDatabase` is a Jest mock in every test that uses these helpers; `plan`
// gives it one controllable attempt per call, and a call beyond the plan rejects at once, so an
// attempt nobody expected (an automatic retry) shows up as an extra call and as a failure.
import { act } from "@testing-library/react-native";

/** The two approved texts (spec «Spanish texts», keys `db.openFailed` and `db.retry`). */
export const OPEN_FAILED =
  "No se han podido abrir tus datos. No se ha borrado nada.";
export const RETRY = "Reintentar";

/** What a failed open could carry that must never reach the screen or a log. */
export const LEAKY_MESSAGE = "Ana /data/planificador.db";

export type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

export function deferred(): Deferred {
  let resolve = (): void => {};
  let reject = (_reason?: unknown): void => {};
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

type InitializeMock = jest.Mock<Promise<void>, []>;

/** The next calls of `initializeDatabase` return these attempts, in order. */
export function plan(
  initializeDatabase: InitializeMock,
  attempts: readonly Deferred[],
): void {
  const queue = [...attempts];
  initializeDatabase.mockReset();
  initializeDatabase.mockImplementation(
    () =>
      queue.shift()?.promise ??
      Promise.reject(new Error("an attempt that the test did not plan")),
  );
}

/** Ends an attempt well and lets React apply what follows. */
export async function succeed(attempt: Deferred): Promise<void> {
  await act(async () => {
    attempt.resolve();
    await attempt.promise;
  });
}

/** Ends an attempt with this rejection (any value) and lets React apply what follows. */
export async function fail(
  attempt: Deferred,
  reason: unknown = new Error("open failed"),
): Promise<void> {
  await act(async () => {
    attempt.reject(reason);
    await attempt.promise.catch(() => undefined);
  });
}

const CHANNELS = ["error", "warn", "log", "info", "debug"] as const;

/** Spies on every console channel; `calls()` is how many times anything was written. */
export function watchConsole(): { calls: () => number; restore: () => void } {
  const spies = CHANNELS.map((channel) =>
    jest.spyOn(console, channel).mockImplementation(() => undefined),
  );
  return {
    calls: () => spies.reduce((total, spy) => total + spy.mock.calls.length, 0),
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}
