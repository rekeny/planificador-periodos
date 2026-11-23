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
import { isoDate } from "@/domain/match-date";
import { newMatchDefaults } from "@/domain/match-input";
import type { Player } from "@/domain/squad";
import { EMPTY_FIELDS, matchFieldSetters } from "@/state/match-fields";
import type { MatchFieldsState } from "@/state/match-fields";
import { saveDraft } from "@/state/new-match-save";
import type { CreateResult } from "@/state/new-match-save";

export interface CallUpRow {
  readonly player: Player;
  readonly selected: boolean;
}

export interface NewMatchDraftState extends MatchFieldsState {
  /** The team the draft was reset for; null when it is empty (never reset or the reset failed). */
  readonly teamId: number | null;
  /** The mounted form that owns the draft; null when it is empty or was reset without a form. */
  readonly formId: string | null;
  readonly format: Format;
  readonly callUpSelection: readonly CallUpRow[];
  readonly callUpRange: CallUpRangeWarning | null;
  /** True when the team loaded and the draft is ready; false leaves it empty and unsaveable. */
  reset(teamId: number, formId?: string): boolean;
  setFormat(format: Format): void;
  toggle(playerId: number): void;
  create(): CreateResult;
}

export type NewMatchDraft = StoreApi<NewMatchDraftState>;

type Set = NewMatchDraft["setState"];
type Get = NewMatchDraft["getState"];

// What an empty draft holds: no team, no text, nobody called up.
const EMPTY_DRAFT = {
  ...EMPTY_FIELDS,
  teamId: null,
  formId: null,
  callUpSelection: [],
  callUpRange: null,
} satisfies Partial<NewMatchDraftState>;

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

interface LoadedDraft {
  readonly team: { readonly id: number; readonly name: string };
  readonly state: Partial<NewMatchDraftState>;
}

// Reads the team and its squad; null when the team is missing or its format is not valid.
function loadDraft(
  db: AppDatabase,
  teamId: number,
  now: () => Date,
): LoadedDraft | null {
  const team = getTeam(db, teamId);
  if (team === undefined || !isFormat(team.defaultFormat)) return null;
  const rows = initialCallUp(listPlayers(db, teamId)).map((player) => ({
    player,
    selected: true,
  }));
  const defaults = newMatchDefaults(team.defaultFormat, today(now));
  return {
    team,
    state: {
      ...defaults,
      ...EMPTY_FIELDS,
      callUpSelection: rows,
      callUpRange: rangeOf(defaults.format, rows),
    },
  };
}

function toggle(set: Set, get: Get, playerId: number): void {
  const { callUpSelection, format } = get();
  if (!callUpSelection.some((row) => row.player.id === playerId)) return;
  const rows = callUpSelection.map((row) =>
    row.player.id === playerId ? { ...row, selected: !row.selected } : row,
  );
  set({ callUpSelection: rows, callUpRange: rangeOf(format, rows) });
}

export function createNewMatchDraft(
  db: AppDatabase,
  now: () => Date,
): NewMatchDraft {
  // The team name and id are not part of the screen's state: only setMyTeamAs needs them.
  let teamName = "";
  let openedTeamId: number | null = null; // null: never reset, nothing to save (RF-025)
  let created: CreateResult | null = null; // the saved result: a second tap saves nothing (P-30)

  function invalidate(set: Set): void {
    teamName = "";
    openedTeamId = null;
    created = null;
    set(EMPTY_DRAFT);
  }

  // Invalidates first so that nothing of an earlier team survives a reset that cannot finish
  // (unknown team, bad format, failed read): the route then shows not found (RF-082).
  function reset(set: Set, teamId: number, formId: string | null): boolean {
    invalidate(set);
    try {
      const loaded = loadDraft(db, teamId, now);
      if (loaded === null) return false;
      teamName = loaded.team.name;
      openedTeamId = loaded.team.id;
      set({ ...loaded.state, teamId: loaded.team.id, formId });
      return true;
    } catch {
      invalidate(set);
      return false;
    }
  }

  function create(get: Get): CreateResult {
    if (openedTeamId === null) return { kind: "unchanged" };
    if (created !== null) return created;
    const result = saveDraft(db, openedTeamId, get());
    if (result.kind === "saved") created = result; // only a saved match is remembered
    return result;
  }

  return createStore<NewMatchDraftState>()((set, get) => ({
    ...newMatchDefaults(6, ""),
    ...EMPTY_DRAFT,
    reset: (teamId, formId) => reset(set, teamId, formId ?? null),
    setFormat: (format) =>
      set({ format, callUpRange: rangeOf(format, get().callUpSelection) }),
    ...matchFieldSetters(set, () => teamName),
    toggle: (playerId) => toggle(set, get, playerId),
    create: () => create(get),
  }));
}
