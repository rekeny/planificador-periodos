import { playersToAdd } from "@/domain/call-up";
import type { CallUpRangeWarning } from "@/domain/call-up-range";
import type { Format } from "@/domain/format";
import type { CallUpEntryId, MatchGrid } from "@/domain/grid";
import type { MatchId, Player } from "@/domain/squad";
import type { UndoEntry } from "@/domain/undo";
import type { Warnings } from "@/domain/warnings";

export interface MatchViewSource {
  readonly matchId: MatchId;
  readonly grid: MatchGrid;
  readonly warnings: Warnings;
  readonly history: readonly UndoEntry[];
  readonly teamPlayers: readonly Player[]; // for playersToAdd (T042)
}

export interface RowView {
  readonly entryId: CallUpEntryId;
  readonly number: string;
  readonly name: string;
  readonly hasMarks: boolean; // decides the removal confirmation (RF-033, RF-034)
}

export interface MatchView {
  readonly matchId: MatchId;
  readonly format: Format;
  readonly rows: readonly RowView[];
  readonly callUpRange: CallUpRangeWarning | null; // RF-068
  readonly playersToAdd: readonly Player[]; // active, not in the call-up, sorted (RF-032)
}

/**
 * Puts the domain results together for the screen. The rows keep the order of the grid, which
 * the session already sorted, and show the call-up snapshot, never the player's current data.
 */
export function buildMatchView({
  matchId,
  grid,
  warnings,
  teamPlayers,
}: MatchViewSource): MatchView {
  // Keys look like "12:P3" or "12:OT1": the entry id is what comes before the colon.
  const withMarks = new Set(
    Object.keys(grid.marks).map((key) => Number(key.split(":")[0])),
  );
  return {
    matchId,
    format: grid.format,
    rows: grid.callUp.map((entry) => ({
      entryId: entry.id,
      number: entry.number,
      name: entry.name,
      hasMarks: withMarks.has(entry.id),
    })),
    callUpRange: warnings.callUpRange,
    playersToAdd: playersToAdd(teamPlayers, grid.callUp),
  };
}
