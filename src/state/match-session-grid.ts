import type { GridRecords } from "@/data/grid-repository";
import type { MarkRecord } from "@/data/records";
import {
  cellKey,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { isFormat } from "@/domain/format";
import { comparePlayers } from "@/domain/player-order";

function toMark(value: string): Mark {
  if (value !== "starter" && value !== "sub") {
    throw new Error("Unknown mark in the database");
  }
  return value;
}

function toCell(record: MarkRecord): { key: CellKey; mark: Mark } {
  if (record.columnKind !== "period" && record.columnKind !== "overtime") {
    throw new Error("Unknown column kind in the database");
  }
  const key = cellKey({
    entryId: record.callUpEntryId,
    column: { kind: record.columnKind, number: record.columnNumber },
  });
  return { key, mark: toMark(record.mark) };
}

/**
 * The grid exactly as the database holds it. Anything the domain would not accept throws, and
 * the session turns that into "not found" instead of a half-filled view.
 */
export function gridFromRecords({
  match,
  entries,
  marks,
}: GridRecords): MatchGrid {
  if (!isFormat(match.format)) {
    throw new Error("Unknown format in the database");
  }
  const marked: Partial<Record<CellKey, Mark>> = {};
  for (const record of marks) {
    const { key, mark } = toCell(record);
    marked[key] = mark;
  }
  const callUp = entries
    .map((entry) => ({
      id: entry.id,
      playerId: entry.playerId,
      name: entry.playerName,
      number: entry.playerNumber,
    }))
    .sort(comparePlayers);
  return {
    format: match.format,
    overtimeCount: match.overtimeCount,
    callUp,
    marks: marked,
  };
}
