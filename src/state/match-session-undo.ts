import { saveCellChanges } from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import { undoLast } from "@/domain/undo";
import {
  failed,
  openMatchOf,
  publish,
  type CallUpHost,
} from "@/state/match-session-call-up";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<MatchSessionState, "undo">;

function undo(host: CallUpHost): SaveResult {
  const current = openMatchOf(host);
  const history = host.get().history;
  // Nothing to undo: neither sets nor clears saveFailed.
  if (current === null || history.length === 0) {
    return { kind: "unchanged" };
  }
  const result = undoLast(current.grid, history);
  let teamPlayers: PlayerRecord[];
  try {
    // Read first, write last: nothing fallible is left after the commit (RF-085).
    teamPlayers = listPlayers(host.db, current.teamId);
    // One transaction; the domain already skipped cells that no longer exist (US3.5).
    saveCellChanges(host.db, current.matchId, result.changes);
  } catch {
    // The entry stays in the history: a failed undo does not lose it.
    return failed(host);
  }
  return publish(host, {
    matchId: current.matchId,
    grid: result.grid,
    history: result.history,
    teamPlayers,
  });
}

export function createUndoActions(host: CallUpHost): Actions {
  return { undo: () => undo(host) };
}
