// The session and the independent reference history of the action interpreter (T021, T080). Next to the
// real undo history, the reference tags every cell of an entry with the generation of its column, so the
// properties can tell a re-created row or column from an old one without trusting the code under test.
import { columnKey, gridColumns } from "@/domain/column";
import type { Cell, CellKey, CellState, MatchGrid } from "@/domain/grid";
import type { UndoEntry } from "@/domain/undo";
import type { Action } from "./grid-arbitraries";

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
