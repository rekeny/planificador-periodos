// T098: properties over whole session sequences through the real session store, on a real in-memory
// database: taps, long presses and their menu choices, every answer to a question, undo, overtimes,
// format changes and a close-and-open of the match (RF-055, RF-057, RF-082, RF-086). It tests code
// that T062, T100, T097, T063 and T070 already wrote, so before the commit each property was seen
// failing with the store broken on purpose (the commit body says how). One property per test; the
// run count is the one of tests/setup/fast-check.ts and is never set here. The example
// scenarios are in match-session-store.sequences.test.ts.
import { assert, property } from "fast-check";
import { loadGridRecords } from "@/data/grid-repository";
import { cellExists } from "@/domain/grid";
import {
  mostStarters,
  savedGrid,
} from "../../tests/support/match-session-marks";
import {
  gridOf,
  modelOfHistory,
} from "../../tests/support/session-history-model";
import { sessionPlanArbitrary } from "../../tests/support/session-arbitraries";
import {
  reopenedStore,
  runPlan,
  type StepContext,
} from "../../tests/support/session-interpreter";

// No mark of the database is in a cell that does not exist: nothing wrote into a missing column.
function expectNoOrphanMarks({ session, after }: StepContext): void {
  const grid = gridOf(after);
  for (const mark of loadGridRecords(session.db, session.matchId)?.marks ??
    []) {
    const kind = mark.columnKind === "overtime" ? "overtime" : "period";
    const column = { kind, number: mark.columnNumber } as const;
    expect(cellExists(grid, { entryId: mark.callUpEntryId, column })).toBe(
      true,
    );
  }
}

describe("match session, random sequences of whole sessions", () => {
  it("RF-055: no sequence of session actions leaves a column with more than 5 X, in 4, 6 and 8 periods with 8 to 13 players", () => {
    assert(
      property(sessionPlanArbitrary, (plan) =>
        runPlan(plan, ({ session, after }) => {
          expect(mostStarters(gridOf(after))).toBeLessThanOrEqual(5);
          expect(
            mostStarters(savedGrid(session.db, session.matchId)),
          ).toBeLessThanOrEqual(5);
        }),
      ),
    );
  }, 300_000);

  it("RF-057 RF-082: after every action a new store opened on the same database reads exactly the grid the first one published", () => {
    assert(
      property(sessionPlanArbitrary, (plan) =>
        runPlan(plan, ({ session, after }) => {
          const fresh = reopenedStore(session).getState();
          expect(fresh.status).toBe("open");
          expect(fresh.grid).toEqual(after.grid);
          expect(after.saveFailed).toBe(false);
        }),
      ),
    );
  }, 300_000);

  it("RF-057 RF-086: after a format change or an overtime removal no undo writes into a cell that no longer exists, and each undo gives back exactly what the action replaced", () => {
    assert(
      property(sessionPlanArbitrary, (plan) => {
        const follow = modelOfHistory();
        runPlan(plan, (step) => {
          follow(step);
          expectNoOrphanMarks(step);
        });
      }),
    );
  }, 300_000);

  it("RF-057 RF-082: closing the match and opening it again empties the history and shows the grid that was saved", () => {
    assert(
      property(sessionPlanArbitrary, (plan) =>
        runPlan(plan, ({ action, session, before, after }) => {
          if (action.type !== "reopen") return;
          expect(after.status).toBe("open");
          expect(after.history).toEqual([]);
          expect(after.view?.canUndo).toBe(false);
          expect(after.pending).toBeNull();
          expect(after.grid).toEqual(savedGrid(session.db, session.matchId));
          expect(after.grid).toEqual(before.grid);
          expect(after.undo()).toEqual({ kind: "unchanged" });
        }),
      ),
    );
  }, 300_000);
});
