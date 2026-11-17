/// <reference types="node" />
// A test double of the `expo-sqlite` module (T029). Jest has no native module, so a test that
// opens the app's database registers this file with `jest.mock("expo-sqlite", () =>
// jest.requireActual(<this file>))`. It keeps the part of the `expo-sqlite` API that Drizzle's
// expo driver and `src/data/database.ts` use, on top of a real SQLite file (so WAL and
// foreign keys behave as on the device), and records what the code under test did. Its state
// lives on `globalThis`, so a "second launch" (a new module registry) sees the same files.
// This file holds no test calls.
import BetterSqlite3 from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Row = Record<string, unknown>;
type Params = readonly unknown[];

export type OpenCall = {
  /** Every argument the code passed, so a stray `directory` argument is visible. */
  readonly args: readonly unknown[];
};

type DoubleState = {
  directory: string;
  opened: BetterSqlite3.Database[];
  openCalls: OpenCall[];
  statements: string[];
  nextOpenError: Error | null;
};

const KEY = "__expoSqliteDouble";
type Holder = { [KEY]?: DoubleState };

function freshState(): DoubleState {
  return {
    directory: mkdtempSync(join(tmpdir(), "expo-sqlite-double-")),
    opened: [],
    openCalls: [],
    statements: [],
    nextOpenError: null,
  };
}

function state(): DoubleState {
  const holder = globalThis as unknown as Holder;
  return (holder[KEY] ??= freshState());
}

function result(rows: Row[], changes: number, lastInsertRowId: number) {
  return {
    changes,
    lastInsertRowId,
    getAllSync: () => rows,
    getFirstSync: () => rows[0] ?? null,
  };
}

function statementOf(db: BetterSqlite3.Database, source: string) {
  state().statements.push(source);
  const statement = db.prepare(source);
  return {
    executeSync(params: Params = []) {
      if (statement.reader) {
        return result(statement.all(...params) as Row[], 0, 0);
      }
      const info = statement.run(...params);
      return result([], info.changes, Number(info.lastInsertRowid));
    },
    executeForRawResultSync(params: Params = []) {
      const rows = statement.reader
        ? db
            .prepare(source)
            .raw()
            .all(...params)
        : [];
      return { getAllSync: () => rows };
    },
    finalizeSync() {},
  };
}

function clientOf(db: BetterSqlite3.Database) {
  return {
    prepareSync: (source: string) => statementOf(db, source),
    execSync(source: string) {
      state().statements.push(source);
      db.exec(source);
    },
    runSync(source: string, ...params: unknown[]) {
      return statementOf(db, source).executeSync(params.flat());
    },
    getAllSync: (source: string, ...params: unknown[]) =>
      statementOf(db, source).executeSync(params.flat()).getAllSync(),
    getFirstSync: (source: string, ...params: unknown[]) =>
      statementOf(db, source).executeSync(params.flat()).getFirstSync(),
    closeSync: () => db.close(),
  };
}

/** The folder `expo-sqlite` uses when no directory is given (a label: the double ignores it). */
export const defaultDatabaseDirectory = "/expo-sqlite-double/default-directory";

/** `openDatabaseSync(databaseName, options?, directory?)` of `expo-sqlite`, recorded. */
export function openDatabaseSync(...args: unknown[]) {
  const current = state();
  current.openCalls.push({ args });
  const error = current.nextOpenError;
  if (error) {
    current.nextOpenError = null;
    throw error;
  }
  const db = new BetterSqlite3(join(current.directory, String(args[0])));
  current.opened.push(db);
  return clientOf(db);
}

function openFileOfFirstCall(): BetterSqlite3.Database {
  const first = state().openCalls[0];
  if (!first) throw new Error("the code under test never opened a database");
  return new BetterSqlite3(join(state().directory, String(first.args[0])), {
    fileMustExist: true,
  });
}

/** What a test can do with the double and read from it. */
export const sqliteDouble = {
  /** Start a test with an empty folder, no calls, no statements and no planned failure. */
  reset(): void {
    const old = state();
    old.opened.forEach((db) => db.open && db.close());
    rmSync(old.directory, { recursive: true, force: true });
    (globalThis as unknown as Holder)[KEY] = freshState();
  },
  /** The next `openDatabaseSync` throws this error (a file that cannot be opened). */
  failNextOpen(error: Error): void {
    state().nextOpenError = error;
  },
  openCalls: (): readonly OpenCall[] => state().openCalls,
  /** Every SQL text prepared or executed, in order. */
  statements: (): readonly string[] => state().statements,
  /** The user tables in the file the code opened, read by a separate connection. */
  tablesOnDisk(): string[] {
    const db = openFileOfFirstCall();
    try {
      return (
        db
          .prepare(
            "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '%drizzle%' order by name",
          )
          .all() as { name: string }[]
      ).map((row) => row.name);
    } finally {
      db.close();
    }
  },
  /** The number of rows in Drizzle's migration table of the file the code opened. */
  appliedMigrations(): number {
    const db = openFileOfFirstCall();
    try {
      const row = db
        .prepare("select count(*) as total from __drizzle_migrations")
        .get() as { total: number };
      return row.total;
    } finally {
      db.close();
    }
  },
};
