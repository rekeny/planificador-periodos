import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import {
  deleteMatch,
  getMatch,
  listAllMatches,
  listTeamMatches,
} from "@/data/match-repository";
import type { MatchListRecord, MatchRecord } from "@/data/records";
import { isFormat } from "@/domain/format";
import type { Format } from "@/domain/format";
import { compareMatches } from "@/domain/match-order";
import { shownDate, shownTime } from "@/state/match-date-text";
import type { SaveResult } from "@/state/save-result";

/** One row of a list of matches, with the texts the coach reads already formatted (RF-074, RF-075). */
export interface MatchListItem {
  readonly id: number;
  readonly date: string;
  readonly time: string | null;
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly score: {
    readonly home: number;
    readonly away: number;
  } | null;
  readonly format: Format;
  /** The match's team: set in the list of every match, null in a team's list. */
  readonly team: {
    readonly name: string;
    readonly category: string | null;
  } | null;
}

export interface TeamMatches {
  readonly teamId: number;
  readonly items: readonly MatchListItem[];
}

export interface MatchesState {
  readonly allMatches: readonly MatchListItem[];
  /** The open team's list, or null while no team's list was loaded. */
  readonly teamMatches: TeamMatches | null;
  loadAll(): void;
  loadTeam(teamId: number): void;
  deleteMatch(matchId: number): SaveResult;
}

type Set = StoreApi<MatchesState>["setState"];
type Get = StoreApi<MatchesState>["getState"];
export type MatchesStore = StoreApi<MatchesState>;

interface SortableItem {
  readonly record: MatchRecord;
  readonly item: MatchListItem;
}

// A format outside 4, 6 and 8 cannot be stored (check constraint); throwing keeps it a read error.
function toItem(
  record: MatchRecord,
  team: MatchListItem["team"],
): MatchListItem {
  if (!isFormat(record.format)) {
    throw new Error("Unknown format in the database");
  }
  const { homeScore, awayScore } = record;
  return {
    id: record.id,
    date: shownDate(record.date),
    time: shownTime(record.time),
    homeName: record.homeName,
    awayName: record.awayName,
    score:
      homeScore === null || awayScore === null
        ? null
        : { home: homeScore, away: awayScore },
    format: record.format,
    team,
  };
}

// The sort is stable, so matches with the same date and time keep the database order.
function sorted(entries: readonly SortableItem[]): readonly MatchListItem[] {
  return [...entries]
    .sort((a, b) => compareMatches(a.record, b.record))
    .map((entry) => entry.item);
}

function allItems(db: AppDatabase): readonly MatchListItem[] {
  return sorted(
    listAllMatches(db).map((record: MatchListRecord) => ({
      record,
      item: toItem(record, {
        name: record.teamName,
        category: record.teamCategory,
      }),
    })),
  );
}

function teamItems(db: AppDatabase, teamId: number): readonly MatchListItem[] {
  return sorted(
    listTeamMatches(db, teamId).map((record) => ({
      record,
      item: toItem(record, null),
    })),
  );
}

function without(
  items: readonly MatchListItem[],
  matchId: number,
): readonly MatchListItem[] {
  return items.some((item) => item.id === matchId)
    ? items.filter((item) => item.id !== matchId)
    : items;
}

function loadTeam(db: AppDatabase, set: Set, teamId: number): void {
  try {
    set({ teamMatches: { teamId, items: teamItems(db, teamId) } });
  } catch {
    set({ teamMatches: { teamId, items: [] } });
  }
}

function loadAll(db: AppDatabase, set: Set): void {
  try {
    set({ allMatches: allItems(db) });
  } catch {
    set({ allMatches: [] });
  }
}

// Everything is read before the delete is committed; afterwards the lists only change in memory.
function removeMatch(
  db: AppDatabase,
  set: Set,
  get: Get,
  id: number,
): SaveResult {
  try {
    const { allMatches, teamMatches } = get();
    const listed =
      allMatches.some((item) => item.id === id) ||
      (teamMatches?.items.some((item) => item.id === id) ?? false);
    if (!listed && getMatch(db, id) === undefined) {
      return { kind: "unchanged" };
    }
    deleteMatch(db, id);
  } catch {
    return { kind: "saveFailed" };
  }
  const { allMatches, teamMatches } = get();
  set({
    allMatches: without(allMatches, id),
    teamMatches:
      teamMatches === null
        ? null
        : { teamId: teamMatches.teamId, items: without(teamMatches.items, id) },
  });
  return { kind: "saved" };
}

/** The store of the two lists of matches and of deleting a match (RF-029, RF-074, RF-075). */
export function createMatchesStore(db: AppDatabase): MatchesStore {
  return createStore<MatchesState>()((set, get) => ({
    allMatches: [],
    teamMatches: null,
    loadAll: () => loadAll(db, set),
    loadTeam: (teamId) => loadTeam(db, set, teamId),
    deleteMatch: (matchId) => removeMatch(db, set, get, matchId),
  }));
}
