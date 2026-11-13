import {
  addOvertime as saveOvertime,
  removeLastOvertime as deleteLastOvertime,
  saveCellChanges,
} from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import { cellExists, type Cell, type MatchGrid } from "@/domain/grid";
import { tapCell } from "@/domain/marking";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import {
  cellChanges,
  pruneHistory,
  undoEntryFor,
  type UndoEntry,
} from "@/domain/undo";
import { evaluateWarnings } from "@/domain/warnings";
import {
  failed,
  openMatchOf,
  type CallUpHost,
  type OpenMatch,
} from "@/state/match-session-call-up";
import type { MatchSessionState } from "@/state/match-session-store";
import { buildMatchView } from "@/state/match-view";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "tapCell" | "addOvertime" | "removeLastOvertime"
>;

/** Warnings and view are recomputed from the saved grid (RF-060); the caller decides the history. */
export function publish(
  host: CallUpHost,
  current: OpenMatch,
  grid: MatchGrid,
  history: readonly UndoEntry[],
): SaveResult {
  const warnings = evaluateWarnings(grid);
  const teamPlayers = listPlayers(host.db, current.teamId);
  const view = buildMatchView({
    matchId: current.matchId,
    grid,
    warnings,
    history,
    teamPlayers,
  });
  host.set({ grid, warnings, view, history, saveFailed: false });
  return { kind: "saved" };
}

// In D2 the questions and "unchanged" change nothing (the questions arrive in D3).
function tap(host: CallUpHost, cell: Cell): SaveResult {
  const current = openMatchOf(host);
  if (current === null || !cellExists(current.grid, cell)) {
    return { kind: "unchanged" };
  }
  const result = tapCell(current.grid, cell);
  if (result.kind !== "changed") {
    return { kind: "unchanged" };
  }
  try {
    saveCellChanges(
      host.db,
      current.matchId,
      cellChanges(current.grid, result.grid),
    );
  } catch {
    return failed(host);
  }
  const entry = undoEntryFor(current.grid, result.grid);
  return publish(host, current, result.grid, [...host.get().history, entry]);
}

function add(host: CallUpHost): SaveResult {
  const current = openMatchOf(host);
  if (current === null) {
    return { kind: "unchanged" };
  }
  try {
    saveOvertime(host.db, current.matchId);
  } catch {
    return failed(host);
  }
  return publish(host, current, addOvertime(current.grid), host.get().history);
}

function removeLast(host: CallUpHost): SaveResult {
  const current = openMatchOf(host);
  if (current === null || current.grid.overtimeCount === 0) {
    return { kind: "unchanged" };
  }
  try {
    deleteLastOvertime(host.db, current.matchId);
  } catch {
    return failed(host);
  }
  const grid = removeLastOvertime(current.grid);
  // RF-086: entries that refer to the removed overtime are discarded.
  return publish(host, current, grid, pruneHistory(host.get().history, grid));
}

export function createMarksActions(host: CallUpHost): Actions {
  return {
    tapCell: (cell) => tap(host, cell),
    addOvertime: () => add(host),
    removeLastOvertime: () => removeLast(host),
  };
}
