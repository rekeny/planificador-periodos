// T052: undo of mark changes on the session store (RF-048, RF-049, RF-051, RF-055, RF-057, RF-082).
// Real in-memory SQLite, the real domain. `undo()` is synchronous and returns a SaveResult, like
// the other actions of the store.
import type { ColumnKey } from "@/domain/column";
import {
  sessionWith,
  squadSpecs,
} from "../../tests/support/match-session-fixtures";
import {
  fillColumn,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import { placed, tapAt } from "../../tests/support/match-session-undo";

describe("match session, undoing marks", () => {
  it("RF-057 RF-082: three marks and three undos, one press each, bring back the grid, the warnings, the view and the database as before each mark", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    const taps: [number, ColumnKey][] = [
      [0, "P1"],
      [1, "P1"],
      [0, "P2"],
    ];
    const states = [placed(store, db, matchId)];
    for (const [row, key] of taps) {
      expect(tapAt(session, row, key)).toEqual({ kind: "saved" });
      states.push(placed(store, db, matchId));
    }
    for (let left = taps.length - 1; left >= 0; left -= 1) {
      expect(store.getState().undo()).toEqual({ kind: "saved" });
      expect(placed(store, db, matchId)).toEqual(states[left]);
      expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
      expect(store.getState().history).toHaveLength(left);
      expect(store.getState().view?.canUndo).toBe(left > 0);
      expect(store.getState().saveFailed).toBe(false);
    }
    expect(savedMarks(db, matchId)).toEqual([]);
  });

  it("RF-048 RF-057: undoing a circled X in P6 empties the cell and leaves the period with its 5 X", () => {
    const session = openedSession(8, fillColumn("P6", [1, 2, 3, 4, 5]));
    const { store, db, matchId, entryIds } = session;
    const before = placed(store, db, matchId);
    expect(tapAt(session, 0, "P6")).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toContain(`${entryIds[0]}:P6=sub`);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(5);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-049 RF-057: undoing the removal of an X puts the X back, in the grid and in the database", () => {
    const session = openedSession(8, fillColumn("P1", [0, 1, 2]));
    const { store, db, matchId } = session;
    const before = placed(store, db, matchId);
    tapAt(session, 0, "P1");
    expect(savedMarks(db, matchId)).toHaveLength(2);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(3);
  });

  it("RF-051 RF-057: undoing the removal of a circled X puts the circled X back", () => {
    const seeds = [
      ...fillColumn("P6", [1, 2, 3, 4, 5]),
      ...fillColumn("P6", [0], "sub"),
    ];
    const session = openedSession(8, seeds);
    const { store, db, matchId, entryIds } = session;
    const before = placed(store, db, matchId);
    tapAt(session, 0, "P6");
    expect(savedMarks(db, matchId)).not.toContain(`${entryIds[0]}:P6=sub`);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toContain(`${entryIds[0]}:P6=sub`);
  });
});

describe("match session, undo with nothing to undo", () => {
  it("RF-057: with an empty history, undo is unchanged and saves and publishes nothing", () => {
    const { store, db, matchId } = openedSession(
      8,
      fillColumn("P1", [0, 1, 2]),
    );
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(3);
    expect(store.getState().view?.canUndo).toBe(false);
  });

  it("RF-057 RF-085: an unchanged undo neither sets saveFailed nor clears one that was already there", () => {
    const { store } = openedSession(8);
    store.setState({ saveFailed: true });
    expect(store.getState().undo().kind).toBe("unchanged");
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-057: with exactly one entry, undo empties the history and the next undo does nothing", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    const after = snapshotOf(store, db, matchId);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(snapshotOf(store, db, matchId)).toEqual(after);
  });

  it("RF-057 RF-082: with no match open, or after closing it, undo is unchanged and the marks already saved stay", () => {
    const session = sessionWith(squadSpecs(6));
    const { store, db, matchId, entryIds } = session;
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    store.getState().openMatch(matchId);
    store.getState().tapCell({
      entryId: entryIds[0] ?? 0,
      column: { kind: "period", number: 1 },
    });
    store.getState().closeMatch();
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedMarks(db, matchId)).toEqual([`${entryIds[0]}:P1=starter`]);
    expect(store.getState().grid).toBeNull();
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-057: pressing undo more times than there were actions changes nothing after the last one", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    const empty = placed(store, db, matchId);
    tapAt(session, 0, "P1");
    tapAt(session, 1, "P1");
    const results = Array.from({ length: 5 }, () => store.getState().undo());
    expect(results.map((r) => r.kind)).toEqual([
      "saved",
      "saved",
      "unchanged",
      "unchanged",
      "unchanged",
    ]);
    expect(placed(store, db, matchId)).toEqual(empty);
    expect(store.getState().history).toEqual([]);
  });
});

describe("match session, undo never goes past the limit of 5 X", () => {
  it("RF-055 RF-057: undoing through a column that was emptied and filled again never leaves it with 6 X", () => {
    const session = openedSession(8, fillColumn("P1", [0, 1, 2, 3, 4]));
    const { store, db, matchId } = session;
    const start = placed(store, db, matchId);
    // Remove the X of row 0, give one to row 5, remove row 1's, give one to row 6.
    for (const row of [0, 5, 1, 6]) {
      expect(tapAt(session, row, "P1")).toEqual({ kind: "saved" });
    }
    const counts: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      expect(store.getState().undo()).toEqual({ kind: "saved" });
      counts.push(mostStarters(savedGrid(db, matchId)));
      expect(mostStarters(savedGrid(db, matchId))).toBeLessThanOrEqual(5);
    }
    expect(counts).toEqual([4, 5, 4, 5]);
    expect(placed(store, db, matchId)).toEqual(start);
  });
});

describe("match session, undoing a long series", () => {
  it("RF-057 RF-082 RF-055: after a long series of taps (some of them without effect) each undo gives back exactly the state before that tap, database included", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    const taps: [number, ColumnKey][] = [
      [0, "P1"],
      [1, "P1"],
      [2, "P1"],
      [3, "P1"],
      [4, "P1"],
      [5, "P1"],
      [0, "P1"],
      [5, "P1"],
      [0, "P2"],
      [0, "P3"],
      [6, "P6"],
      [7, "P6"],
      [0, "P6"],
      [1, "P6"],
      [2, "P6"],
      [3, "P6"],
      [4, "P6"],
      [5, "P6"],
      [6, "P6"],
      [3, "P6"],
    ];
    const before: ReturnType<typeof placed>[] = [];
    for (const [row, key] of taps) {
      const state = placed(store, db, matchId);
      if (tapAt(session, row, key).kind === "saved") before.push(state);
      // T062: a tap without effect that asks leaves a question open, which would stop the later
      // taps; the coach cancels it, so the question changes nothing and the sequence goes on.
      store.getState().cancelQuestion();
    }
    expect(before.length).toBeGreaterThan(10);
    expect(before.length).toBeLessThan(taps.length);
    expect(store.getState().history).toHaveLength(before.length);
    while (before.length > 0) {
      expect(store.getState().undo()).toEqual({ kind: "saved" });
      expect(placed(store, db, matchId)).toEqual(before.pop());
      expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
    }
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedMarks(db, matchId)).toEqual([]);
  });
});
