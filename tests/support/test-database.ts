import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/data/schema";
import type { AppDatabase } from "@/data/database-types";

const MIGRATIONS_FOLDER = "src/data/migrations";

/** Runs the real SQL migration files on a database; running it again does nothing. */
export function migrateTestDatabase(db: AppDatabase): void {
  migrate(db as ReturnType<typeof drizzle<typeof schema>>, {
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

/** A new in-memory database, migrated, with foreign keys on (as the app opens it). */
export function createTestDatabase(): AppDatabase {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrateTestDatabase(db);
  return db;
}
