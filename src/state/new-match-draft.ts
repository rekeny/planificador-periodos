import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { getTeam } from "@/data/team-repository";
import { initialCallUp } from "@/domain/call-up";
import { callUpRangeWarning } from "@/domain/call-up-range";
import type { CallUpRangeWarning } from "@/domain/call-up-range";
import { isFormat } from "@/domain/format";
import type { Format } from "@/domain/format";
import { isoDate, isoTime } from "@/domain/match-date";
import { newMatchDefaults } from "@/domain/match-input";
import type { Player } from "@/domain/squad";

export interface CallUpRow {
  readonly player: Player;
  readonly selected: boolean;
}

export interface NewMatchDraftState {
  readonly format: Format;
  /** "YYYY-MM-DD". */
  readonly date: string;
  /** "HH:MM", or null when the coach gave none. */
  readonly time: string | null;
  // The fields below keep the text as typed; the domain normalises them when T086 saves.
  readonly homeName: string;
  readonly awayName: string;
  readonly homeScore: string;
  readonly awayScore: string;
  readonly notes: string;
  readonly callUpSelection: readonly CallUpRow[];
  readonly callUpRange: CallUpRangeWarning | null;
  reset(teamId: number): void;
  setFormat(format: Format): void;
  setDate(parts: { year: number; month: number; day: number }): void;
  setTime(parts: { hour: number; minute: number }): void;
  clearTime(): void;
  setMyTeamAs(side: "home" | "away"): void;
  setHomeName(text: string): void;
  setAwayName(text: string): void;
  setHomeScore(text: string): void;
  setAwayScore(text: string): void;
  setNotes(text: string): void;
  toggle(playerId: number): void;
}

export type NewMatchDraft = StoreApi<NewMatchDraftState>;

type Set = NewMatchDraft["setState"];
type Get = NewMatchDraft["getState"];

const EMPTY_FIELDS = {
  homeName: "",
  awayName: "",
  homeScore: "",
  awayScore: "",
  notes: "",
};

function rangeOf(
  format: Format,
  rows: readonly CallUpRow[],
): CallUpRangeWarning | null {
  return callUpRangeWarning(format, rows.filter((row) => row.selected).length);
}

// The clock gives the local day; the date is read at every reset, never at import time.
function today(now: () => Date): string {
  const date = now();
  return isoDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

export function createNewMatchDraft(
  db: AppDatabase,
  now: () => Date,
): NewMatchDraft {
  // The team name and id are not part of the screen's state: only setMyTeamAs needs them.
  let teamName = "";

  function reset(set: Set, teamId: number): void {
    const team = getTeam(db, teamId);
    if (team === undefined || !isFormat(team.defaultFormat)) return;
    teamName = team.name;
    const rows = initialCallUp(listPlayers(db, teamId)).map((player) => ({
      player,
      selected: true,
    }));
    const defaults = newMatchDefaults(team.defaultFormat, today(now));
    set({
      ...defaults,
      ...EMPTY_FIELDS,
      callUpSelection: rows,
      callUpRange: rangeOf(defaults.format, rows),
    });
  }

  function toggle(set: Set, get: Get, playerId: number): void {
    const { callUpSelection, format } = get();
    if (!callUpSelection.some((row) => row.player.id === playerId)) return;
    const rows = callUpSelection.map((row) =>
      row.player.id === playerId ? { ...row, selected: !row.selected } : row,
    );
    set({ callUpSelection: rows, callUpRange: rangeOf(format, rows) });
  }

  return createStore<NewMatchDraftState>()((set, get) => ({
    ...newMatchDefaults(6, ""),
    ...EMPTY_FIELDS,
    callUpSelection: [],
    callUpRange: null,
    reset: (teamId) => reset(set, teamId),
    setFormat: (format) =>
      set({ format, callUpRange: rangeOf(format, get().callUpSelection) }),
    setDate: (parts) => set({ date: isoDate(parts) }),
    setTime: (parts) => set({ time: isoTime(parts) }),
    clearTime: () => set({ time: null }),
    setMyTeamAs: (side) =>
      set(side === "home" ? { homeName: teamName } : { awayName: teamName }),
    setHomeName: (homeName) => set({ homeName }),
    setAwayName: (awayName) => set({ awayName }),
    setHomeScore: (homeScore) => set({ homeScore }),
    setAwayScore: (awayScore) => set({ awayScore }),
    setNotes: (notes) => set({ notes }),
    toggle: (playerId) => toggle(set, get, playerId),
  }));
}
