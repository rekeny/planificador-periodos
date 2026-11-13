// Helpers of the grid part of the match view tests (T050). This file holds no test calls. It
// builds a MatchGrid by hand and the view through the real buildMatchView (src/state/match-view.ts),
// whose MatchView the Implementer extends with: `columns: readonly ColumnView[]` ({ key, column }),
// `RowView.counter: PlayerCounter` and `RowView.cells: readonly CellView[]` ({ key, cell, state }),
// and `canUndo`, `canRemoveOvertime`, `lastOvertimeHasMarks` (booleans), as plan.md defines them.
import type { Format } from "@/domain/format";
import type { MatchGrid } from "@/domain/grid";
import type { UndoEntry } from "@/domain/undo";
import { evaluateWarnings } from "@/domain/warnings";
import { buildMatchView } from "@/state/match-view";

/** `count` call-up entries with ids 100.. (not 1..n, so nothing mistakes an id for a position). */
export function entriesOf(count: number): MatchGrid["callUp"] {
  return Array.from({ length: count }, (_, row) => ({
    id: 100 + row,
    playerId: row + 1,
    name: `Jugador ${row + 1}`,
    number: String(row + 1),
  }));
}

export interface GridOptions {
  readonly players?: number;
  readonly format?: Format;
  readonly overtimeCount?: number;
  readonly marks?: MatchGrid["marks"];
  readonly callUp?: MatchGrid["callUp"];
}

export function gridWith({
  players = 10,
  format = 6,
  overtimeCount = 0,
  marks = {},
  callUp = entriesOf(players),
}: GridOptions = {}): MatchGrid {
  return { format, overtimeCount, callUp, marks };
}

export function viewOf(grid: MatchGrid, history: readonly UndoEntry[] = []) {
  return buildMatchView({
    matchId: 50,
    grid,
    warnings: evaluateWarnings(grid),
    history,
    teamPlayers: [],
  });
}
