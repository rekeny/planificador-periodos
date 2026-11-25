import type { StoreApi } from "zustand/vanilla";
import { isoDate, isoTime } from "@/domain/match-date";

/** The fields and setters that the new-match draft and the match details draft share. */
export interface MatchFieldsState {
  /** "YYYY-MM-DD". */
  readonly date: string;
  /** "HH:MM", or null when the coach gave none. */
  readonly time: string | null;
  // The fields below keep the text as typed; the domain normalises them when saving.
  readonly homeName: string;
  readonly awayName: string;
  readonly homeScore: string;
  readonly awayScore: string;
  readonly notes: string;
  setDate(parts: { year: number; month: number; day: number }): void;
  setTime(parts: { hour: number; minute: number }): void;
  clearTime(): void;
  setMyTeamAs(side: "home" | "away"): void;
  setHomeName(text: string): void;
  setAwayName(text: string): void;
  setHomeScore(text: string): void;
  setAwayScore(text: string): void;
  setNotes(text: string): void;
}

/** What the match form reads: the state and its changes, never the setState of the owner. */
export type MatchFieldsStore = Pick<
  StoreApi<MatchFieldsState>,
  "getState" | "getInitialState" | "subscribe"
>;

/** The text fields of an empty draft. */
export const EMPTY_FIELDS = {
  homeName: "",
  awayName: "",
  homeScore: "",
  awayScore: "",
  notes: "",
};

type FieldChanges = Partial<
  Pick<
    MatchFieldsState,
    | "date"
    | "time"
    | "homeName"
    | "awayName"
    | "homeScore"
    | "awayScore"
    | "notes"
  >
>;

type Setters = Pick<
  MatchFieldsState,
  | "setDate"
  | "setTime"
  | "clearTime"
  | "setMyTeamAs"
  | "setHomeName"
  | "setAwayName"
  | "setHomeScore"
  | "setAwayScore"
  | "setNotes"
>;

/** The setters both drafts share; `teamName` is read when setMyTeamAs runs. */
export function matchFieldSetters(
  set: (changes: FieldChanges) => void,
  teamName: () => string,
): Setters {
  return {
    setDate: (parts) => set({ date: isoDate(parts) }),
    setTime: (parts) => set({ time: isoTime(parts) }),
    clearTime: () => set({ time: null }),
    setMyTeamAs: (side) =>
      set(
        side === "home" ? { homeName: teamName() } : { awayName: teamName() },
      ),
    setHomeName: (homeName) => set({ homeName }),
    setAwayName: (awayName) => set({ awayName }),
    setHomeScore: (homeScore) => set({ homeScore }),
    setAwayScore: (awayScore) => set({ awayScore }),
    setNotes: (notes) => set({ notes }),
  };
}
