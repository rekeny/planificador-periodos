// T052: property over random sequences of taps, overtimes and undo through the session store
// (RF-055, RF-056, RF-057, RF-082, RF-086). It adds `undo` to the T051 property. Besides the limit
// of 5 X and "the database holds the published grid", the test keeps its own stack of what each tap
// replaced, pruned the way RF-086 says (an overtime removed takes its entries with it), and expects
// every undo to give exactly that, so an undo that touched a column created again would fail.
// Each run resets one in-memory database per format. Settings come from tests/setup/.
import { array, assert, constantFrom, property } from "fast-check";
import type { Format } from "@/domain/format";
import {
  cellState,
  type Cell,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import type { MatchSessionState } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";
import {
  mostStarters,
  openedSession,
  resetMatch,
  savedGrid,
} from "../../tests/support/match-session-marks";
import {
  act,
  stepArbitrary,
  withCellState,
  type Step,
} from "../../tests/support/match-session-undo";

/** What a saved tap replaced: the cell and the state undo must write back. */
interface Replaced {
  readonly cell: Cell;
  readonly prior: CellState;
}

interface Moment {
  readonly before: MatchGrid;
  readonly after: MatchGrid;
  readonly result: SaveResult;
  readonly cell: Cell | null;
}

const SESSIONS = {
  4: openedSession(8, [], { format: 4 }),
  6: openedSession(8, [], { format: 6 }),
  8: openedSession(8, [], { format: 8 }),
} as const;

function gridOf(state: MatchSessionState): MatchGrid {
  if (state.grid === null) throw new Error("The match is not open");
  return state.grid;
}

// A tap changes exactly the cell it aims at, or nothing (the questions arrive in D3).
function followTap(stack: Replaced[], { before, after, result, cell }: Moment) {
  if (cell === null) throw new Error("A tap has a cell");
  if (result.kind !== "saved") {
    expect(result.kind).toBe("unchanged");
    expect(after).toEqual(before);
    return;
  }
  const prior = cellState(before, cell);
  expect(cellState(after, cell)).not.toBe(prior);
  expect(after).toEqual(withCellState(before, cell, cellState(after, cell)));
  stack.push({ cell, prior });
}

function followOvertime(stack: Replaced[], kind: Step["kind"], m: Moment) {
  if (kind === "add") {
    expect(m.result.kind).toBe("saved");
    return;
  }
  const last = m.before.overtimeCount;
  expect(m.result.kind).toBe(last > 0 ? "saved" : "unchanged");
  // RF-086: the entries of the overtime that went away are gone, even if one comes back later.
  const kept = stack.filter(
    ({ cell }) =>
      !(cell.column.kind === "overtime" && cell.column.number === last),
  );
  stack.splice(0, stack.length, ...kept);
}

function followUndo(stack: Replaced[], { before, after, result }: Moment) {
  const top = stack.pop();
  if (top === undefined) {
    expect(result.kind).toBe("unchanged");
    expect(after).toEqual(before);
    return;
  }
  expect(result.kind).toBe("saved");
  expect(after).toEqual(withCellState(before, top.cell, top.prior));
}

function runSteps(format: Format, steps: readonly Step[]): void {
  const { store, db, matchId } = SESSIONS[format];
  resetMatch(db, matchId);
  store.getState().openMatch(matchId);
  const stack: Replaced[] = [];
  for (const step of steps) {
    const before = gridOf(store.getState());
    const { result, cell } = act(store, step);
    const state = store.getState();
    const after = gridOf(state);
    const moment = { before, after, result, cell };
    if (step.kind === "tap") followTap(stack, moment);
    else if (step.kind === "undo") followUndo(stack, moment);
    else followOvertime(stack, step.kind, moment);
    expect(mostStarters(after)).toBeLessThanOrEqual(5);
    expect(savedGrid(db, matchId)).toEqual(after);
    expect(state.saveFailed).toBe(false);
    expect(state.view?.columns).toHaveLength(format + after.overtimeCount);
    expect(state.history).toHaveLength(stack.length);
    expect(state.view?.canUndo).toBe(stack.length > 0);
  }
}

describe("match session, random sequences of taps, overtimes and undo", () => {
  it("RF-055 RF-056 RF-057 RF-082 RF-086: in 4, 6 and 8 periods no column ever has more than 5 X, the database holds exactly the published grid after every action, and every undo gives the state a tap replaced, never touching a column created again", () => {
    assert(
      property(
        constantFrom<Format>(4, 6, 8),
        array(stepArbitrary, { maxLength: 30 }),
        (format, steps) => runSteps(format, steps),
      ),
    );
  }, 180_000);
});
