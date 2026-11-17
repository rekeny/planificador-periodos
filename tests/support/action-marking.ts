// How the interpreter resolves a marking action against the grid as it is when it runs, and how the
// coach's answers settle the questions of the domain (T021, T080).
import { gridColumns, type Column } from "@/domain/column";
import { chooseCellMenuOption } from "@/domain/cell-menu";
import type { Cell, MatchGrid } from "@/domain/grid";
import {
  markSub,
  removeMark,
  replaceableStarters,
  replaceStarter,
  tapCell,
  type MarkingResult,
} from "@/domain/marking";
import type { MarkingAction, Reply, Target } from "./grid-arbitraries";
import { cellOfKey } from "./session-reference";

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

export interface Settled {
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

export function mark(action: MarkingAction, grid: MatchGrid): Settled {
  const cell = resolveTarget(grid, action.target);
  if (cell === undefined) return { grid, acted: [] };
  const result =
    action.type === "tap"
      ? tapCell(grid, cell)
      : chooseCellMenuOption(grid, cell, action.choice);
  return settle(grid, cell, result, action.reply);
}
