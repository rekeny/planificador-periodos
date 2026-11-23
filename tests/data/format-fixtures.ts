// Helpers of the format change tests (T068). This file holds no test calls.
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import {
  openWithMatch,
  row,
  seedMarks,
  sortedMarks,
} from "./grid-write-fixtures";

export type Key = Parameters<typeof row>[1];

export const periods = (
  entryId: number,
  count: number,
): ReturnType<typeof row>[] =>
  Array.from({ length: count }, (_, index) =>
    row(entryId, `P${index + 1}`, index % 2 === 0 ? "starter" : "sub"),
  );

export const marksOf = (db: AppDatabase, matchId: number) =>
  sortedMarks(loadGridRecords(db, matchId));

/** A match of `format` with one player marked in every period and in OT1 and OT2. */
export function openMarked(format: number) {
  const opened = openWithMatch(1, { format, overtimeCount: 2 });
  const [ana] = opened.entryIds as [number];
  const all = [
    ...periods(ana, format),
    row(ana, "OT1", "sub"),
    row(ana, "OT2", "starter"),
  ];
  seedMarks(opened.db, all);
  return { ...opened, ana, all };
}
