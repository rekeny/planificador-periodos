import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";

import type { AppDatabase } from "./database-types";
import bundle from "./migrations/bundle";
import * as schema from "./schema";

const DATABASE_NAME = "planificador.db";

let opened: AppDatabase | undefined;

/**
 * Opens the app's database and brings it to the latest schema (RF-011, RF-082). It is the only
 * place that touches the native module, and only when it runs: importing this file opens nothing.
 * No directory is passed, so the file lives in the default folder that is kept out of backups.
 */
export async function openAppDatabase(): Promise<void> {
  const client = openDatabaseSync(DATABASE_NAME);
  try {
    client.execSync("PRAGMA foreign_keys = ON");
    client.execSync("PRAGMA journal_mode = WAL");
    const db = drizzle(client, { schema });
    await migrate(db, bundle);
    opened = db;
  } catch (error) {
    client.closeSync();
    throw error;
  }
}

/** The open database; it throws, and never returns `undefined`, before `openAppDatabase` ends. */
export function getDatabase(): AppDatabase {
  if (!opened) {
    throw new Error(
      "The database is not open yet: wait for initializeDatabase()",
    );
  }
  return opened;
}
