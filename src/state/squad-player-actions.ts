import type { AppDatabase } from "@/data/database-types";
import {
  listPlayers,
  setPlayerActive as writePlayerActive,
  updatePlayer as writePlayerEdit,
} from "@/data/player-repository";
import type { PlayerRecord } from "@/data/records";
import { duplicateNumbers } from "@/domain/duplicate-numbers";
import { comparePlayers } from "@/domain/player-order";
import type { Player } from "@/domain/squad";
import { validatePlayerInput } from "@/domain/squad-validation";
import type { SaveResult } from "@/state/save-result";
import type { PlayerInput, SquadState } from "@/state/squad-store";
import type { StoreApi } from "zustand/vanilla";

export type PlayersView = Pick<SquadState, "players" | "duplicateNumbers">;

/** What the store shares with the player actions. `deleted` is true once the open team is deleted. */
export interface SquadContext {
  readonly db: AppDatabase;
  readonly set: StoreApi<SquadState>["setState"];
  readonly get: StoreApi<SquadState>["getState"];
  readonly deletedOpenTeam: { value: boolean };
}

const SAVED: SaveResult = { kind: "saved" };
const SAVE_FAILED: SaveResult = { kind: "saveFailed" };
const UNCHANGED: SaveResult = { kind: "unchanged" };

export function toPlayer(record: PlayerRecord): Player {
  return { ...record };
}

/** The players as the screens show them: sorted, inactive ones included, with the duplicates. */
export function playersView(players: readonly Player[]): PlayersView {
  return {
    players: [...players].sort(comparePlayers),
    duplicateNumbers: duplicateNumbers(players),
  };
}

/** The open team's id, or null when there is no open team or it was deleted. */
export function writableTeamId(context: SquadContext): number | null {
  const { team, status } = context.get();
  if (status !== "open" || team === null || context.deletedOpenTeam.value) {
    return null;
  }
  return team.id;
}

// The list is read before the write and the new one is built in memory: once the write is
// committed no read is left that could fail (D3 rule 2, RF-085).
function saveToPlayer(
  context: SquadContext,
  playerId: number,
  write: () => PlayerRecord | undefined,
): SaveResult {
  const teamId = writableTeamId(context);
  if (teamId === null) {
    return UNCHANGED;
  }
  let before: readonly Player[];
  try {
    before = listPlayers(context.db, teamId).map(toPlayer);
  } catch {
    return SAVE_FAILED;
  }
  if (!before.some((player) => player.id === playerId)) {
    return UNCHANGED;
  }
  let saved: PlayerRecord | undefined;
  try {
    saved = write();
  } catch {
    return SAVE_FAILED;
  }
  if (saved === undefined) {
    return SAVE_FAILED;
  }
  const players = before.map((p) => (p.id === playerId ? toPlayer(saved) : p));
  context.set(playersView(players));
  return SAVED;
}

export function updatePlayer(
  context: SquadContext,
  playerId: number,
  input: PlayerInput,
): SaveResult {
  if (writableTeamId(context) === null) {
    return UNCHANGED;
  }
  const checked = validatePlayerInput(input);
  if (checked.kind === "invalid") {
    return checked;
  }
  return saveToPlayer(context, playerId, () =>
    writePlayerEdit(context.db, playerId, checked.value),
  );
}

export function setPlayerActive(
  context: SquadContext,
  playerId: number,
  isActive: boolean,
): SaveResult {
  return saveToPlayer(context, playerId, () =>
    writePlayerActive(context.db, playerId, isActive),
  );
}
