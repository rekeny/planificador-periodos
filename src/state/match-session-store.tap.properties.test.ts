// T051: property over random sequences through the session store (RF-055, RF-056, RF-082). `undo`
// joins the sequences in T052, when the store gets it. Each run resets one in-memory database per
// format, so a thousand runs do not migrate a thousand databases. Settings come from tests/setup/.
import {
  array,
  assert,
  constant,
  constantFrom,
  integer,
  nat,
  oneof,
  property,
  tuple,
  type Arbitrary,
} from "fast-check";
import type { Format } from "@/domain/format";
import type { MatchSessionStore } from "../../tests/support/match-session-fixtures";
import {
  mostStarters,
  openedSession,
  resetMatch,
  savedGrid,
} from "../../tests/support/match-session-marks";

type Step =
  | { readonly kind: "tap"; readonly row: number; readonly col: number }
  | { readonly kind: "add" }
  | { readonly kind: "remove" };

const stepArbitrary: Arbitrary<Step> = oneof(
  {
    weight: 10,
    // Few columns come up often, so columns reach 5 X and the circled X appears.
    arbitrary: tuple(
      nat(7),
      oneof(integer({ min: 0, max: 2 }), integer({ min: 0, max: 11 })),
    ).map(([row, col]): Step => ({ kind: "tap", row, col })),
  },
  { weight: 1, arbitrary: constant<Step>({ kind: "add" }) },
  { weight: 1, arbitrary: constant<Step>({ kind: "remove" }) },
);

const SESSIONS = {
  4: openedSession(8, [], { format: 4 }),
  6: openedSession(8, [], { format: 6 }),
  8: openedSession(8, [], { format: 8 }),
} as const;

function act(store: MatchSessionStore, step: Step) {
  const state = store.getState();
  if (step.kind === "add") return state.addOvertime();
  if (step.kind === "remove") return state.removeLastOvertime();
  const rows = state.view?.rows ?? [];
  const row = rows[step.row % rows.length];
  const cell = row?.cells[step.col % (row?.cells.length ?? 1)]?.cell;
  if (cell === undefined) throw new Error("The view has no cell to tap");
  return state.tapCell(cell);
}

function runSteps(format: Format, steps: readonly Step[]): void {
  const { store, db, matchId } = SESSIONS[format];
  resetMatch(db, matchId);
  store.getState().openMatch(matchId);
  for (const step of steps) {
    const before = store.getState();
    const result = act(store, step);
    const after = store.getState();
    const grid = after.grid ?? savedGrid(db, matchId);
    expect(mostStarters(grid)).toBeLessThanOrEqual(5);
    expect(savedGrid(db, matchId)).toEqual(grid);
    expect(after.saveFailed).toBe(false);
    expect(after.view?.columns).toHaveLength(format + grid.overtimeCount);
    if (step.kind === "add") {
      expect(result.kind).toBe("saved");
      expect(after.history).toEqual(before.history);
    } else if (step.kind === "remove") {
      expect(result.kind).toBe(
        before.grid?.overtimeCount ? "saved" : "unchanged",
      );
      expect(after.history.length).toBeLessThanOrEqual(before.history.length);
    } else if (result.kind === "saved") {
      expect(grid).not.toEqual(before.grid);
      expect(after.history).toHaveLength(before.history.length + 1);
    } else {
      expect(result.kind).toBe("unchanged");
      expect(grid).toEqual(before.grid);
      expect(after.history).toEqual(before.history);
    }
  }
}

describe("match session, random sequences of taps and overtimes", () => {
  it("RF-055 RF-056 RF-082: in 4, 6 and 8 periods no column ever has more than 5 X, and after every action the database holds exactly the published grid", () => {
    assert(
      property(
        constantFrom<Format>(4, 6, 8),
        array(stepArbitrary, { maxLength: 30 }),
        (format, steps) => runSteps(format, steps),
      ),
    );
  }, 180_000);
});
