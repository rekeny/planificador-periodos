// Helpers of the undo tests of the match session (T052). This file holds no test calls. It adds to
// match-session-marks.ts without changing it. Expected API of the session store, on top of the T051
// one: undo(): SaveResult (synchronous, like tapCell, addOvertime and removeLastOvertime).
import {
  boolean,
  constant,
  integer,
  nat,
  oneof,
  tuple,
  type Arbitrary,
} from "fast-check";
import type { AppDatabase } from "@/data/database-types";
import type { ColumnKey } from "@/domain/column";
import {
  cellKey,
  type Cell,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import type { SaveResult } from "@/state/save-result";
import type { MatchSessionStore } from "./match-session-fixtures";
import {
  cellAt,
  savedMarks,
  savedOvertimes,
  type openedSession,
} from "./match-session-marks";

export type OpenedSession = ReturnType<typeof openedSession>;

/** A tap on the cell of the entry in that position of the call-up, in a column like "P3" or "OT1". */
export function tapAt(
  session: OpenedSession,
  row: number,
  key: ColumnKey,
): SaveResult {
  return session.store
    .getState()
    .tapCell(cellAt(session.entryIds[row] ?? 0, key));
}

/** What a user sees and what is saved, without the history: the state a tap changes and an undo restores. */
export function placed(
  store: MatchSessionStore,
  db: AppDatabase,
  matchId: number,
) {
  const { grid, warnings, view } = store.getState();
  return {
    grid,
    warnings,
    rows: view?.rows,
    columns: view?.columns,
    marks: savedMarks(db, matchId),
    overtimes: savedOvertimes(db, matchId),
  };
}

/** The same grid with one cell in the given state (what the test expects an undo to give). */
export function withCellState(
  grid: MatchGrid,
  cell: Cell,
  state: CellState,
): MatchGrid {
  const { [cellKey(cell)]: _old, ...rest } = grid.marks;
  return {
    ...grid,
    marks: state === "empty" ? rest : { ...rest, [cellKey(cell)]: state },
  };
}

/**
 * One step of a random sequence: `col` is a position in the drawn columns, -1 the last column. A
 * tap can leave a question pending (T062): `answer` tells the sequence to answer it (answerSub or
 * confirmRemove) when true, or to cancel it (cancelQuestion) when false.
 */
export type Step =
  | {
      readonly kind: "tap";
      readonly row: number;
      readonly col: number;
      readonly answer: boolean;
    }
  | { readonly kind: "add" }
  | { readonly kind: "remove" }
  | { readonly kind: "undo" };

export const stepArbitrary: Arbitrary<Step> = oneof(
  {
    weight: 10,
    // Few columns come up often, so columns reach 5 X and the circled X appears; -1 is the newest
    // overtime, so overtimes are marked, removed and created again many times.
    arbitrary: tuple(
      nat(7),
      oneof(
        integer({ min: 0, max: 2 }),
        integer({ min: 0, max: 11 }),
        constant(-1),
      ),
      boolean(),
    ).map(([row, col, answer]): Step => ({ kind: "tap", row, col, answer })),
  },
  { weight: 2, arbitrary: constant<Step>({ kind: "add" }) },
  { weight: 2, arbitrary: constant<Step>({ kind: "remove" }) },
  { weight: 5, arbitrary: constant<Step>({ kind: "undo" }) },
);

/** Runs the step through the store; `cell` is the cell a tap aimed at, null for the other steps. */
export function act(
  store: MatchSessionStore,
  step: Step,
): { result: SaveResult; cell: Cell | null } {
  const state = store.getState();
  if (step.kind === "add") return { result: state.addOvertime(), cell: null };
  if (step.kind === "remove") {
    return { result: state.removeLastOvertime(), cell: null };
  }
  if (step.kind === "undo") return { result: state.undo(), cell: null };
  const rows = state.view?.rows ?? [];
  const row = rows[step.row % rows.length];
  const cells = row?.cells ?? [];
  const at = step.col < 0 ? cells.length - 1 : step.col % cells.length;
  const cell = cells[at]?.cell;
  if (cell === undefined) throw new Error("The view has no cell to tap");
  return { result: state.tapCell(cell), cell };
}
