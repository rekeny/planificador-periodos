import { assert, integer, property, tuple } from "fast-check";
import { MAX_STARTERS_PER_PERIOD } from "@/domain/format";
import { columnKey, gridColumns } from "@/domain/column";
import { cellKey, cellState } from "@/domain/grid";
import {
  changedKeys,
  runActions,
  mostStarters,
  type Step,
} from "../../tests/support/action-interpreter";
import {
  actionsArbitrary,
  fullColumnsGridArbitrary,
  gridArbitrary,
  markingActionArbitrary,
  marksAndUndosArbitrary,
  type Action,
} from "../../tests/support/grid-arbitraries";

describe("action properties: the limit of 5 X", () => {
  it("RF-055: no sequence of taps, menu choices, answers, undos and structure changes leaves a column with 6 X", () => {
    assert(
      property(gridArbitrary, actionsArbitrary(), (grid, actions) => {
        const { start, steps } = runActions(grid, actions);
        expect(mostStarters(start.grid)).toBeLessThanOrEqual(
          MAX_STARTERS_PER_PERIOD,
        );
        for (const step of steps)
          expect(mostStarters(step.after.grid)).toBeLessThanOrEqual(
            MAX_STARTERS_PER_PERIOD,
          );
      }),
    );
  });

  it("RF-055 RF-057: from columns with exactly 5 X, marks and many undos never reach 6 X", () => {
    assert(
      property(
        fullColumnsGridArbitrary,
        actionsArbitrary(marksAndUndosArbitrary),
        (grid, actions) => {
          const { steps } = runActions(grid, actions);
          for (const step of steps)
            expect(mostStarters(step.after.grid)).toBeLessThanOrEqual(
              MAX_STARTERS_PER_PERIOD,
            );
        },
      ),
    );
  });

  it("RF-055 RF-057: after any marks, pressing Undo more times than there are entries still leaves no column with 6 X", () => {
    assert(
      property(
        tuple(
          fullColumnsGridArbitrary,
          actionsArbitrary(markingActionArbitrary),
        ),
        integer({ min: 1, max: 50 }),
        ([grid, marks], undos) => {
          const { steps } = runActions(grid, [
            ...marks,
            ...Array.from({ length: undos }, (): Action => ({ type: "undo" })),
          ]);
          for (const step of steps)
            expect(mostStarters(step.after.grid)).toBeLessThanOrEqual(
              MAX_STARTERS_PER_PERIOD,
            );
        },
      ),
    );
  });
});

// A marking step: only the acted cells change, and only the tapped one may take an X (RF-054).
function expectMarkingStep({ before, after, acted }: Step): void {
  const [tapped, replaced] = acted;
  const actedKeys = acted.map(cellKey);
  const changed = changedKeys(before.grid, after.grid);
  expect(acted.length).toBeLessThanOrEqual(2);
  expect(after.grid.callUp).toEqual(before.grid.callUp);
  expect(after.grid.overtimeCount).toBe(before.grid.overtimeCount);
  expect(after.grid.format).toBe(before.grid.format);
  for (const key of changed) {
    expect(actedKeys).toContain(key);
    if (after.grid.marks[key] === "starter") {
      expect(key).toBe(tapped && cellKey(tapped));
    }
  }
  if (replaced && changed.length > 0) {
    expect(cellState(before.grid, replaced)).toBe("starter");
    expect(cellState(after.grid, replaced)).toBe("empty");
    expect(tapped && cellState(after.grid, tapped)).toBe("starter");
  }
}

describe("action properties: only the acted cells change", () => {
  it("RF-054: a tap or a menu choice changes only the tapped cell, or the two cells of a replacement, and never promotes a circled X", () => {
    assert(
      property(gridArbitrary, actionsArbitrary(), (grid, actions) => {
        for (const step of runActions(grid, actions).steps) {
          if (step.action.type === "tap" || step.action.type === "menu") {
            expectMarkingStep(step);
          }
        }
      }),
    );
  });

  it("RF-054: a change of structure only ever empties the cells of vanishing rows and columns, and never adds a mark", () => {
    assert(
      property(gridArbitrary, actionsArbitrary(), (grid, actions) => {
        for (const step of runActions(grid, actions).steps) {
          const kind = step.action.type;
          if (kind === "tap" || kind === "menu" || kind === "undo") continue;
          for (const key of changedKeys(step.before.grid, step.after.grid)) {
            expect(step.after.grid.marks[key]).toBeUndefined();
          }
        }
      }),
    );
  });
});

describe("action properties: no marks outside the grid", () => {
  it("RF-086 RF-057: after any action, every mark belongs to a row of the call-up and a column of the grid, so a re-created column or row comes back empty", () => {
    assert(
      property(gridArbitrary, actionsArbitrary(), (grid, actions) => {
        for (const { after } of runActions(grid, actions).steps) {
          const rows = new Set(after.grid.callUp.map((entry) => entry.id));
          const columns = new Set(
            gridColumns(after.grid.format, after.grid.overtimeCount).map(
              columnKey,
            ),
          );
          for (const key of Object.keys(after.grid.marks)) {
            expect(rows.has(Number(key.split(":")[0]))).toBe(true);
            expect(columns.has(key.split(":")[1] as never)).toBe(true);
          }
        }
      }),
    );
  });
});
