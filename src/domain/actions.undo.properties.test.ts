import {
  assert,
  constant,
  array,
  constantFrom,
  integer,
  oneof,
  record,
  property,
} from "fast-check";
import { columnKey, gridColumns } from "@/domain/column";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import {
  cellKey,
  cellState,
  type CellState,
  type MatchGrid,
} from "@/domain/grid";
import { undoLast, type UndoEntry } from "@/domain/undo";
import {
  applyAction,
  changedKeys,
  liveEntries,
  runActions,
  mostStarters,
  startersByColumn,
  startSession,
  type Step,
} from "../../tests/support/action-interpreter";
import {
  actionsArbitrary,
  fullColumnsGridArbitrary,
  gridArbitrary,
  markingActionArbitrary,
  recreationActionsArbitrary,
  type Action,
} from "../../tests/support/grid-arbitraries";

// One undo step, judged by the reference history of tests/support/action-interpreter.ts: it reverts the
// live cells of the last entry that has any, touches nothing else, and only a sixth X may be left out.
function expectUndoStep(step: Step): void {
  const { before, after, expectedUndo } = step;
  const changed = changedKeys(before.grid, after.grid);
  expect(after.grid.format).toBe(before.grid.format);
  expect(after.grid.overtimeCount).toBe(before.grid.overtimeCount);
  expect(after.grid.callUp).toEqual(before.grid.callUp);
  if (expectedUndo === null) {
    expect(changed).toEqual([]);
    expect(after.history).toEqual([]);
    return;
  }
  const liveKeys = expectedUndo.live.map((live) => cellKey(live.cell));
  for (const key of changed) expect(liveKeys).toContain(key);
  for (const live of expectedUndo.live) {
    const restored = cellState(after.grid, live.cell);
    if (restored === live.state) continue;
    expect(live.state).toBe("starter");
    expect(cellState(before.grid, live.cell)).not.toBe("starter");
    // The only reason to leave an X out is a column that is already full.
    expect(startersByColumn(after.grid).get(columnKey(live.cell.column))).toBe(
      MAX_STARTERS_PER_PERIOD,
    );
  }
}

interface RawEntry {
  readonly row: number;
  readonly col: number;
  readonly missing: number; // 0: the cell of a row that is not in the call-up
  readonly state: CellState;
}

describe("action properties: Undo", () => {
  it("RF-057 RF-086: every Undo reverts the live cells of the last entry that has any, and nothing else", () => {
    assert(
      property(gridArbitrary, actionsArbitrary(), (grid, actions) => {
        for (const step of runActions(grid, actions).steps) {
          if (step.action.type === "undo") expectUndoStep(step);
          expect(step.after.history).toHaveLength(liveEntries(step.after));
        }
      }),
    );
  });

  it("RF-057 RF-086: Undo never writes into an overtime, a period or a row that was removed and created again", () => {
    assert(
      property(gridArbitrary, recreationActionsArbitrary, (grid, actions) => {
        for (const step of runActions(grid, actions).steps) {
          if (step.action.type === "undo") expectUndoStep(step);
          expect(step.after.history).toHaveLength(liveEntries(step.after));
        }
      }),
    );
  });

  it("RF-057: after marking, undoing every entry gives back the starting grid", () => {
    assert(
      property(
        gridArbitrary,
        actionsArbitrary(markingActionArbitrary),
        (grid, marks) => {
          const marked = runActions(grid, marks);
          const last =
            marked.steps[marked.steps.length - 1]?.after ?? marked.start;
          let session = last;
          for (let i = 0; i < last.history.length; i += 1) {
            session = applyAction(session, { type: "undo" }).after;
          }
          expect(session.grid).toEqual(grid);
          expect(session.history).toEqual([]);
        },
      ),
    );
  });

  it("RF-057: an empty sequence changes nothing", () => {
    assert(
      property(gridArbitrary, (grid) => {
        const { start, steps } = runActions(grid, []);
        expect(steps).toEqual([]);
        expect(start).toEqual(startSession(grid));
      }),
    );
  });

  it("RF-057 RF-086: Undo pressed alone, any number of times, has nothing to undo and changes nothing", () => {
    assert(
      property(
        gridArbitrary,
        actionsArbitrary(constant<Action>({ type: "undo" })),
        (grid, actions) => {
          for (const step of runActions(grid, actions).steps) {
            expect(step.after.grid).toEqual(grid);
            expect(step.after.history).toEqual([]);
          }
        },
      ),
    );
  });

  // The guard against a sixth X must hold for any history, even one that does not match the grid (marks
  // changed outside Undo): the property builds entries from random cells, some of them missing.
  it("RF-055 RF-057 RF-086: Undo with a history that does not match the grid never leaves a column with 6 X", () => {
    const rolls = integer({ min: 0, max: 99 });
    const histories = array(
      array(
        record({
          row: rolls,
          col: rolls,
          missing: integer({ min: 0, max: 9 }),
          state: constantFrom<CellState>("starter", "starter", "sub", "empty"),
        }),
        { minLength: 1, maxLength: 6 },
      ),
      { maxLength: 8 },
    );
    const entriesOf = (grid: MatchGrid, history: RawEntry[][]): UndoEntry[] =>
      history.map((entry) =>
        entry.map(({ row, col, missing, state }) => {
          const columns = gridColumns(grid.format, grid.overtimeCount);
          const owner = grid.callUp[row % Math.max(grid.callUp.length, 1)];
          return {
            cell: {
              entryId: missing === 0 ? 9999 : (owner?.id ?? 9999),
              column: columns[col % columns.length] ?? {
                kind: "period",
                number: 1,
              },
            },
            state,
          };
        }),
      );
    assert(
      property(
        oneof(gridArbitrary, fullColumnsGridArbitrary),
        histories,
        (grid, raw) => {
          let current = grid;
          let history = entriesOf(grid, raw);
          for (let press = 0; press <= history.length; press += 1) {
            const result = undoLast(current, history);
            expect(mostStarters(result.grid)).toBeLessThanOrEqual(
              MAX_STARTERS_PER_PERIOD,
            );
            current = result.grid;
            history = [...result.history];
          }
        },
      ),
    );
  });
});
