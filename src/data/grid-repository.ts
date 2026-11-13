import { eq } from "drizzle-orm";

import type { AppDatabase } from "./database-types";
import { getMatch } from "./match-repository";
import type { CallUpEntryRecord, MarkRecord, MatchRecord } from "./records";
import { callUpEntries, marks } from "./schema";

export interface GridRecords {
  readonly match: MatchRecord;
  readonly entries: CallUpEntryRecord[];
  readonly marks: MarkRecord[];
}

/**
 * Everything the grid needs to open a match, as plain rows in database order. An unknown match
 * gives `undefined`; the state layer decides what to show (review P-01).
 */
export function loadGridRecords(
  db: AppDatabase,
  matchId: number,
): GridRecords | undefined {
  const match = getMatch(db, matchId);
  if (match === undefined) {
    return undefined;
  }
  const entries = db
    .select()
    .from(callUpEntries)
    .where(eq(callUpEntries.matchId, matchId))
    .orderBy(callUpEntries.id)
    .all();
  const rows = db
    .select({
      callUpEntryId: marks.callUpEntryId,
      columnKind: marks.columnKind,
      columnNumber: marks.columnNumber,
      mark: marks.mark,
    })
    .from(marks)
    .innerJoin(callUpEntries, eq(marks.callUpEntryId, callUpEntries.id))
    .where(eq(callUpEntries.matchId, matchId))
    .all();
  return { match, entries, marks: rows };
}
