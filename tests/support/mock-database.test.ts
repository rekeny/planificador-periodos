// T029: the helper that screen tests use to replace `@/data/database` with the in-memory database
// (RF-011, RF-082). Expected API of tests/support/mock-database.ts, which the Implementer writes:
//   mockDatabaseModule(): { getDatabase, openAppDatabase }  the replacement module, for
//                           jest.mock("@/data/database", () => <helper>.mockDatabaseModule())
//   resetMockDatabase(): AppDatabase                        a new migrated in-memory database that
//                           getDatabase() gives from now on (call it in `beforeEach`)
// `expo-sqlite` throws if it is ever loaded, which proves a screen test never reaches it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { teams } from "@/data/schema";
import type { Db } from "../data/schema-fixtures";
import { addTeam, counts, userTables } from "../data/schema-fixtures";

type MockDatabase = {
  mockDatabaseModule: () => DataModule;
  resetMockDatabase: () => Db;
};
type DataModule = {
  getDatabase: () => Db;
  openAppDatabase: () => Promise<void>;
};

const HELPER = "./mock-database";
const DATABASE_MODULE = "../../src/data/database";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock(
  "../../src/data/database",
  () =>
    jest.requireActual<MockDatabase>("./mock-database").mockDatabaseModule(),
  { virtual: true },
);

const helper = (): MockDatabase => jest.requireActual<MockDatabase>(HELPER);
const database = (): DataModule =>
  jest.requireMock<DataModule>(DATABASE_MODULE);

describe("mock database helper", () => {
  it("RF-011 RF-082: @/data/database gives a migrated in-memory database and loads no native module", () => {
    expect(userTables(database().getDatabase())).toEqual([
      "call_up_entries",
      "marks",
      "matches",
      "players",
      "teams",
    ]);
  });

  it("RF-011 RF-082: the replacement opens nothing and resolves at once", async () => {
    await expect(database().openAppDatabase()).resolves.toBeUndefined();
  });

  it("RF-011 RF-082: getDatabase gives the same database until it is reset", () => {
    expect(database().getDatabase()).toBe(database().getDatabase());
  });

  it("RF-011 RF-082: after a reset, getDatabase gives a new empty database and the old rows are gone", () => {
    addTeam(database().getDatabase(), { name: "Old" });
    const fresh = helper().resetMockDatabase();
    expect(database().getDatabase()).toBe(fresh);
    expect(counts(fresh).teams).toBe(0);
    addTeam(fresh, { name: "New" });
    expect(fresh.select().from(teams).all()).toMatchObject([{ name: "New" }]);
  });

  it("RF-011 RF-082: it exports every function that src/data/database.ts exports", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src", "data", "database.ts"),
      "utf8",
    );
    const exported = [
      ...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g),
    ].map((match) => match[1] ?? "");
    expect(exported.length).toBeGreaterThan(0);
    expect(Object.keys(helper().mockDatabaseModule())).toEqual(
      expect.arrayContaining(exported),
    );
  });
});
