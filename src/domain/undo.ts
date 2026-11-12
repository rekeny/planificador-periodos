// Undo history: what each action changed and how to revert it (RF-055, RF-057, RF-086).
import {
  cellExists,
  cellKey,
  cellState,
  type Cell,
  type CellKey,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";

export interface CellChange {
  readonly cell: Cell;
  readonly state: CellState; // the state to write
}

export type UndoEntry = readonly CellChange[]; // the previous states of the cells one action changed

export interface UndoResult {
  readonly grid: MatchGrid;
  readonly history: readonly UndoEntry[];
  readonly changes: readonly CellChange[]; // what to save; empty when nothing was left to undo
}

// Every cell of either grid, once, in a stable order.
function allCells(before: MatchGrid, after: MatchGrid): readonly Cell[] {
  const cells = new Map<CellKey, Cell>();
  for (const grid of [before, after]) {
    for (const key of Object.keys(grid.marks) as CellKey[]) {
      const [entryId, column] = key.split(":");
      const number = Number(column?.replace(/^(P|OT)/, ""));
      cells.set(key, {
        entryId: Number(entryId),
        column: column?.startsWith("OT")
          ? { kind: "overtime", number }
          : { kind: "period", number },
      });
    }
  }
  return [...cells.values()];
}

// The cells whose state differs, each with the state `to` has.
function differences(
  from: MatchGrid,
  to: MatchGrid,
  stateOf: MatchGrid,
): readonly CellChange[] {
  return allCells(from, to)
    .filter((cell) => cellState(from, cell) !== cellState(to, cell))
    .map((cell) => ({ cell, state: cellState(stateOf, cell) }));
}

export function cellChanges(
  before: MatchGrid,
  after: MatchGrid,
): readonly CellChange[] {
  return differences(before, after, after);
}

export function undoEntryFor(before: MatchGrid, after: MatchGrid): UndoEntry {
  return differences(before, after, before);
}

export function pruneHistory(
  history: readonly UndoEntry[],
  grid: MatchGrid,
): readonly UndoEntry[] {
  return history
    .map((entry) => entry.filter((change) => cellExists(grid, change.cell)))
    .filter((entry) => entry.length > 0);
}

function withState(grid: MatchGrid, cell: Cell, state: CellState): MatchGrid {
  const { [cellKey(cell)]: _removed, ...rest } = grid.marks;
  return {
    ...grid,
    marks: state === "empty" ? rest : { ...rest, [cellKey(cell)]: state },
  };
}

function startersIn(grid: MatchGrid, cell: Cell): number {
  return grid.callUp.filter(
    (entry) =>
      cellState(grid, { entryId: entry.id, column: cell.column }) === "starter",
  ).length;
}

// Applies the entry as one net result: non-X states first, so that an X freed by the
// entry makes room for the X it restores; an X that still does not fit is skipped.
function revert(
  grid: MatchGrid,
  entry: UndoEntry,
): { grid: MatchGrid; changes: readonly CellChange[] } {
  const ordered = [
    ...entry.filter((change) => change.state !== "starter"),
    ...entry.filter((change) => change.state === "starter"),
  ];
  let current = grid;
  const changes: CellChange[] = [];
  for (const change of ordered) {
    const isNewStarter =
      change.state === "starter" &&
      cellState(current, change.cell) !== "starter";
    if (
      isNewStarter &&
      startersIn(current, change.cell) >= MAX_STARTERS_PER_PERIOD
    ) {
      continue;
    }
    if (cellState(current, change.cell) === change.state) continue;
    current = withState(current, change.cell, change.state);
    changes.push(change);
  }
  return { grid: current, changes };
}

export function undoLast(
  grid: MatchGrid,
  history: readonly UndoEntry[],
): UndoResult {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = (history[index] ?? []).filter((change) =>
      cellExists(grid, change.cell),
    );
    if (entry.length === 0) continue;
    const reverted = revert(grid, entry);
    return {
      grid: reverted.grid,
      history: history.slice(0, index),
      changes: reverted.changes,
    };
  }
  return { grid, history: [], changes: [] };
}
