import { eq } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { TeamRecord } from "./records";
import { teams } from "./schema";

/** What a team stores; the state layer passes it already validated and normalised (T030). */
export interface TeamValues {
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: number;
}

/** Saves a team as given (duplicates are allowed, RF-014) and returns the stored row. */
export function createTeam(db: AppDatabase, values: TeamValues): TeamRecord {
  return db.insert(teams).values(values).returning().get();
}

/**
 * Replaces a team's name, category and default format. An unknown ID changes nothing and returns
 * `undefined`; a default format outside 4, 6 and 8 throws from the check constraint (RF-085).
 */
export function updateTeam(
  db: AppDatabase,
  id: number,
  values: TeamValues,
): TeamRecord | undefined {
  return db.update(teams).set(values).where(eq(teams.id, id)).returning().get();
}

/** Every team in database order; sorting is the state layer's (review P-01). */
export function listTeams(db: AppDatabase): TeamRecord[] {
  return db.select().from(teams).orderBy(teams.id).all();
}

export function getTeam(db: AppDatabase, id: number): TeamRecord | undefined {
  return db.select().from(teams).where(eq(teams.id, id)).get();
}
