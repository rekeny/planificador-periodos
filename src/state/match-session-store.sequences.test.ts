// T098: the example scenarios of whole session sequences through the real session store, on a real
// in-memory database (RF-040, RF-045 to RF-047, RF-055, RF-057, RF-082, RF-086, E-011, E-016). Each
// scenario is a list of the same actions the properties draw at random, so a shrunk counterexample
// of a property can be copied here as a plain test. Rows are positions of the call-up.
import type { Format } from "@/domain/format";
import { cellState, type MatchGrid } from "@/domain/grid";
import {
  mostStarters,
  savedGrid,
  savedMarks,
} from "../../tests/support/match-session-marks";
import {
  MISSING_CELL,
  type SessionAction,
} from "../../tests/support/session-arbitraries";
import {
  reopenedStore,
  runSessionAction,
  startedSession,
  type SessionHandle,
} from "../../tests/support/session-interpreter";

const SAVED = { kind: "saved" } as const;
const UNCHANGED = { kind: "unchanged" } as const;

const tap = (row: number, col: number): SessionAction => ({
  type: "tapCell",
  row,
  col,
});
const replace = (roll = 0): SessionAction => ({
  type: "chooseReplaced",
  pick: "inColumn",
  roll,
});
const answer = (type: "answerSub" | "answerStarter"): SessionAction => ({
  type,
});

/** Runs the actions in order and returns what each one returned. */
function play(session: SessionHandle, ...actions: SessionAction[]) {
  return actions.map((action) => runSessionAction(session, action));
}

/** The first `count` rows get an X in the column. */
const fill = (count: number, col: number): SessionAction[] =>
  Array.from({ length: count }, (_, row) => tap(row, col));

function gridOf(session: SessionHandle): MatchGrid {
  const { grid } = session.store.getState();
  if (grid === null) throw new Error("The match is not open");
  return grid;
}

function stateOf(session: SessionHandle, row: number, col: number) {
  const cell = session.store.getState().view?.rows[row]?.cells[col]?.cell;
  if (cell === undefined) throw new Error("No such cell");
  return cellState(gridOf(session), cell);
}

/** What the first store published is what a new store on the same database reads, and what is saved. */
function expectSaved(session: SessionHandle): void {
  const grid = gridOf(session);
  expect(grid).toEqual(reopenedStore(session).getState().grid);
  expect(grid).toEqual(savedGrid(session.db, session.matchId));
  expect(mostStarters(grid)).toBeLessThanOrEqual(5);
}

