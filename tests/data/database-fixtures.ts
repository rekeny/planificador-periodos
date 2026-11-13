// Helpers of the start-up tests (T029). This file holds no test calls. The modules under test do
// not exist until the Implementer writes them, so they are loaded at run time with
// `jest.requireActual` (a missing file then fails the test with "Cannot find module" instead of
// breaking `tsc`). Expected API:
//   "@/data/database"        openAppDatabase(): Promise<void>   opens the file and migrates, once
//                            getDatabase(): AppDatabase          throws a clear error until opened
//   "@/state/database-ready" initializeDatabase(): Promise<void> what the root layout calls
// A test that uses them registers the `expo-sqlite` double first:
//   jest.mock("expo-sqlite", () => jest.requireActual("<path>/tests/data/expo-sqlite-double"));
import bundle from "@/data/migrations/bundle";
import type { Db } from "./schema-fixtures";

export const DATABASE_MODULE = "@/data/database";
export const READY_MODULE = "@/state/database-ready";
export const BUNDLE_MODULE = "@/data/migrations/bundle";

export type DataModule = {
  openAppDatabase: () => Promise<void>;
  getDatabase: () => Db;
};
export type ReadyModule = { initializeDatabase: () => Promise<void> };
export type Bundle = {
  journal: typeof bundle.journal;
  migrations: Record<string, string>;
};

/** The bundle that ships with the app: the first migration only. */
export const REAL_BUNDLE: Bundle = bundle;

const LAST_MIGRATION_TIME = Math.max(
  ...bundle.journal.entries.map((entry) => entry.when),
);

/** The real bundle plus one more migration: an `extra_notes` table. */
export const BUNDLE_WITH_ONE_MORE: Bundle = {
  journal: {
    ...bundle.journal,
    entries: [
      ...bundle.journal.entries,
      {
        idx: bundle.journal.entries.length,
        version: "6",
        when: LAST_MIGRATION_TIME + 1000,
        tag: "0001_extra_notes",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    ...bundle.migrations,
    m0001: "CREATE TABLE `extra_notes` (`id` integer PRIMARY KEY NOT NULL);",
  },
};

/** A migration that writes a table and then fails: nothing of it may stay. */
export const BUNDLE_THAT_FAILS: Bundle = {
  journal: {
    ...bundle.journal,
    entries: [
      ...bundle.journal.entries,
      {
        idx: bundle.journal.entries.length,
        version: "6",
        when: LAST_MIGRATION_TIME + 1000,
        tag: "0001_broken",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    ...bundle.migrations,
    m0001:
      "CREATE TABLE `half_made` (`id` integer PRIMARY KEY NOT NULL);\n--> statement-breakpoint\nTHIS IS NOT SQL;",
  },
};

export type Launch = { data: DataModule; ready: ReadyModule };

/**
 * One launch of the app: fresh copies of `database.ts` and `database-ready.ts` (nothing opened
 * yet), as after killing the app. The files the `expo-sqlite` double wrote stay, like the file
 * on the device. `withBundle` replaces the migration bundle for this launch only.
 */
export function launchApp(withBundle: Bundle = REAL_BUNDLE): Launch {
  jest.dontMock(BUNDLE_MODULE);
  if (withBundle !== REAL_BUNDLE) {
    jest.doMock(BUNDLE_MODULE, () => ({
      __esModule: true,
      default: withBundle,
    }));
  }
  let launch: Launch | undefined;
  jest.isolateModules(() => {
    launch = {
      data: jest.requireActual<DataModule>(DATABASE_MODULE),
      ready: jest.requireActual<ReadyModule>(READY_MODULE),
    };
  });
  jest.dontMock(BUNDLE_MODULE);
  if (!launch) throw new Error("the launch did not load");
  return launch;
}
