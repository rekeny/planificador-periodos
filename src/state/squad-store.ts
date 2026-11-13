import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import { createPlayer, listPlayers } from "@/data/player-repository";
import type { PlayerRecord, TeamRecord } from "@/data/records";
import {
  createTeam,
  getTeam,
  listTeams,
  updateTeam,
} from "@/data/team-repository";
import type { TeamValues } from "@/data/team-repository";
import { duplicateNumbers } from "@/domain/duplicate-numbers";
import { isFormat } from "@/domain/format";
import type { Format } from "@/domain/format";
import { comparePlayers } from "@/domain/player-order";
import type { Player, Team } from "@/domain/squad";
import {
  validatePlayerInput,
  validateTeamInput,
} from "@/domain/squad-validation";
import { compareTeams } from "@/domain/team-order";
import type { SaveResult } from "@/state/save-result";

export interface TeamInput {
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: Format;
}

export interface PlayerInput {
  readonly name: string;
  readonly number: string;
}

export interface SquadState {
  readonly teams: readonly Team[];
  /** The open team, or null while none is open or it was not found. */
  readonly team: Team | null;
  readonly players: readonly Player[];
  readonly duplicateNumbers: readonly string[];
  readonly status: "closed" | "open" | "notFound";
  loadTeams(): void;
  openTeam(id: number): void;
  createTeam(input: TeamInput): SaveResult;
  updateTeam(id: number, input: TeamInput): SaveResult;
  addPlayer(input: PlayerInput): SaveResult;
}

const SAVED: SaveResult = { kind: "saved" };
const SAVE_FAILED: SaveResult = { kind: "saveFailed" };
const UNCHANGED: SaveResult = { kind: "unchanged" };

// A format outside 4, 6 and 8 cannot be stored (check constraint); throwing keeps it a read error.
function toTeam(record: TeamRecord): Team {
  if (!isFormat(record.defaultFormat)) {
    throw new Error("Unknown default format in the database");
  }
  return { ...record, defaultFormat: record.defaultFormat };
}

function toPlayer(record: PlayerRecord): Player {
  return { ...record };
}

function sortedTeams(db: AppDatabase): readonly Team[] {
  return listTeams(db).map(toTeam).sort(compareTeams);
}

function playersView(
  players: readonly Player[],
): Pick<SquadState, "players" | "duplicateNumbers"> {
  return {
    players: [...players].sort(comparePlayers),
    duplicateNumbers: duplicateNumbers(players),
  };
}

const NO_PLAYERS = playersView([]);

type Set = StoreApi<SquadState>["setState"];
type Get = StoreApi<SquadState>["getState"];
export type SquadStore = StoreApi<SquadState>;

function openTeam(db: AppDatabase, set: Set, id: number): void {
  try {
    const record = getTeam(db, id);
    if (record === undefined) {
      set({ status: "notFound", team: null, ...NO_PLAYERS });
      return;
    }
    const players = listPlayers(db, id).map(toPlayer);
    set({ status: "open", team: toTeam(record), ...playersView(players) });
  } catch {
    set({ status: "notFound", team: null, ...NO_PLAYERS });
  }
}

// The format is not normalised by the domain: it is a choice among 4, 6 and 8 made in the form.
function saveTeam(
  { db, set, get }: { db: AppDatabase; set: Set; get: Get },
  input: TeamInput,
  write: (values: TeamValues) => TeamRecord | undefined,
): SaveResult {
  const checked = validateTeamInput(input);
  if (checked.kind === "invalid") {
    return checked;
  }
  try {
    const saved = write({
      ...checked.value,
      defaultFormat: input.defaultFormat,
    });
    if (saved) {
      // The open team shows the new data at once (the team screen's header).
      const open = get().team;
      set({
        teams: sortedTeams(db),
        ...(open !== null && open.id === saved.id
          ? { team: toTeam(saved) }
          : {}),
      });
      return SAVED;
    }
    return SAVE_FAILED;
  } catch {
    return SAVE_FAILED;
  }
}

function addPlayer(db: AppDatabase, set: Set, get: Get, input: PlayerInput) {
  const { team, status, players } = get();
  if (status !== "open" || team === null) {
    return UNCHANGED;
  }
  const checked = validatePlayerInput(input);
  if (checked.kind === "invalid") {
    return checked;
  }
  try {
    const record = createPlayer(db, { teamId: team.id, ...checked.value });
    set(playersView([...players, toPlayer(record)]));
    return SAVED;
  } catch {
    return SAVE_FAILED;
  }
}

export function createSquadStore(db: AppDatabase): SquadStore {
  return createStore<SquadState>()((set, get) => ({
    teams: [],
    team: null,
    ...NO_PLAYERS,
    status: "closed",
    loadTeams() {
      try {
        set({ teams: sortedTeams(db) });
      } catch {
        set({ teams: [] });
      }
    },
    openTeam: (id) => openTeam(db, set, id),
    createTeam: (input) =>
      saveTeam({ db, set, get }, input, (values) => createTeam(db, values)),
    updateTeam: (id, input) =>
      saveTeam({ db, set, get }, input, (values) => updateTeam(db, id, values)),
    addPlayer: (input) => addPlayer(db, set, get, input),
  }));
}
