import { listPlayers } from "@/data/player-repository";
import { changeMatchFormat } from "@/data/match-repository";
import type { PlayerRecord } from "@/data/records";
import type { Format } from "@/domain/format";
import { changeFormat as changeGridFormat } from "@/domain/format-change";
import { pruneHistory } from "@/domain/undo";
import {
  openMatchOf,
  publish,
  type CallUpHost,
} from "@/state/match-session-call-up";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<MatchSessionState, "changeFormat">;

/**
 * Changes the open match's format (RF-038, RF-040). The current format, or no open match, reads and
 * writes nothing and leaves any question as it is (RF-039). Otherwise the players are read first,
 * then the format is written in one transaction, then the grid is cut, the history pruned and the
 * result published, which also closes any question. No undo entry is pushed (RF-086). A read or
 * write that throws publishes nothing, keeps the history and closes the question (D3-4).
 */
function change(host: CallUpHost, format: Format): SaveResult {
  const current = openMatchOf(host);
  if (current === null || current.grid.format === format) {
    return { kind: "unchanged" };
  }
  let teamPlayers: PlayerRecord[];
  try {
    // Read first, write last: nothing fallible is left after the commit (D3 rule 2).
    teamPlayers = listPlayers(host.db, current.teamId);
    changeMatchFormat(host.db, current.matchId, format);
  } catch {
    const { view } = host.get();
    host.set({
      saveFailed: true,
      pending: null,
      view: view === null ? null : { ...view, replaceableStarters: [] },
    });
    return { kind: "saveFailed" };
  }
  const grid = changeGridFormat(current.grid, format);
  return publish(host, {
    matchId: current.matchId,
    grid,
    history: pruneHistory(host.get().history, grid),
    teamPlayers,
  });
}

export function createFormatActions(host: CallUpHost): Actions {
  return { changeFormat: (format) => change(host, format) };
}
