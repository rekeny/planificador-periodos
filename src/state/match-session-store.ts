import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import { listPlayers } from "@/data/player-repository";
import type { Cell, MatchGrid } from "@/domain/grid";
import type { UndoEntry } from "@/domain/undo";
import { evaluateWarnings, type Warnings } from "@/domain/warnings";
import { createCallUpActions } from "@/state/match-session-call-up";
import { createMarksActions } from "@/state/match-session-marks";
import { gridFromRecords } from "@/state/match-session-grid";
import { buildMatchView, type MatchView } from "@/state/match-view";
import type { SaveResult } from "@/state/save-result";

export interface MatchSessionState {
  readonly status: "closed" | "open" | "notFound";
  readonly grid: MatchGrid | null;
  readonly warnings: Warnings | null; // evaluateWarnings(grid) (RF-060)
  readonly view: MatchView | null; //    what the interface draws
  readonly history: readonly UndoEntry[]; // memory only (RF-057, RF-082)
  readonly saveFailed: boolean; //       RF-085
  openMatch(id: number): void;
  closeMatch(): void;
  addToCallUp(playerId: number): SaveResult; //       RF-032
  removeFromCallUp(entryId: number): SaveResult; //   RF-033, RF-034
  createPlayerInMatch(input: { name: string; number: string }): SaveResult; // RF-035
  tapCell(cell: Cell): SaveResult; //                 RF-044, RF-048, RF-049, RF-051
  addOvertime(): SaveResult; //                       RF-058
  removeLastOvertime(): SaveResult; //                RF-059
}

export type MatchSessionStore = StoreApi<MatchSessionState>;

const EMPTY = {
  grid: null,
  warnings: null,
  view: null,
  history: [],
  saveFailed: false,
} as const;

type Published = Pick<MatchSessionState, "grid" | "warnings" | "view"> & {
  readonly teamId: number;
};

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
  return { grid, warnings, view, teamId: records.match.teamId };
}

export function createMatchSessionStore(db: AppDatabase): MatchSessionStore {
  // The open match's team: the grid does not hold it and the call-up actions need it.
  let teamId: number | undefined;
  return createStore<MatchSessionState>()((set, get) => ({
    status: "closed",
    ...EMPTY,
    ...createCallUpActions({ db, get, set, teamId: () => teamId }),
    ...createMarksActions({ db, get, set, teamId: () => teamId }),
    openMatch(id) {
      try {
        const loaded = load(db, id);
        teamId = loaded?.teamId;
        set(
          loaded === undefined
            ? { status: "notFound", ...EMPTY }
            : {
                status: "open",
                ...EMPTY,
                grid: loaded.grid,
                warnings: loaded.warnings,
                view: loaded.view,
              },
        );
      } catch {
        // A read that throws shows the same "not found" screen, with no new text (T041).
        teamId = undefined;
        set({ status: "notFound", ...EMPTY });
      }
    },
    closeMatch() {
      teamId = undefined;
      set({ status: "closed", ...EMPTY });
    },
  }));
}
