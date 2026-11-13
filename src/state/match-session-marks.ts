import {
  addOvertime as saveOvertime,
  removeLastOvertime as deleteLastOvertime,
  saveCellChanges,
} from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import { cellExists, type Cell } from "@/domain/grid";
import { tapCell } from "@/domain/marking";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import { cellChanges, pruneHistory, undoEntryFor } from "@/domain/undo";
import {
  failed,
  openMatchOf,
  publish,
  type CallUpHost,
} from "@/state/match-session-call-up";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "tapCell" | "addOvertime" | "removeLastOvertime"
>;

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
  let teamPlayers: PlayerRecord[];
  try {
    // Read first, write last: nothing fallible is left after the commit (RF-085).
    teamPlayers = listPlayers(host.db, current.teamId);
    saveCellChanges(
      host.db,
      current.matchId,
      cellChanges(current.grid, result.grid),
    );
  } catch {
    return failed(host);
  }
  const entry = undoEntryFor(current.grid, result.grid);
  return publish(host, {
    matchId: current.matchId,
    grid: result.grid,
    history: [...host.get().history, entry],
    teamPlayers,
  });
}

function add(host: CallUpHost): SaveResult {
  const current = openMatchOf(host);
  if (current === null) {
    return { kind: "unchanged" };
  }
  let teamPlayers: PlayerRecord[];
  try {
    teamPlayers = listPlayers(host.db, current.teamId);
    saveOvertime(host.db, current.matchId);
  } catch {
    return failed(host);
  }
  return publish(host, {
    matchId: current.matchId,
    grid: addOvertime(current.grid),
    history: host.get().history,
    teamPlayers,
  });
}

function removeLast(host: CallUpHost): SaveResult {
  const current = openMatchOf(host);
  if (current === null || current.grid.overtimeCount === 0) {
    return { kind: "unchanged" };
  }
  let teamPlayers: PlayerRecord[];
  try {
    teamPlayers = listPlayers(host.db, current.teamId);
    deleteLastOvertime(host.db, current.matchId);
  } catch {
    return failed(host);
  }
  const grid = removeLastOvertime(current.grid);
  // RF-086: entries that refer to the removed overtime are discarded.
  const history = pruneHistory(host.get().history, grid);
  return publish(host, {
    matchId: current.matchId,
    grid,
    history,
    teamPlayers,
  });
}

export function createMarksActions(host: CallUpHost): Actions {
  return {
    tapCell: (cell) => tap(host, cell),
    addOvertime: () => add(host),
    removeLastOvertime: () => removeLast(host),
  };
}
