// RF-086: the history the coach should have after each step of a session (T098), kept by the rule
// alone and checked against what the store published. Every saved mark change adds an entry, a
// removed overtime or a format change takes out the entries of columns that went away, an undo
// takes the last one and closing the match empties it. Undo never brings back a column, so a
// column created again is clean. This file holds no test calls.
import {
  cellExists,
  cellState,
  type Cell,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import type { MatchSessionState } from "@/state/match-session-store";
import { cellOfKey, changedKeys } from "./action-interpreter";
import { withCellState } from "./match-session-undo";
import type { StepContext } from "./session-interpreter";

/** What a mark-changing step replaced: each cell and the state undo must write back (RF-057). */
type Replaced = readonly { readonly cell: Cell; readonly prior: CellState }[];

const MARKING = [
  "tapCell",
  "answerSub",
  "chooseReplaced",
  "confirmRemove",
  "chooseCellMenuOption",
];

export function gridOf(state: MatchSessionState): MatchGrid {
  if (state.grid === null) throw new Error("The match is not open");
  return state.grid;
}

function replacedBy({ before, after }: StepContext): Replaced {
  const [from, to] = [gridOf(before), gridOf(after)];
  return changedKeys(from, to).map((key) => {
    const cell = cellOfKey(key);
    return { cell, prior: cellState(from, cell) };
  });
}

function expectUndone(
  top: Replaced | undefined,
  { before, after }: StepContext,
) {
  expect(top).toBeDefined();
  const expected = (top ?? []).reduce(
    (grid, { cell, prior }) => withCellState(grid, cell, prior),
    gridOf(before),
  );
  expect(gridOf(after)).toEqual(expected);
}

function pruned(stack: readonly Replaced[], grid: MatchGrid): Replaced[] {
  return stack
    .map((entry) => entry.filter(({ cell }) => cellExists(grid, cell)))
    .filter((entry) => entry.length > 0);
}

export function modelOfHistory(): (step: StepContext) => void {
  let stack: Replaced[] = [];
  return (step) => {
    const { action, result, before, after } = step;
    const saved = result.kind === "saved";
    if (action.type === "reopen") stack = [];
    else if (action.type === "undo" && saved) expectUndone(stack.pop(), step);
    else if (action.type === "undo") {
      // Nothing happens only with nothing to undo, or while a question is open (D3-7).
      expect(stack.length === 0 || before.pending !== null).toBe(true);
      expect(after.grid).toEqual(before.grid);
    } else if (MARKING.includes(action.type) && saved) {
      const entry = replacedBy(step);
      expect(entry.length).toBeGreaterThan(0);
      stack.push(entry);
    } else if (
      saved &&
      (action.type === "changeFormat" || action.type === "removeLastOvertime")
    ) {
      stack = pruned(stack, gridOf(after));
    }
    expect(after.history).toHaveLength(stack.length);
    expect(after.view?.canUndo).toBe(stack.length > 0);
  };
}
