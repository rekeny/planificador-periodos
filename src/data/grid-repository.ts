import { and, eq, inArray, sql } from "drizzle-orm";

import type { CellChange } from "@/domain/undo";

import type { AppDatabase } from "./database-types";
import { getMatch } from "./match-repository";
import type { CallUpEntryRecord, MarkRecord, MatchRecord } from "./records";
import { callUpEntries, marks, matches } from "./schema";

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

/** One change per cell: when a list holds the same cell twice, the last one wins. */
function lastChangePerCell(changes: readonly CellChange[]): CellChange[] {
  const byCell = new Map<string, CellChange>();
  for (const change of changes) {
    const { entryId, column } = change.cell;
    byCell.set(`${entryId}|${column.kind}|${column.number}`, change);
  }
  return [...byCell.values()];
}

/**
 * Throws unless the match exists and owns every entry. The foreign key alone would accept an
 * entry of another match, and an "empty" change would then delete that match's mark.
 */
function assertEntriesBelongToMatch(
  db: AppDatabase,
  matchId: number,
  entryIds: readonly number[],
): void {
  if (getMatch(db, matchId) === undefined) {
    throw new Error(`Match ${matchId} does not exist`);
  }
  const owned = new Set(
    entryIds.length === 0
      ? []
      : db
          .select({ id: callUpEntries.id })
          .from(callUpEntries)
          .where(
            and(
              eq(callUpEntries.matchId, matchId),
              inArray(callUpEntries.id, [...entryIds]),
            ),
          )
          .all()
          .map((entry) => entry.id),
  );
  const stranger = entryIds.find((id) => !owned.has(id));
  if (stranger !== undefined) {
    throw new Error(`Call-up entry ${stranger} is not in match ${matchId}`);
  }
}

/**
 * Writes the changed cells in one transaction: a state upserts the mark, "empty" deletes the row.
 * Anything that does not belong to the match is rejected before the first write (RF-056, RF-085).
 */
export function saveCellChanges(
  db: AppDatabase,
  matchId: number,
  changes: readonly CellChange[],
): void {
  const last = lastChangePerCell(changes);
  db.transaction((tx) => {
    assertEntriesBelongToMatch(
      tx,
      matchId,
      last.map((change) => change.cell.entryId),
    );
    for (const { cell, state } of last) {
      const key = {
        callUpEntryId: cell.entryId,
        columnKind: cell.column.kind,
        columnNumber: cell.column.number,
      };
      if (state === "empty") {
        tx.delete(marks)
          .where(
            and(
              eq(marks.callUpEntryId, key.callUpEntryId),
              eq(marks.columnKind, key.columnKind),
              eq(marks.columnNumber, key.columnNumber),
            ),
          )
          .run();
      } else {
        tx.insert(marks)
          .values({ ...key, mark: state })
          .onConflictDoUpdate({
            target: [marks.callUpEntryId, marks.columnKind, marks.columnNumber],
            set: { mark: state },
          })
          .run();
      }
    }
  });
}

/** One more overtime; there is no cap, as many as the match needs (RF-058). */
export function addOvertime(db: AppDatabase, matchId: number): void {
  db.update(matches)
    .set({ overtimeCount: sql`${matches.overtimeCount} + 1` })
    .where(eq(matches.id, matchId))
    .run();
}

/**
 * Removes the last overtime and only its marks, in one transaction. With no overtime it does
 * nothing, so the count never goes below 0 (RF-059).
 */
export function removeLastOvertime(db: AppDatabase, matchId: number): void {
  db.transaction((tx) => {
    const match = getMatch(tx, matchId);
    if (match === undefined || match.overtimeCount <= 0) {
      return;
    }
    const entryIds = tx
      .select({ id: callUpEntries.id })
      .from(callUpEntries)
      .where(eq(callUpEntries.matchId, matchId));
    tx.delete(marks)
      .where(
        and(
          eq(marks.columnKind, "overtime"),
          eq(marks.columnNumber, match.overtimeCount),
          inArray(marks.callUpEntryId, entryIds),
        ),
      )
      .run();
    tx.update(matches)
      .set({ overtimeCount: match.overtimeCount - 1 })
      .where(eq(matches.id, matchId))
      .run();
  });
}
