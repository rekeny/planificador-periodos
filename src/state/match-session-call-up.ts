import type { AppDatabase } from "@/data/database-types";
import {
  addToCallUp as saveEntry,
  createPlayerInMatch as saveNewPlayer,
  removeFromCallUp as deleteEntry,
} from "@/data/call-up-repository";
import { listPlayers } from "@/data/player-repository";
import type { CallUpEntryRecord } from "@/data/records";
import {
  addToCallUp,
  callUpEntryFor,
  removeFromCallUp,
} from "@/domain/call-up";
import type { MatchGrid } from "@/domain/grid";
import { validatePlayerInput } from "@/domain/squad-validation";
import { pruneHistory } from "@/domain/undo";
import { evaluateWarnings } from "@/domain/warnings";
import type { MatchSessionState } from "@/state/match-session-store";
import { buildMatchView } from "@/state/match-view";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "addToCallUp" | "removeFromCallUp" | "createPlayerInMatch"
>;
type Published = Pick<
  MatchSessionState,
  "grid" | "warnings" | "view" | "history" | "saveFailed"
>;

/** What the slice needs from the store: its state, a way to publish and the open match's team. */
export interface CallUpHost {
  readonly db: AppDatabase;
  readonly get: () => MatchSessionState;
  readonly set: (change: Partial<Published>) => void;
  readonly teamId: () => number | undefined;
}

/**
 * Publishes a changed grid: the warnings and the view are recomputed (RF-060) and the players to
 * add are read again, so a player changed elsewhere is never offered from an old copy. Call-up
 * changes never add an undo entry (RF-086), they only prune the old ones.
 */
function publish(host: CallUpHost, matchId: number, grid: MatchGrid): void {
  const history = pruneHistory(host.get().history, grid);
  const warnings = evaluateWarnings(grid);
  const teamPlayers = listPlayers(host.db, host.teamId() ?? 0);
  const view = buildMatchView({
    matchId,
    grid,
    warnings,
    history,
    teamPlayers,
  });
  host.set({ grid, warnings, view, history, saveFailed: false });
}

function entryOf(record: CallUpEntryRecord) {
  return {
    id: record.id,
    playerId: record.playerId,
    name: record.playerName,
    number: record.playerNumber,
  };
}

/** A write that throws changes nothing in the view; only the flag tells the user (RF-085). */
function failed(host: CallUpHost): SaveResult {
  host.set({ saveFailed: true });
  return { kind: "saveFailed" };
}

interface OpenMatch {
  readonly grid: MatchGrid;
  readonly matchId: number;
  readonly teamId: number;
}

// The open match, or null when the session is closed (the grid is null then).
function openMatchOf(host: CallUpHost): OpenMatch | null {
  const { grid, view } = host.get();
  const teamId = host.teamId();
  return grid === null || view === null || teamId === undefined
    ? null
    : { grid, matchId: view.matchId, teamId };
}

function publishAdded(
  host: CallUpHost,
  current: OpenMatch,
  record: CallUpEntryRecord,
): SaveResult {
  publish(host, current.matchId, addToCallUp(current.grid, entryOf(record)));
  return { kind: "saved" };
}

function add(host: CallUpHost, playerId: number): SaveResult {
  const current = openMatchOf(host);
  const player = listPlayers(host.db, current?.teamId ?? 0).find(
    (candidate) => candidate.id === playerId,
  );
  if (current === null || player === undefined) {
    return { kind: "unchanged" };
  }
  try {
    const record = saveEntry(host.db, current.matchId, callUpEntryFor(player));
    return publishAdded(host, current, record);
  } catch {
    return failed(host);
  }
}

function remove(host: CallUpHost, entryId: number): SaveResult {
  const current = openMatchOf(host);
  if (!current?.grid.callUp.some((entry) => entry.id === entryId)) {
    return { kind: "unchanged" };
  }
  try {
    deleteEntry(host.db, entryId);
  } catch {
    return failed(host);
  }
  publish(host, current.matchId, removeFromCallUp(current.grid, entryId));
  return { kind: "saved" };
}

function create(
  host: CallUpHost,
  input: { name: string; number: string },
): SaveResult {
  const current = openMatchOf(host);
  if (current === null) {
    return { kind: "unchanged" };
  }
  const checked = validatePlayerInput(input);
  if (checked.kind === "invalid") {
    return { kind: "invalid", errors: checked.errors };
  }
  try {
    const { entry } = saveNewPlayer(host.db, current.matchId, {
      teamId: current.teamId,
      ...checked.value,
    });
    return publishAdded(host, current, entry);
  } catch {
    return failed(host);
  }
}

export function createCallUpActions(host: CallUpHost): Actions {
  return {
    addToCallUp: (playerId) => add(host, playerId),
    removeFromCallUp: (entryId) => remove(host, entryId),
    createPlayerInMatch: (input) => create(host, input),
  };
}
