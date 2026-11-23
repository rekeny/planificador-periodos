import { eq, getTableColumns } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import type { MatchListRecord, MatchRecord } from "./records";
import { matches, teams } from "./schema";

/** Every match with its team's name and category, in database order; the state layer sorts. */
export function listAllMatches(db: AppDatabase): MatchListRecord[] {
  return db
    .select({
      ...getTableColumns(matches),
      teamName: teams.name,
      teamCategory: teams.category,
    })
    .from(matches)
    .innerJoin(teams, eq(matches.teamId, teams.id))
    .all();
}

/** Only the matches of one team, in database order. */
export function listTeamMatches(
  db: AppDatabase,
  teamId: number,
): MatchRecord[] {
  return db.select().from(matches).where(eq(matches.teamId, teamId)).all();
}