describe("match session, example sequences", () => {
  it("RF-045 RF-046 RF-047 RF-055 RF-057 RF-082 E-011: fill P1, answer sub, replace a starter and undo twice: never more than 5 X, and the database matches the view", () => {
    const session = startedSession(6, 9);
    const { store } = session;
    expect(play(session, ...fill(5, 0))).toEqual(Array(5).fill(SAVED));
    expect(play(session, tap(5, 0), answer("answerSub"))).toEqual([
      UNCHANGED,
      SAVED,
    ]);
    expect(stateOf(session, 5, 0)).toBe("sub");
    expect(
      play(session, tap(6, 0), answer("answerStarter"), replace()),
    ).toEqual([UNCHANGED, UNCHANGED, SAVED]);
    expect(stateOf(session, 6, 0)).toBe("starter");
    expect(stateOf(session, 0, 0)).toBe("empty");
    expectSaved(session);
    expect(play(session, { type: "undo" })).toEqual([SAVED]);
    expect(stateOf(session, 0, 0)).toBe("starter");
    expect(stateOf(session, 6, 0)).toBe("empty");
    expectSaved(session);
    expect(play(session, { type: "undo" })).toEqual([SAVED]);
    expect(stateOf(session, 5, 0)).toBe("empty");
    expect(store.getState().history).toHaveLength(5);
    expectSaved(session);
  });

  it.each([
    [4, 3],
    [6, 5],
    [8, 6],
  ] satisfies [Format, number][])(
    "RF-047 RF-055 RF-053 E-011: %i periods, exactly 5 X in each of the %i periods of the rule window, then «Titular en lugar de otro» in each: still 5 X",
    (format, windowPeriods) => {
      const session = startedSession(format, 10);
      for (let col = 0; col < windowPeriods; col += 1) {
        play(session, ...fill(5, col));
        expect(mostStarters(gridOf(session))).toBe(5);
      }
      for (let col = 0; col < windowPeriods; col += 1) {
        const results = play(
          session,
          tap(5, col),
          answer("answerStarter"),
          replace(4),
        );
        expect(results[2]).toEqual(SAVED);
        expect(stateOf(session, 5, col)).toBe("starter");
        expect(stateOf(session, 4, col)).toBe("empty");
        expect(mostStarters(gridOf(session))).toBe(5);
        expectSaved(session);
      }
    },
  );

  it("RF-044 RF-055: marks that break the rule window are never blocked, only a sixth X in a period is refused", () => {
    const session = startedSession(6, 9);
    // The first player plays all 5 periods of the window: a breach, saved without a word.
    expect(play(session, ...[0, 1, 2, 3, 4].map((col) => tap(0, col)))).toEqual(
      Array(5).fill(SAVED),
    );
    expect(session.store.getState().warnings?.playersInRed.size).toBe(1);
    play(session, ...fill(5, 0).slice(1));
    expect(play(session, tap(5, 0))).toEqual([UNCHANGED]);
    expect(session.store.getState().pending?.kind).toBe("subOrStarter");
    expect(stateOf(session, 5, 0)).toBe("empty");
    expect(play(session, answer("answerStarter"))).toEqual([UNCHANGED]);
    expect(
      play(session, { type: "chooseReplaced", pick: "outOfColumn", roll: 0 }),
    ).toEqual([UNCHANGED]);
    expect(stateOf(session, 5, 0)).toBe("empty");
    expect(mostStarters(gridOf(session))).toBe(5);
    expectSaved(session);
  });

  it("RF-045 RF-047 RF-052 RF-055: odd data: an entry with no X, a missing entry, answers with nothing pending and long presses on empty cells change nothing", () => {
    const session = startedSession(6, 9);
    const { store } = session;
    play(session, ...fill(5, 1));
    const untouched = gridOf(session);
    const asleep = play(
      session,
      answer("answerSub"),
      answer("answerStarter"),
      { type: "confirmRemove" },
      replace(),
      { type: "chooseCellMenuOption", choice: "remove" },
      { type: "openCellMenu", row: 8, col: 1 },
      tap(0, MISSING_CELL),
      tap(1, MISSING_CELL),
      { type: "removeLastOvertime" },
    );
    expect(asleep).toEqual(Array(9).fill(UNCHANGED));
    expect(gridOf(session)).toEqual(untouched);
    expect(store.getState().pending).toBeNull();
    play(session, tap(7, 1), answer("answerStarter"));
    const before = store.getState().grid;
    expect(
      play(
        session,
        { type: "chooseReplaced", pick: "outOfColumn", roll: 0 },
        { type: "chooseReplaced", pick: "missing", roll: 0 },
      ),
    ).toEqual([UNCHANGED, UNCHANGED]);
    expect(store.getState().grid).toEqual(before);
    expect(store.getState().pending?.kind).toBe("chooseReplaced");
    expectSaved(session);
  });

  it("RF-040 RF-057 RF-086 E-016: 8 to 4 to 8 periods between marks and undos: no mark of P5 to P8 comes back, in the grid or in the database", () => {
    const session = startedSession(8, 9);
    const { store, db, matchId } = session;
    play(session, tap(0, 0), tap(1, 5), tap(2, 7));
    expect(play(session, { type: "changeFormat", format: 4 })).toEqual([SAVED]);
    expect(store.getState().history).toHaveLength(1);
    expect(play(session, { type: "changeFormat", format: 8 })).toEqual([SAVED]);
    expect(stateOf(session, 1, 5)).toBe("empty");
    expect(stateOf(session, 2, 7)).toBe("empty");
    expect(play(session, { type: "undo" }, { type: "undo" })).toEqual([
      SAVED,
      UNCHANGED,
    ]);
    expect(store.getState().grid?.marks).toEqual({});
    expect(savedMarks(db, matchId)).toEqual([]);
    expectSaved(session);
  });

  it("RF-057 RF-082: closing the match with marks and opening it again leaves an empty history and the saved grid", () => {
    const session = startedSession(6, 9);
    play(session, tap(0, 0), tap(1, 1), tap(2, 6));
    const before = session.store.getState().grid;
    play(session, { type: "reopen" });
    const { store } = session;
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().grid).toEqual(before);
    expect(play(session, { type: "undo" })).toEqual([UNCHANGED]);
    expectSaved(session);
  });
});
