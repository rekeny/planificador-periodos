import {
  addOvertime as saveOvertime,
  removeLastOvertime as deleteLastOvertime,
} from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import { cellExists, type Cell } from "@/domain/grid";
import { tapCell } from "@/domain/marking";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import { pruneHistory } from "@/domain/undo";
import {
  failed,
  openMatchOf,
  publish,
  type CallUpHost,
} from "@/state/match-session-call-up";
import { commitMarkChange } from "@/state/match-session-commit";
import { ask, hasPendingQuestion } from "@/state/match-session-pending";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "tapCell" | "addOvertime" | "removeLastOvertime"
>;

function tap(host: CallUpHost, cell: Cell): SaveResult {
  const current = openMatchOf(host);
  // While a question is open nothing else acts on the grid (D3-7).
  if (
    current === null ||
    host.get().pending !== null ||
    !cellExists(current.grid, cell)
  ) {
    return { kind: "unchanged" };
  }
  const result = tapCell(current.grid, cell);
  switch (result.kind) {
    case "changed":
      return commitMarkChange(host, current, result.grid);
    case "askSubOrStarter":
      return ask(host, { kind: "subOrStarter", cell });
    case "confirmRemoveStarter":
      return ask(host, { kind: "confirmRemoveStarter", cell });
    default:
      return { kind: "unchanged" };
  }
}

function add(host: CallUpHost): SaveResult {
  if (hasPendingQuestion(host)) {
    return { kind: "unchanged" };
  }
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
  if (hasPendingQuestion(host)) {
    return { kind: "unchanged" };
  }
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
