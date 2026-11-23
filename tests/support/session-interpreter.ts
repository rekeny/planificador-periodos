// Runs the actions of tests/support/session-arbitraries.ts through the real session store on a real
// in-memory database (T098). One database per format and call-up size is made when first needed and
// reset before each run, so a thousand runs do not migrate a thousand databases. This file holds
// no test calls.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import type { Column } from "@/domain/column";
import { cellState, type Cell } from "@/domain/grid";
import type { Format } from "@/domain/format";
import {
  createMatchSessionStore,
  type MatchSessionState,
} from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";
import type { MatchSessionStore } from "./match-session-fixtures";
import { openedSession } from "./match-session-marks";
import {
  LAST_COLUMN,
  MISSING_CELL,
  type SessionAction,
  type SessionPlan,
} from "./session-arbitraries";

export interface SessionHandle {
  readonly store: MatchSessionStore;
  readonly db: AppDatabase;
  readonly matchId: number;
}

const UNCHANGED: SaveResult = { kind: "unchanged" };
const NO_SUCH_ENTRY = 987_654;
const cache = new Map<string, SessionHandle>();

/** The match as created, in the given format and with that many players, and opened in a store. */
export function startedSession(format: Format, players: number): SessionHandle {
  const key = `${format}:${players}`;
  const session = cache.get(key) ?? openedSession(players, [], { format });
  cache.set(key, session);
  const { db, matchId, store } = session;
  db.run(sql`DELETE FROM marks`);
  db.run(
    sql`UPDATE matches SET overtime_count = 0, format = ${format} WHERE id = ${matchId}`,
  );
  store.getState().openMatch(matchId);
  return { store, db, matchId };
}

/** A new store on the same database with the match opened: what the device holds after a restart. */
export function reopenedStore(session: SessionHandle): MatchSessionStore {
  const store = createMatchSessionStore(session.db);
  store.getState().openMatch(session.matchId);
  return store;
}

function cellOf(
  store: MatchSessionStore,
  row: number,
  col: number,
): Cell | undefined {
  const { view } = store.getState();
  const rows = view?.rows ?? [];
  const aimed = rows[row % Math.max(rows.length, 1)];
  if (col === MISSING_CELL) {
    // Half of them name an entry that is not in the call-up, half a period that does not exist.
    return row % 2 === 0
      ? { entryId: NO_SUCH_ENTRY, column: { kind: "period", number: 1 } }
      : {
          entryId: aimed?.entryId ?? NO_SUCH_ENTRY,
          column: { kind: "period", number: 9 },
        };
  }
  const cells = aimed?.cells ?? [];
  const at = col === LAST_COLUMN ? cells.length - 1 : col % cells.length;
  return cells[at]?.cell;
}

// The entry chooseReplaced is called with, relative to the column of the question that is open.
function replacedEntry(
  store: MatchSessionStore,
  pick: "inColumn" | "outOfColumn" | "missing",
  roll: number,
): number {
  const { grid, pending } = store.getState();
  if (pick === "missing" || grid === null) return NO_SUCH_ENTRY;
  const column: Column = pending?.cell.column ?? { kind: "period", number: 1 };
  const wanted = pick === "inColumn" ? "starter" : "empty";
  const entries = grid.callUp.filter(
    (entry) =>
      (cellState(grid, { entryId: entry.id, column }) === "starter") ===
      (wanted === "starter"),
  );
  return entries[roll % Math.max(entries.length, 1)]?.id ?? NO_SUCH_ENTRY;
}

/** Runs one action. The result is "unchanged" for the actions that return nothing. */
export function runSessionAction(
  session: SessionHandle,
  action: SessionAction,
): SaveResult {
  const { store, matchId } = session;
  const state = store.getState();
  switch (action.type) {
    case "tapCell":
    case "openCellMenu": {
      const cell = cellOf(store, action.row, action.col);
      if (cell === undefined) throw new Error("The view has no cell to aim at");
      return state[action.type](cell);
    }
    case "chooseCellMenuOption":
      return state.chooseCellMenuOption(action.choice);
    case "chooseReplaced":
      return state.chooseReplaced(
        replacedEntry(store, action.pick, action.roll),
      );
    case "changeFormat":
      return state.changeFormat(action.format);
    case "cancelQuestion":
      state.cancelQuestion();
      return UNCHANGED;
    case "reopen":
      state.closeMatch();
      store.getState().openMatch(matchId);
      return UNCHANGED;
    default:
      return state[action.type]();
  }
}

/** What a check sees after each action: the action, what it returned, and the state around it. */
export interface StepContext {
  readonly session: SessionHandle;
  readonly action: SessionAction;
  readonly result: SaveResult;
  readonly before: MatchSessionState;
  readonly after: MatchSessionState;
}

/** Runs a whole plan from a match as created and gives every step to `check`. */
export function runPlan(
  { format, players, actions }: SessionPlan,
  check: (step: StepContext) => void,
): void {
  const session = startedSession(format, players);
  for (const action of actions) {
    const before = session.store.getState();
    const result = runSessionAction(session, action);
    check({ session, action, result, before, after: session.store.getState() });
  }
}
