// T029: opening the app's database and migrating it (RF-011, RF-082). `expo-sqlite` is replaced by
// a double on a real SQLite file (tests/data/expo-sqlite-double.ts), so Drizzle's expo driver and
// the migrator of `drizzle-orm/expo-sqlite` run for real and the native module is never loaded.
// Failures and concurrency are in database.failures.test.ts and src/state/database-ready.test.ts.
import { sql } from "drizzle-orm";
import { teams } from "@/data/schema";
import {
  BUNDLE_WITH_ONE_MORE,
  launchApp,
} from "../../tests/data/database-fixtures";
import { sqliteDouble } from "../../tests/data/expo-sqlite-double";
import {
  FOREIGN_KEY_FAILED,
  addPlayer,
  addTeam,
  counts,
  failureOf,
  userTables,
} from "../../tests/data/schema-fixtures";

jest.mock("expo-sqlite", () =>
  jest.requireActual("../../tests/data/expo-sqlite-double"),
);

const FIVE_TABLES = ["call_up_entries", "marks", "matches", "players", "teams"];

beforeEach(() => sqliteDouble.reset());

describe("database, opening", () => {
  it("RF-011 RF-082: importing the database module opens nothing and loads no native file", () => {
    launchApp();
    expect(sqliteDouble.openCalls()).toHaveLength(0);
  });

  it("RF-011 RF-082: asking for the database before it is opened throws a clear error, never undefined", () => {
    const { data } = launchApp();
    expect(() => data.getDatabase()).toThrow(/database/i);
    expect(sqliteDouble.openCalls()).toHaveLength(0);
  });

  it("RF-011 RF-082: the first launch opens one file and creates the five tables", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    expect(sqliteDouble.openCalls()).toHaveLength(1);
    expect(userTables(data.getDatabase())).toEqual(FIVE_TABLES);
    expect(sqliteDouble.tablesOnDisk()).toEqual(FIVE_TABLES);
    expect(sqliteDouble.appliedMigrations()).toBe(1);
  });

  it("RF-011 RF-082: the database it gives reads and writes", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const db = data.getDatabase();
    addPlayer(db, addTeam(db, { name: "Cadete B" }));
    expect(counts(db)).toMatchObject({ teams: 1, players: 1 });
    expect(db.select().from(teams).all()).toMatchObject([{ name: "Cadete B" }]);
  });

  it("RF-011 RF-082: getDatabase gives the same database every time", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    expect(data.getDatabase()).toBe(data.getDatabase());
  });
});

describe("database, how the file is opened", () => {
  it("RF-011 RF-082: it opens a named file in the default folder, with no directory argument (SEC-T026-3)", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const [call] = sqliteDouble.openCalls();
    const [name, options, directory] = call?.args ?? [];
    expect(typeof name === "string" && name.length > 0).toBe(true);
    expect(name).not.toBe(":memory:");
    expect(directory).toBeUndefined();
    expect(call?.args.length ?? 0).toBeLessThanOrEqual(2);
    expect(
      (options as { enableChangeListener?: boolean } | undefined)
        ?.enableChangeListener,
    ).not.toBe(true);
  });

  it("RF-011 RF-082: foreign keys are on, so a player of a missing team is rejected", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const db = data.getDatabase();
    expect(db.all(sql`pragma foreign_keys`)).toEqual([{ foreign_keys: 1 }]);
    expect(
      failureOf(() =>
        db.run(
          sql`insert into players (team_id, name, number) values (99, 'Ana', '7')`,
        ),
      ),
    ).toMatch(FOREIGN_KEY_FAILED);
  });

  it("RF-011 RF-082: the journal mode is WAL", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    expect(data.getDatabase().all(sql`pragma journal_mode`)).toEqual([
      { journal_mode: "wal" },
    ]);
  });

  it("RF-011 RF-082: both pragmas are set before the migrations run", async () => {
    const { data } = launchApp();
    await data.openAppDatabase();
    const statements = sqliteDouble
      .statements()
      .map((text) => text.toLowerCase());
    const firstCreate = statements.findIndex((text) =>
      text.includes("create table"),
    );
    const foreignKeys = statements.findIndex((text) =>
      /pragma\s+foreign_keys\s*=\s*on/.test(text),
    );
    const wal = statements.findIndex((text) =>
      /pragma\s+journal_mode\s*=\s*wal/.test(text),
    );
    expect(foreignKeys).toBeGreaterThanOrEqual(0);
    expect(wal).toBeGreaterThanOrEqual(0);
    expect(foreignKeys).toBeLessThan(firstCreate);
    expect(wal).toBeLessThan(firstCreate);
  });
});

describe("database, second launch", () => {
  it("RF-011 RF-082: a second launch opens the same file, keeps the rows and does not migrate again", async () => {
    const first = launchApp();
    await first.data.openAppDatabase();
    addTeam(first.data.getDatabase(), { name: "Kept" });
    const before = sqliteDouble.statements().length;

    const second = launchApp();
    await second.data.openAppDatabase();
    const later = sqliteDouble.statements().slice(before).join("\n");
    expect(sqliteDouble.openCalls()).toHaveLength(2);
    expect(sqliteDouble.appliedMigrations()).toBe(1);
    expect(later).not.toMatch(/create table `?teams/i);
    expect(later).not.toMatch(/insert into "__drizzle_migrations"/i);
    expect(counts(second.data.getDatabase()).teams).toBe(1);
  });

  it("RF-011 RF-082: a file with the first migration, opened with a bundle that has one more, applies only the new one and keeps every row", async () => {
    const first = launchApp();
    await first.data.openAppDatabase();
    addPlayer(first.data.getDatabase(), addTeam(first.data.getDatabase()));

    const second = launchApp(BUNDLE_WITH_ONE_MORE);
    await second.data.openAppDatabase();
    expect(sqliteDouble.appliedMigrations()).toBe(2);
    expect(sqliteDouble.tablesOnDisk()).toEqual(
      [...FIVE_TABLES, "extra_notes"].sort(),
    );
    expect(counts(second.data.getDatabase())).toMatchObject({
      teams: 1,
      players: 1,
    });
  });
});
