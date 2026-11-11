// The match grid: call-up entries as rows, periods and overtimes as columns (RF-019, RF-042, RF-043).
import {
  columnKey,
  gridColumns,
  type Column,
  type ColumnKey,
} from "@/domain/column";
import type { Format } from "@/domain/format";
import type { PlayerId } from "@/domain/squad";

export type CallUpEntryId = number;

export interface CallUpEntry {
  readonly id: CallUpEntryId; // one per stay in the call-up: a re-added player gets a new one
  readonly playerId: PlayerId;
  readonly name: string; //   as when the player entered the call-up (RF-019)
  readonly number: string;
}

export type CallUp = readonly CallUpEntry[];
export type Mark = "starter" | "sub"; // X and circled X
export type CellState = Mark | "empty";

export interface Cell {
  readonly entryId: CallUpEntryId;
  readonly column: Column;
}

export type CellKey = `${CallUpEntryId}:${ColumnKey}`;

export interface MatchGrid {
  readonly format: Format;
  readonly overtimeCount: number;
  readonly callUp: CallUp; // rows, sorted with comparePlayers (RF-042)
  readonly marks: Readonly<Partial<Record<CellKey, Mark>>>; // a missing key is an empty cell
}

export function cellKey(cell: Cell): CellKey {
  return `${cell.entryId}:${columnKey(cell.column)}`;
}

// A cell exists when its row is in the call-up and its column is in the grid.
export function cellExists(grid: MatchGrid, cell: Cell): boolean {
  const key = columnKey(cell.column);
  return (
    grid.callUp.some((entry) => entry.id === cell.entryId) &&
    gridColumns(grid.format, grid.overtimeCount).some(
      (column) => columnKey(column) === key,
    )
  );
}

// Exactly one of three states; a missing mark is an empty cell.
export function cellState(grid: MatchGrid, cell: Cell): CellState {
  return grid.marks[cellKey(cell)] ?? "empty";
}

function marksInColumn(grid: MatchGrid, column: Column, mark: Mark): number {
  return grid.callUp.filter(
    (entry) => cellState(grid, { entryId: entry.id, column }) === mark,
  ).length;
}

export function starterCount(grid: MatchGrid, column: Column): number {
  return marksInColumn(grid, column, "starter");
}

export function hasSub(grid: MatchGrid, column: Column): boolean {
  return marksInColumn(grid, column, "sub") > 0;
}
