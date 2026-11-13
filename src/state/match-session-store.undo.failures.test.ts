// T052: an undo whose save fails, and undo after a failed tap (RF-057, RF-085, RF-082, E-025). The
// write fails through a real SQLite trigger on the marks table, so no repository is mocked. A failed
// undo leaves the grid, warnings, view, history and database as they were, and sets saveFailed.
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  fillColumn,
  openedSession,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import { placed, tapAt } from "../../tests/support/match-session-undo";

describe("match session, an undo that cannot be saved", () => {
  it("RF-057 RF-085: a failed undo of an added X keeps the X, the history and the database, and sets saveFailed", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    tapAt(session, 1, "P1");
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "DELETE");
    expect(store.getState().undo()).toEqual({ kind: "saveFailed" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().history).toHaveLength(2);
    expect(store.getState().view?.canUndo).toBe(true);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-057 RF-085: a failed undo of a removed X leaves the cell empty and keeps the entry", () => {
    const session = openedSession(8, fillColumn("P1", [0, 1, 2]));
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "INSERT");
    expect(store.getState().undo()).toEqual({ kind: "saveFailed" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(2);
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-057 RF-085: a failed undo does not lose the entry: when the device has space again the same press undoes it and clears saveFailed", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    const empty = placed(store, db, matchId);
    tapAt(session, 0, "P1");
    failMarkWrites(db, "DELETE");
    store.getState().undo();
    allowMarkWrites(db, "DELETE");
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(empty);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-085: an undo that fails twice in a row stays saveFailed with nothing published", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    failMarkWrites(db, "DELETE");
    store.getState().undo();
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().undo().kind).toBe("saveFailed");
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085 RF-058: after a failed undo, the next successful change (an overtime added, or a tap) clears saveFailed", () => {
    const session = openedSession(6);
    const { store, db } = session;
    tapAt(session, 0, "P1");
    failMarkWrites(db, "DELETE");
    store.getState().undo();
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
    store.getState().undo();
    expect(store.getState().saveFailed).toBe(true);
    expect(tapAt(session, 1, "P1")).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-057 RF-085: a failed undo with the overtime removed in between keeps the history it had (the entries the removal pruned stay out)", () => {
    const session = openedSession(8, [], { overtimeCount: 1 });
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    tapAt(session, 1, "OT1");
    store.getState().removeLastOvertime();
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "DELETE");
    expect(store.getState().undo()).toEqual({ kind: "saveFailed" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().history).toHaveLength(1);
  });
});

describe("match session, undo after a failed tap", () => {
  it("RF-085 RF-057 E-025: after a good tap and a failed one, undo reverts the good one, not nothing and not the failed one, and clears saveFailed", () => {
    const session = openedSession(8, fillColumn("P1", [2, 3, 4]));
    const { store, db, matchId, entryIds } = session;
    const [ana, bea] = [entryIds[0] ?? 0, entryIds[1] ?? 0];
    expect(tapAt(session, 0, "P1")).toEqual({ kind: "saved" });
    failMarkWrites(db, "INSERT");
    expect(store.getState().tapCell(cellAt(bea, "P1")).kind).toBe("saveFailed");
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).not.toContain(`${ana}:P1=starter`);
    expect(savedMarks(db, matchId)).toHaveLength(3);
    expect(store.getState().grid?.marks[`${bea}:P1`]).toBeUndefined();
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-085 RF-057 E-025: when the only tap failed, undo has nothing to undo and does not clear saveFailed", () => {
    const session = openedSession(8, fillColumn("P1", [1, 2, 3]));
    const { store, db, matchId } = session;
    failMarkWrites(db, "INSERT");
    tapAt(session, 0, "P1");
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });
});
