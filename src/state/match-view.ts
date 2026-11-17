import { playersToAdd } from "@/domain/call-up";
import type { CallUpRangeWarning } from "@/domain/call-up-range";
import { playerCounter, type PlayerCounter } from "@/domain/counter";
import type { Format } from "@/domain/format";
import type { CallUpEntryId, MatchGrid } from "@/domain/grid";
import { lastOvertimeHasMarks } from "@/domain/overtime";
import type { MatchId, Player } from "@/domain/squad";
import type { LegendItem } from "@/domain/legend";
import type { UndoEntry } from "@/domain/undo";
import type { Warnings } from "@/domain/warnings";
import {
  cellViews,
  columnViews,
  type CellView,
  type ColumnView,
} from "@/state/match-view-grid";
import { isInRed, warningView } from "@/state/match-view-warnings";

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
  readonly counter: PlayerCounter; // RF-070, RF-071
  readonly cells: readonly CellView[]; // in column order (RF-042)
  readonly isInRed: boolean; // RF-062, RF-063
}

export interface MatchView {
  readonly matchId: MatchId;
  readonly format: Format;
  readonly columns: readonly ColumnView[]; // periods, then overtimes (RF-042)
  readonly rows: readonly RowView[];
  readonly canUndo: boolean; // RF-055
  readonly canRemoveOvertime: boolean; // only with an overtime (RF-059)
  readonly lastOvertimeHasMarks: boolean; // decides the removal confirmation (RF-059)
  readonly ruleImpossible: boolean; // the general warning (RF-067)
  readonly legend: readonly LegendItem[]; // RF-087
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
  history,
  teamPlayers,
}: MatchViewSource): MatchView {
  const columns = columnViews(grid, warnings);
  // Keys look like "12:P3" or "12:OT1": the entry id is what comes before the colon.
  const withMarks = new Set(
    Object.keys(grid.marks).map((key) => Number(key.split(":")[0])),
  );
  return {
    matchId,
    format: grid.format,
    columns,
    canUndo: history.length > 0,
    canRemoveOvertime: grid.overtimeCount > 0,
    lastOvertimeHasMarks: lastOvertimeHasMarks(grid),
    rows: grid.callUp.map((entry) => ({
      entryId: entry.id,
      number: entry.number,
      name: entry.name,
      hasMarks: withMarks.has(entry.id),
      counter: playerCounter(grid, entry.id),
      cells: cellViews(grid, entry.id, columns, warnings),
      isInRed: isInRed(warnings, entry.id),
    })),
    ...warningView(warnings),
    callUpRange: warnings.callUpRange,
    playersToAdd: playersToAdd(teamPlayers, grid.callUp),
  };
}
