// T029: initializeDatabase(), what the root layout waits for before it shows a screen (RF-011,
// RF-082). It runs against the real database.ts, Drizzle's expo driver and its migrator, with
// `expo-sqlite` replaced by the double of tests/data/expo-sqlite-double.ts.
import {
  BUNDLE_THAT_FAILS,
  launchApp,
} from "../../tests/data/database-fixtures";
import { sqliteDouble } from "../../tests/data/expo-sqlite-double";
import { addTeam, counts, userTables } from "../../tests/data/schema-fixtures";

jest.mock("expo-sqlite", () =>
  jest.requireActual("../../tests/data/expo-sqlite-double"),
);

const FIVE_TABLES = ["call_up_entries", "marks", "matches", "players", "teams"];

beforeEach(() => sqliteDouble.reset());

describe("initializeDatabase, success", () => {
  it("RF-011 RF-082: it resolves with nothing and the database is ready afterwards", async () => {
    const { data, ready } = launchApp();
    await expect(ready.initializeDatabase()).resolves.toBeUndefined();
    expect(userTables(data.getDatabase())).toEqual(FIVE_TABLES);
    expect(counts(data.getDatabase()).teams).toBe(0);
  });

  it("RF-011 RF-082: nothing is opened until it is called", () => {
    launchApp();
    expect(sqliteDouble.openCalls()).toHaveLength(0);
  });

  it("RF-011 RF-082: two calls at the same time open and migrate once, and each ends only when the database is ready", async () => {
    const { data, ready } = launchApp();
    const isReady = (): boolean => {
      try {
        return data.getDatabase() !== undefined;
      } catch {
        return false;
      }
    };
    const first = ready.initializeDatabase().then(isReady);
    const second = ready.initializeDatabase().then(isReady);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(sqliteDouble.openCalls()).toHaveLength(1);
    expect(sqliteDouble.appliedMigrations()).toBe(1);
  });

  it("RF-011 RF-082: a call after the database is ready opens and migrates nothing more", async () => {
    const { ready } = launchApp();
    await ready.initializeDatabase();
    const statements = sqliteDouble.statements().length;
    await ready.initializeDatabase();
    expect(sqliteDouble.openCalls()).toHaveLength(1);
    expect(sqliteDouble.statements()).toHaveLength(statements);
  });
});

describe("initializeDatabase, failures", () => {
  it("RF-011 RF-082: a file that cannot be opened rejects with that error, and no database is given", async () => {
    sqliteDouble.failNextOpen(new Error("disk full"));
    const { data, ready } = launchApp();
    await expect(ready.initializeDatabase()).rejects.toThrow("disk full");
    expect(() => data.getDatabase()).toThrow(/database/i);
    expect(sqliteDouble.statements()).toHaveLength(0);
  });

  it("RF-011 RF-082: a failing migration rejects, no database is given and nothing half-made stays on disk", async () => {
    const { data, ready } = launchApp(BUNDLE_THAT_FAILS);
    await expect(ready.initializeDatabase()).rejects.toThrow();
    expect(() => data.getDatabase()).toThrow(/database/i);
    expect(sqliteDouble.tablesOnDisk()).toEqual([]);
  });

  it("RF-011 RF-082: two calls at the same time during a failure both reject and the file is opened once", async () => {
    const { ready } = launchApp(BUNDLE_THAT_FAILS);
    const results = await Promise.allSettled([
      ready.initializeDatabase(),
      ready.initializeDatabase(),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(sqliteDouble.openCalls()).toHaveLength(1);
  });

  it("RF-011 RF-082: after a launch that failed, the next launch still opens and migrates", async () => {
    const failed = launchApp(BUNDLE_THAT_FAILS);
    await expect(failed.ready.initializeDatabase()).rejects.toThrow();

    const next = launchApp();
    await next.ready.initializeDatabase();
    expect(userTables(next.data.getDatabase())).toEqual(FIVE_TABLES);
    expect(sqliteDouble.appliedMigrations()).toBe(1);
  });

  it("RF-011 RF-082: after a failed open, the next launch still opens", async () => {
    sqliteDouble.failNextOpen(new Error("locked"));
    const failed = launchApp();
    await expect(failed.ready.initializeDatabase()).rejects.toThrow("locked");

    const next = launchApp();
    await next.ready.initializeDatabase();
    expect(userTables(next.data.getDatabase())).toEqual(FIVE_TABLES);
  });
});

describe("initializeDatabase, retrying in the same launch (T087, RF-085)", () => {
  it("RF-085: after a failed open in the same launch a new call opens again, migrates nothing more and keeps the saved team and the file", async () => {
    const first = launchApp();
    await first.ready.initializeDatabase();
    addTeam(first.data.getDatabase(), { name: "Alevín A" });

    sqliteDouble.failNextOpen(new Error("disk full"));
    const second = launchApp();
    await expect(second.ready.initializeDatabase()).rejects.toThrow(
      "disk full",
    );
    await expect(second.ready.initializeDatabase()).resolves.toBeUndefined();

    expect(sqliteDouble.openCalls()).toHaveLength(3);
    expect(sqliteDouble.appliedMigrations()).toBe(1);
    expect(sqliteDouble.tablesOnDisk()).toEqual(FIVE_TABLES);
    expect(counts(second.data.getDatabase()).teams).toBe(1);
  });

  it("RF-085: fail, fail again, then succeed in the same launch: one open per call and a database at the end", async () => {
    const { data, ready } = launchApp();
    sqliteDouble.failNextOpen(new Error("locked"));
    await expect(ready.initializeDatabase()).rejects.toThrow("locked");
    sqliteDouble.failNextOpen(new Error("still locked"));
    await expect(ready.initializeDatabase()).rejects.toThrow("still locked");
    await expect(ready.initializeDatabase()).resolves.toBeUndefined();
    expect(sqliteDouble.openCalls()).toHaveLength(3);
    expect(userTables(data.getDatabase())).toEqual(FIVE_TABLES);
  });
});
