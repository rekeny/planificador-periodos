import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "./schema";

/** The one database type that repositories, store factories and test helpers share. */
export type AppDatabase = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
