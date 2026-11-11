// Call-up rules: who is called up, name and number snapshot, removal (RF-019, RF-030 to RF-034).
import type {
  CallUpEntry,
  CallUpEntryId,
  CellKey,
  MatchGrid,
} from "@/domain/grid";
import { comparePlayers } from "@/domain/player-order";
import type { Player } from "@/domain/squad";

// An entry before the database gives it an id.
export type NewCallUpEntry = Omit<CallUpEntry, "id">;

// The entry copies the name and number the player has now (RF-019, E-018).
export function callUpEntryFor(player: Player): NewCallUpEntry {
  return { playerId: player.id, name: player.name, number: player.number };
}

function activeSorted(players: readonly Player[]): Player[] {
  return players.filter((player) => player.isActive).sort(comparePlayers);
}

// Every active player, sorted (RF-030). The range of players is only a warning.
export function initialCallUp(players: readonly Player[]): Player[] {
  return activeSorted(players);
}

// Active players not yet in the call-up, sorted (RF-032).
export function playersToAdd(
  players: readonly Player[],
  callUp: readonly CallUpEntry[],
): Player[] {
  const inCallUp = new Set(callUp.map((entry) => entry.playerId));
  return activeSorted(players).filter((player) => !inCallUp.has(player.id));
}

// The exact id followed by ":", so entry 1 never matches entry 11.
function belongsTo(key: string, entryId: CallUpEntryId): boolean {
  return key.startsWith(`${entryId}:`);
}

// Any mark, an X or a circled X, decides the removal confirmation (RF-033, RF-034).
export function entryHasMarks(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): boolean {
  return Object.keys(grid.marks).some((key) => belongsTo(key, entryId));
}

// The row and all its marks go; other rows and marks stay as they were (RF-034, E-017).
export function removeFromCallUp(
  grid: MatchGrid,
  entryId: CallUpEntryId,
): MatchGrid {
  const marks: Partial<Record<CellKey, MatchGrid["marks"][CellKey]>> = {};
  for (const key of Object.keys(grid.marks) as CellKey[]) {
    if (!belongsTo(key, entryId)) {
      marks[key] = grid.marks[key];
    }
  }
  return {
    ...grid,
    callUp: grid.callUp.filter((entry) => entry.id !== entryId),
    marks,
  };
}
