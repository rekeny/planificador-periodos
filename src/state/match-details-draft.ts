import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import { getMatch, updateMatchDetails } from "@/data/match-repository";
import { getTeam } from "@/data/team-repository";
import { validateMatchInput } from "@/domain/match-input";
import { matchFieldSetters } from "@/state/match-fields";
import type { MatchFieldsState } from "@/state/match-fields";
import type { SaveResult } from "@/state/save-result";

export interface MatchDetailsDraftState extends MatchFieldsState {
  /** "notFound" when the match does not exist or could not be read (RF-082). */
  readonly status: "ready" | "notFound";
  save(): SaveResult;
}

export type MatchDetailsDraft = StoreApi<MatchDetailsDraftState>;

interface Loaded {
  readonly teamName: string;
  readonly fields: Pick<
    MatchFieldsState,
    | "date"
    | "time"
    | "homeName"
    | "awayName"
    | "homeScore"
    | "awayScore"
    | "notes"
  >;
}

// Reads the match and its team's name once; null when it is missing or a read throws.
function load(db: AppDatabase, matchId: number): Loaded | null {
  try {
    const match = getMatch(db, matchId);
    if (match === undefined) return null;
    const team = getTeam(db, match.teamId);
    return {
      teamName: team?.name ?? "",
      fields: {
        date: match.date,
        time: match.time,
        homeName: match.homeName ?? "",
        awayName: match.awayName ?? "",
        homeScore: match.homeScore === null ? "" : String(match.homeScore),
        awayScore: match.awayScore === null ? "" : String(match.awayScore),
        notes: match.notes ?? "",
      },
    };
  } catch {
    return null;
  }
}

/** A draft of the details of one saved match; nothing is written until save() (RF-082). */
export function createMatchDetailsDraft(
  db: AppDatabase,
  matchId: number,
): MatchDetailsDraft {
  const loaded = load(db, matchId);
  let saving = false; // a save() called while one runs is ignored (RF-085)

  return createStore<MatchDetailsDraftState>()((set, get) => ({
    status: loaded === null ? "notFound" : "ready",
    date: "",
    time: null,
    homeName: "",
    awayName: "",
    homeScore: "",
    awayScore: "",
    notes: "",
    ...loaded?.fields,
    ...matchFieldSetters(set, () => loaded?.teamName ?? ""),
    save: () => {
      if (loaded === null || saving) return { kind: "unchanged" };
      const state = get();
      const checked = validateMatchInput(state);
      if (checked.kind === "invalid") {
        return { kind: "invalid", errors: checked.errors };
      }
      saving = true;
      try {
        const saved = updateMatchDetails(db, matchId, {
          date: state.date,
          time: state.time,
          ...checked.value,
        });
        return saved === undefined ? { kind: "saveFailed" } : { kind: "saved" };
      } catch {
        return { kind: "saveFailed" };
      } finally {
        saving = false;
      }
    },
  }));
}
