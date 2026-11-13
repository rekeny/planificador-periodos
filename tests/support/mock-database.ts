import type { AppDatabase } from "@/data/database-types";
import { createTestDatabase } from "./test-database";

let current: AppDatabase | undefined;

/** A new migrated in-memory database that `getDatabase()` gives from now on. */
export function resetMockDatabase(): AppDatabase {
  current = createTestDatabase();
  return current;
}

/** The replacement of `@/data/database` for screen tests: `jest.mock("@/data/database", ...)`. */
export function mockDatabaseModule(): {
  getDatabase: () => AppDatabase;
  openAppDatabase: () => Promise<void>;
} {
  return {
    getDatabase: () => (current ??= createTestDatabase()),
    openAppDatabase: () => Promise.resolve(),
  };
}
