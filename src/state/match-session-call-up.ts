import type { AppDatabase } from "@/data/database-types";
import {
  addToCallUp as saveEntry,
  createPlayerInMatch as saveNewPlayer,
  removeFromCallUp as deleteEntry,
} from "@/data/call-up-repository";
import { listPlayers } from "@/data/player-repository";
import type { CallUpEntryRecord, PlayerRecord } from "@/data/records";
import {
  addToCallUp,
  callUpEntryFor,
  removeFromCallUp,
} from "@/domain/call-up";
import type { MatchGrid } from "@/domain/grid";
import { validatePlayerInput } from "@/domain/squad-validation";
import type { Player } from "@/domain/squad";
import { pruneHistory, type UndoEntry } from "@/domain/undo";
import { evaluateWarnings } from "@/domain/warnings";
import { hasPendingQuestion } from "@/state/match-session-pending";
import type { MatchSessionState } from "@/state/match-session-store";
import { buildMatchView } from "@/state/match-view";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "addToCallUp" | "removeFromCallUp" | "createPlayerInMatch"
>;
type Published = Pick<
  MatchSessionState,
  "grid" | "warnings" | "view" | "history" | "saveFailed" | "pending"
>;

/** What the slice needs from the store: its state, a way to publish and the open match's team. */
export interface CallUpHost {
  readonly db: AppDatabase;
  readonly get: () => MatchSessionState;
  readonly set: (change: Partial<Published>) => void;
  readonly teamId: () => number | undefined;
}

/** What a publish needs, all read or computed BEFORE the write: nothing fallible is left after it. */
export interface Next {
  readonly matchId: number;
  readonly grid: MatchGrid;
  readonly history: readonly UndoEntry[];
  readonly teamPlayers: readonly Player[];
}

/**
 * Publishes a changed grid: the warnings and the view are recomputed (RF-060) from the players the
 * caller read before writing, so a player changed elsewhere is never offered from an old copy. It
 * only computes in memory and never throws, so it is safe right after a commit (RF-085).
 */
export function publish(host: CallUpHost, next: Next): SaveResult {
  const { grid, history, matchId, teamPlayers } = next;
  const warnings = evaluateWarnings(grid);
  const view = buildMatchView({
    matchId,
    grid,
    warnings,
    history,
    teamPlayers,
  });
  host.set({
    grid,
    warnings,
    view,
    history,
    saveFailed: false,
    pending: null,
  });
  return { kind: "saved" };
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
export function failed(host: CallUpHost): SaveResult {
  host.set({ saveFailed: true });
  return { kind: "saveFailed" };
}

export interface OpenMatch {
  readonly grid: MatchGrid;
  readonly matchId: number;
  readonly teamId: number;
}

// The open match, or null when the session is closed (the grid is null then).
export function openMatchOf(host: CallUpHost): OpenMatch | null {
  const { grid, view } = host.get();
  const teamId = host.teamId();
  return grid === null || view === null || teamId === undefined
    ? null
    : { grid, matchId: view.matchId, teamId };
}

// Call-up changes never add an undo entry (RF-086), they only prune the old ones.
function publishCallUp(
  host: CallUpHost,
  current: OpenMatch,
  grid: MatchGrid,
  teamPlayers: readonly Player[],
): SaveResult {
  const history = pruneHistory(host.get().history, grid);
  return publish(host, {
    matchId: current.matchId,
    grid,
    history,
    teamPlayers,
  });
}

function add(host: CallUpHost, playerId: number): SaveResult {
  if (hasPendingQuestion(host)) {
    return { kind: "unchanged" };
  }
  const current = openMatchOf(host);
  if (current === null) {
    return { kind: "unchanged" };
  }
  let written: { record: CallUpEntryRecord; teamPlayers: PlayerRecord[] };
  try {
    // The read comes first: once the entry is committed no read is left that could fail (RF-085).
    const teamPlayers = listPlayers(host.db, current.teamId);
    const player = teamPlayers.find((candidate) => candidate.id === playerId);
    if (player === undefined) {
      return { kind: "unchanged" };
    }
    const record = saveEntry(host.db, current.matchId, callUpEntryFor(player));
    written = { record, teamPlayers };
  } catch {
    return failed(host);
  }
  const grid = addToCallUp(current.grid, entryOf(written.record));
  return publishCallUp(host, current, grid, written.teamPlayers);
}

function remove(host: CallUpHost, entryId: number): SaveResult {
  if (hasPendingQuestion(host)) {
    return { kind: "unchanged" };
  }
  const current = openMatchOf(host);
  if (!current?.grid.callUp.some((entry) => entry.id === entryId)) {
    return { kind: "unchanged" };
  }
  let teamPlayers: PlayerRecord[];
  try {
    teamPlayers = listPlayers(host.db, current.teamId);
    deleteEntry(host.db, entryId);
  } catch {
    return failed(host);
  }
  const grid = removeFromCallUp(current.grid, entryId);
  return publishCallUp(host, current, grid, teamPlayers);
}

function create(
  host: CallUpHost,
  input: { name: string; number: string },
): SaveResult {
  if (hasPendingQuestion(host)) {
    return { kind: "unchanged" };
  }
  const current = openMatchOf(host);
  if (current === null) {
    return { kind: "unchanged" };
  }
  const checked = validatePlayerInput(input);
  if (checked.kind === "invalid") {
    return { kind: "invalid", errors: checked.errors };
  }
  let written: { entry: CallUpEntryRecord; teamPlayers: PlayerRecord[] };
  try {
    const before = listPlayers(host.db, current.teamId);
    const { player, entry } = saveNewPlayer(host.db, current.matchId, {
      teamId: current.teamId,
      ...checked.value,
    });
    // The new player is added in memory: she is in the call-up, so she is not offered anyway.
    written = { entry, teamPlayers: [...before, player] };
  } catch {
    return failed(host);
  }
  const grid = addToCallUp(current.grid, entryOf(written.entry));
  return publishCallUp(host, current, grid, written.teamPlayers);
}

export function createCallUpActions(host: CallUpHost): Actions {
  return {
    addToCallUp: (playerId) => add(host, playerId),
    removeFromCallUp: (entryId) => remove(host, entryId),
    createPlayerInMatch: (input) => create(host, input),
  };
}
