// Helpers for the "read fails after a committed write" tests (Codex F3, RF-085). This file holds no
// test calls. The failure is real: a SQLite trigger on the written table calls a function that arms
// a guard, and from then on every `select` made through the guarded database throws, as a read that
// breaks right after the write would. The database itself is untouched, so nothing is mocked and the
// test reads the truth through the raw database. A store built on `guard.db` sees the failure.
import { isDeepStrictEqual } from "node:util";
import type { AppDatabase } from "@/data/database-types";
import type { SaveResult } from "@/state/save-result";

export type Operation = "INSERT" | "UPDATE" | "DELETE";
export type Write = readonly [table: string, operation: Operation];

export interface ReadGuard {
  /** Give this to the store: its reads throw once one of the watched writes has happened. */
  readonly db: AppDatabase;
  /** Reads work again until the next watched write (use it after the test's own set-up writes). */
  readonly reset: () => void;
  /** While not watching, the watched writes do not break the reads (the test's own set-up). */
  readonly watch: (on: boolean) => void;
  /** The reads are healthy for good: the triggers are dropped (the device recovered). */
  readonly heal: () => void;
}

const FUNCTION = "read_guard_arm";

// Only the two methods used, so that test-database.ts stays the one file importing better-sqlite3.
interface RawClient {
  function(name: string, implementation: () => number): unknown;
  exec(sql: string): unknown;
}

function clientOf(db: AppDatabase): RawClient {
  return (db as unknown as { $client: RawClient }).$client;
}

export function guardReadsAfterWrites(
  raw: AppDatabase,
  writes: readonly Write[],
): ReadGuard {
  const client = clientOf(raw);
  let armed = false;
  let watching = true;
  client.function(FUNCTION, () => {
    armed = watching;
    return 1;
  });
  const names = writes.map(([table, operation], i) => {
    const name = `read_guard_${i}_${operation}_${table}`;
    client.exec(
      `CREATE TRIGGER ${name} AFTER ${operation} ON ${table} BEGIN SELECT ${FUNCTION}(); END`,
    );
    return name;
  });
  const db = new Proxy(raw, {
    get(target, property) {
      if (property === "select" && armed) {
        return () => {
          throw new Error("disk read failed after the write");
        };
      }
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return {
    db,
    reset: () => {
      armed = false;
    },
    watch: (on) => {
      watching = on;
      armed = false;
    },
    heal: () => {
      armed = false;
      names.forEach((name) => client.exec(`DROP TRIGGER ${name}`));
    },
  };
}

/** An action's answer; "threw" is an exception that escaped the action (it should answer instead). */
export type Answer = SaveResult | { readonly kind: "threw" };

/** Runs the action and turns an escaped exception into an answer, so a test fails on its assertion. */
export function answerOf(action: () => SaveResult): Answer {
  try {
    return action();
  } catch {
    return { kind: "threw" };
  }
}

/** What a store and its database hold at one moment: the published state apart from the flag. */
export interface Picture {
  readonly state: Readonly<Record<string, unknown>>;
  readonly saveFailed: boolean;
}

function differing(a: Picture["state"], b: Picture["state"]): string {
  return Object.keys(a)
    .filter((key) => !isDeepStrictEqual(a[key], b[key]))
    .join(", ");
}

/**
 * RF-085, in one word. "rolledBack": saveFailed, the flag set and nothing changed in the database,
 * the published state or the history. "published": saved, with the database and the state exactly
 * as a healthy device gives (`healthy`, taken from a twin run). Anything else is "inconsistent: ..."
 * with the parts that differ, which is the bug: saved data and published state disagree.
 */
export function outcomeOf(
  result: Answer,
  before: Picture,
  after: Picture,
  healthy: Picture,
): string {
  if (result.kind === "saveFailed") {
    const moved = differing(before.state, after.state);
    return moved === "" && after.saveFailed
      ? "rolledBack"
      : `inconsistent: saveFailed (flag ${String(after.saveFailed)}) but changed: ${moved}`;
  }
  const off = differing(healthy.state, after.state);
  return result.kind === "saved" && off === "" && !after.saveFailed
    ? "published"
    : `inconsistent: ${result.kind} (flag ${String(after.saveFailed)}) differs from a healthy save in: ${off}`;
}

/** The two outcomes RF-085 allows; `outcomeOf` says which, so a failure shows what disagreed. */
export const CONSISTENT = ["rolledBack", "published"];

/**
 * Runs an action; if it answered saveFailed (or threw), heals the reads and runs it once more (the coach
 * taps again). Returns both answers, so a test can say "exactly one record in the end".
 */
export function withRetry(
  guard: ReadGuard,
  action: () => SaveResult,
): { first: Answer; last: Answer } {
  const first = answerOf(action);
  if (first.kind !== "saveFailed" && first.kind !== "threw") {
    return { first, last: first };
  }
  guard.heal();
  return { first, last: answerOf(action) };
}
