import { saveCellChanges } from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import type { MatchGrid } from "@/domain/grid";
import { cellChanges, undoEntryFor } from "@/domain/undo";
import {
  publish,
  type CallUpHost,
  type OpenMatch,
} from "@/state/match-session-call-up";
import type { SaveResult } from "@/state/save-result";

/**
 * Saves a mark change the domain accepted: the team's players are read first, then the cells are
 * written in one transaction, one undo entry is pushed and the new grid is published, which also
 * closes any question (RF-085, D3 rule 2). A read or write that throws changes no grid, pushes no
 * entry, closes the question and sets the failure flag (D3-4).
 */
export function commitMarkChange(
  host: CallUpHost,
  current: OpenMatch,
  after: MatchGrid,
): SaveResult {
  let teamPlayers: PlayerRecord[];
  try {
    // Read first, write last: nothing fallible is left after the commit.
    teamPlayers = listPlayers(host.db, current.teamId);
    saveCellChanges(host.db, current.matchId, cellChanges(current.grid, after));
  } catch {
    host.set({ saveFailed: true, pending: null });
    return { kind: "saveFailed" };
  }
  return publish(host, {
    matchId: current.matchId,
    grid: after,
    history: [...host.get().history, undoEntryFor(current.grid, after)],
    teamPlayers,
  });
}
