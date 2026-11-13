import { openAppDatabase } from "@/data/database";

let starting: Promise<void> | undefined;

/**
 * Opens and migrates the database once for the whole app. Calls that overlap share the same
 * work and end together; if it fails, every caller gets the error and a later call tries again.
 */
export function initializeDatabase(): Promise<void> {
  starting ??= openAppDatabase().catch((error: unknown) => {
    starting = undefined;
    throw error;
  });
  return starting;
}
