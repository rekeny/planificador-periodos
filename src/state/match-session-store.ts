import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { MatchGrid } from "@/domain/grid";
import type { UndoEntry } from "@/domain/undo";
import { evaluateWarnings, type Warnings } from "@/domain/warnings";
import { gridFromRecords } from "@/state/match-session-grid";
import { buildMatchView, type MatchView } from "@/state/match-view";

export interface MatchSessionState {
  readonly status: "closed" | "open" | "notFound";
  readonly grid: MatchGrid | null;
  readonly warnings: Warnings | null; // evaluateWarnings(grid) (RF-060)
  readonly view: MatchView | null; //    what the interface draws
  readonly history: readonly UndoEntry[]; // memory only (RF-057, RF-082)
  readonly saveFailed: boolean; //       RF-085
  openMatch(id: number): void;
  closeMatch(): void;
}

export type MatchSessionStore = StoreApi<MatchSessionState>;

const EMPTY = {
  grid: null,
  warnings: null,
  view: null,
  history: [],
  saveFailed: false,
} as const;

type Published = Pick<MatchSessionState, "grid" | "warnings" | "view">;

function load(db: AppDatabase, matchId: number): Published | undefined {
  const records = loadGridRecords(db, matchId);
  if (records === undefined) {
    return undefined;
  }
  const grid = gridFromRecords(records);
  const warnings = evaluateWarnings(grid);
  const teamPlayers = listPlayers(db, records.match.teamId);
  const view = buildMatchView({
    matchId,
    grid,
    warnings,
    history: [],
    teamPlayers,
  });
  return { grid, warnings, view };
}

export function createMatchSessionStore(db: AppDatabase): MatchSessionStore {
  return createStore<MatchSessionState>()((set) => ({
    status: "closed",
    ...EMPTY,
    openMatch(id) {
      try {
        const loaded = load(db, id);
        set(
          loaded === undefined
            ? { status: "notFound", ...EMPTY }
            : { status: "open", ...EMPTY, ...loaded },
        );
      } catch {
        // A read that throws shows the same "not found" screen, with no new text (T041).
        set({ status: "notFound", ...EMPTY });
      }
    },
    closeMatch() {
      set({ status: "closed", ...EMPTY });
    },
  }));
}
