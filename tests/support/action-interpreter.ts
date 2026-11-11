// Applies a sequence of actions (tests/support/grid-arbitraries.ts) through the real domain functions, the
// way the app's store does (plan.md, "Undo"): the history gets an entry (`undoEntryFor`) after every
// action that changes marks, and `pruneHistory` runs right after every change that removes rows or columns.
//
// Next to the real history it keeps a reference one, built without `pruneHistory` or `cellExists`: every
// cell of an entry is tagged with the generation of its column, and a column that leaves the grid starts a
// new generation. Entry ids are never reused, so a re-added player is a new row. The reference says which
// cells an Undo may touch, so the properties can tell a re-created row or column from an old one without
// trusting the code under test.
import { columnKey, gridColumns, type Column } from "@/domain/column";
import { removeFromCallUp } from "@/domain/call-up";
import { chooseCellMenuOption } from "@/domain/cell-menu";
import { changeFormat } from "@/domain/format-change";
import {
  cellState,
  type Cell,
  type CellKey,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import {
  markSub,
  removeMark,
  replaceableStarters,
  replaceStarter,
  tapCell,
  type MarkingResult,
} from "@/domain/marking";
import { addOvertime, removeLastOvertime } from "@/domain/overtime";
import {
  pruneHistory,
  undoEntryFor,
  undoLast,
  type UndoEntry,
} from "@/domain/undo";
import type { Action, MarkingAction, Reply, Target } from "./grid-arbitraries";

// A cell of a reference entry: the state Undo restores, and the generation of its column when it was marked.
export interface ReferenceCell {
  readonly cell: Cell;
  readonly generation: number;
  readonly state: CellState;
}

export interface Session {
  readonly grid: MatchGrid;
  readonly history: readonly UndoEntry[]; //           the real one
  readonly reference: readonly (readonly ReferenceCell[])[]; // the independent one
  readonly generations: Readonly<Record<string, number>>; // by column key
  readonly nextEntryId: number;
}

export interface Step {
  readonly action: Action;
  readonly before: Session;
  readonly after: Session;
  // Marking actions: the tapped cell, and the replaced one when a starter was replaced.
  readonly acted: readonly Cell[];
  // Undo: the cells of the entry the reference says must be reverted, and its position; null: nothing live.
  readonly expectedUndo: {
    readonly index: number;
    readonly live: readonly ReferenceCell[];
  } | null;
}

export function startSession(grid: MatchGrid): Session {
  const ids = grid.callUp.map((entry) => entry.id);
  return {
    grid,
    history: [],
    reference: [],
    generations: {},
    nextEntryId: Math.max(0, ...ids) + 1,
  };
}

// ---- Reference helpers, also used by the properties ----

export function cellOfKey(key: string): Cell {
  const [entryId, column] = key.split(":");
  const number = Number(column?.replace(/^(P|OT)/, ""));
  const isOvertime = column?.startsWith("OT") === true;
  return {
    entryId: Number(entryId),
    column: { kind: isOvertime ? "overtime" : "period", number },
  };
}

// Every key whose state differs between the two grids.
export function changedKeys(before: MatchGrid, after: MatchGrid): CellKey[] {
  const keys = new Set([
    ...(Object.keys(before.marks) as CellKey[]),
    ...(Object.keys(after.marks) as CellKey[]),
  ]);
  return [...keys].filter(
    (key) => (before.marks[key] ?? "empty") !== (after.marks[key] ?? "empty"),
  );
}

export function isLive(session: Session, entry: ReferenceCell): boolean {
  const key = columnKey(entry.cell.column);
  return (
    session.grid.callUp.some((row) => row.id === entry.cell.entryId) &&
    gridColumns(session.grid.format, session.grid.overtimeCount).some(
      (column) => columnKey(column) === key,
    ) &&
    (session.generations[key] ?? 0) === entry.generation
  );
}

export function liveEntries(session: Session): number {
  return session.reference.filter((entry) =>
    entry.some((reference) => isLive(session, reference)),
  ).length;
}

export const startersByColumn = (grid: MatchGrid): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const [key, mark] of Object.entries(grid.marks)) {
    if (mark !== "starter") continue;
    const column = key.slice(key.indexOf(":") + 1);
    counts.set(column, (counts.get(column) ?? 0) + 1);
  }
  return counts;
};

export const mostStarters = (grid: MatchGrid): number =>
  Math.max(0, ...startersByColumn(grid).values());

// ---- Marking ----

function resolveTarget(grid: MatchGrid, target: Target): Cell | undefined {
  const rows = grid.callUp;
  const columns = gridColumns(grid.format, grid.overtimeCount);
  const row = rows[target.row % Math.max(rows.length, 1)];
  const marked = Object.keys(grid.marks);
  if (target.mode === "missing") {
    const column: Column = { kind: "overtime", number: grid.overtimeCount + 1 };
    return { entryId: row?.id ?? 0, column };
  }
  if (target.mode === "marked" && marked.length > 0) {
    return cellOfKey(marked[target.row % marked.length] ?? "");
  }
  if (row === undefined) return undefined;
  // "last": one of the three last columns, the ones an overtime removal or a smaller format takes away.
  const column =
    target.mode === "last"
      ? columns[columns.length - 1 - (target.col % Math.min(3, columns.length))]
      : columns[target.col % columns.length];
  return column && { entryId: row.id, column };
}

interface Settled {
  readonly grid: MatchGrid;
  readonly acted: readonly Cell[];
}

function replace(grid: MatchGrid, cell: Cell, pick: number): Settled {
  const options = replaceableStarters(grid, cell.column);
  const replaced = options[pick % Math.max(options.length, 1)];
  if (replaced === undefined) return { grid, acted: [cell] };
  const other: Cell = { entryId: replaced, column: cell.column };
  return { grid: replaceStarter(grid, cell, replaced), acted: [cell, other] };
}

// The coach's answer to what the domain asked (RF-045 to RF-047, RF-050, RF-053).
function settle(
  grid: MatchGrid,
  cell: Cell,
  result: MarkingResult,
  reply: Reply,
): Settled {
  const untouched = { grid, acted: [cell] };
  switch (result.kind) {
    case "changed":
      return { grid: result.grid, acted: [cell] };
    case "unchanged":
      return untouched;
    case "confirmRemoveStarter":
      return reply.confirm
        ? { grid: removeMark(grid, cell), acted: [cell] }
        : untouched;
    case "askSubOrStarter":
      if (reply.answer === "sub")
        return { grid: markSub(grid, cell), acted: [cell] };
      return reply.answer === "starter"
        ? replace(grid, cell, reply.pick)
        : untouched;
    case "chooseReplacedStarter":
      return reply.answer === "cancel"
        ? untouched
        : replace(grid, cell, reply.pick);
  }
}

function mark(action: MarkingAction, grid: MatchGrid): Settled {
  const cell = resolveTarget(grid, action.target);
  if (cell === undefined) return { grid, acted: [] };
  const result =
    action.type === "tap"
      ? tapCell(grid, cell)
      : chooseCellMenuOption(grid, cell, action.choice);
  return settle(grid, cell, result, action.reply);
}

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
    number: String(id % 100),
  };
  const grid = { ...session.grid, callUp: [...session.grid.callUp, entry] };
  return { ...session, grid, nextEntryId: id + 1 };
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
