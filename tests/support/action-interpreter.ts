// Applies a sequence of actions (tests/support/grid-arbitraries.ts) through the real domain functions, the
// way the app's store does (plan.md, "Undo"): the history gets an entry (`undoEntryFor`) after every
// action that changes marks, and `pruneHistory` runs right after every change that removes rows or columns.
//
// Next to the real history it keeps a reference one, built without `pruneHistory` or `cellExists`: every
// cell of an entry is tagged with the generation of its column, and a column that leaves the grid starts a
// new generation. Entry ids are never reused, so a re-added player is a new row. The reference says which
// cells an Undo may touch, so the properties can tell a re-created row or column from an old one without
// trusting the code under test.
//
// The code lives in session-reference.ts, action-marking.ts and this file (T080, 250-line limit); this
// file keeps the old path and the exported names.
import { columnKey, gridColumns } from "@/domain/column";
import { addToCallUp, removeFromCallUp } from "@/domain/call-up";
import { changeFormat } from "@/domain/format-change";
import { cellState, type MatchGrid } from "@/domain/grid";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import { pruneHistory, undoEntryFor, undoLast } from "@/domain/undo";
import type { Action } from "./grid-arbitraries";
import { mark } from "./action-marking";
import {
  cellOfKey,
  changedKeys,
  isLive,
  startSession,
  type ReferenceCell,
  type Session,
  type Step,
} from "./session-reference";

export {
  cellOfKey,
  changedKeys,
  isLive,
  liveEntries,
  mostStarters,
  startersByColumn,
  startSession,
} from "./session-reference";
export type { ReferenceCell, Session, Step } from "./session-reference";

// ---- Steps ----

function afterMarks(session: Session, grid: MatchGrid): Session {
  const keys = changedKeys(session.grid, grid);
  if (keys.length === 0) return { ...session, grid };
  const entry: ReferenceCell[] = keys.map((key) => {
    const cell = cellOfKey(key);
    return {
      cell,
      generation: session.generations[columnKey(cell.column)] ?? 0,
      state: cellState(session.grid, cell),
    };
  });
  return {
    ...session,
    grid,
    history: [...session.history, undoEntryFor(session.grid, grid)],
    reference: [...session.reference, entry],
  };
}

// A column that is gone starts a new generation: if it comes back, it is a new column.
function afterRemoving(session: Session, grid: MatchGrid): Session {
  const now = new Set(
    gridColumns(grid.format, grid.overtimeCount).map(columnKey),
  );
  const generations = { ...session.generations };
  for (const column of gridColumns(
    session.grid.format,
    session.grid.overtimeCount,
  )) {
    const key = columnKey(column);
    if (!now.has(key)) generations[key] = (generations[key] ?? 0) + 1;
  }
  return {
    ...session,
    grid,
    generations,
    history: pruneHistory(session.history, grid),
  };
}

function undo(session: Session): Pick<Step, "after" | "expectedUndo"> {
  let expectedUndo: Step["expectedUndo"] = null;
  for (
    let index = session.reference.length - 1;
    index >= 0 && !expectedUndo;
    index -= 1
  ) {
    const live = (session.reference[index] ?? []).filter((cell) =>
      isLive(session, cell),
    );
    if (live.length > 0) expectedUndo = { index, live };
  }
  const result = undoLast(session.grid, session.history);
  const reference = session.reference.slice(0, expectedUndo?.index ?? 0);
  return {
    after: {
      ...session,
      grid: result.grid,
      history: result.history,
      reference,
    },
    expectedUndo,
  };
}

function addPlayer(session: Session): Session {
  const id = session.nextEntryId;
  const entry = {
    id,
    playerId: 1000 + id,
    name: `Added ${id}`,
    number: String(id % 12), // repeats on purpose: equal numbers and mid-grid insertions
  };
  return {
    ...session,
    grid: addToCallUp(session.grid, entry),
    nextEntryId: id + 1,
  };
}

export function applyAction(before: Session, action: Action): Step {
  const base = { action, before, acted: [], expectedUndo: null };
  const { grid } = before;
  switch (action.type) {
    case "tap":
    case "menu": {
      const settled = mark(action, grid);
      return {
        ...base,
        after: afterMarks(before, settled.grid),
        acted: settled.acted,
      };
    }
    case "undo":
      return { ...base, ...undo(before) };
    case "addOvertime":
      return { ...base, after: { ...before, grid: addOvertime(grid) } };
    case "removeOvertime":
      return {
        ...base,
        after: afterRemoving(before, removeLastOvertime(grid)),
      };
    case "changeFormat":
      return {
        ...base,
        after: afterRemoving(before, changeFormat(grid, action.format)),
      };
    case "removePlayer": {
      const row = grid.callUp[action.row % Math.max(grid.callUp.length, 1)];
      if (row === undefined) return { ...base, after: before };
      return {
        ...base,
        after: afterRemoving(before, removeFromCallUp(grid, row.id)),
      };
    }
    case "addPlayer":
      return { ...base, after: addPlayer(before) };
  }
}

export function runActions(
  start: MatchGrid,
  actions: readonly Action[],
): { readonly start: Session; readonly steps: readonly Step[] } {
  const first = startSession(start);
  const steps: Step[] = [];
  let session = first;
  for (const action of actions) {
    const step = applyAction(session, action);
    steps.push(step);
    session = step.after;
  }
  return { start: first, steps };
}
