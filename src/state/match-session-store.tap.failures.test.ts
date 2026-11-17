// T051: a tap whose save fails (RF-085, E-025, RF-082). The write fails through a real SQLite
// trigger on the marks table, so no repository is mocked. A failed tap leaves the grid, warnings,
// view, history and database as they were, and sets saveFailed; the next successful change clears it.
import { undoEntryOf } from "../../tests/support/match-session-call-up";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  fillColumn,
  openedSession,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";

describe("match session, a tap that cannot be saved", () => {
  it("RF-085 E-025: Ana's P1 stays empty, P1 keeps its 3 X, saveFailed is set and no undo entry is pushed", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [1, 2, 3]),
    );
    const ana = entryIds[0] ?? 0;
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "INSERT");
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "saveFailed",
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().grid?.marks[`${ana}:P1`]).toBeUndefined();
    expect(store.getState().view?.rows[0]?.cells[0]?.state).toBe("empty");
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085: a failed removal of an X leaves the X in the grid and in the database", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [0, 1, 2]),
    );
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "DELETE");
    expect(store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"))).toEqual({
      kind: "saveFailed",
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(3);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085: a failed circled X in P6 leaves the period with its 5 X and no sub", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P6", [1, 2, 3, 4, 5]),
    );
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "INSERT");
    expect(store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P6")).kind).toBe(
      "saveFailed",
    );
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });

  it("RF-085 RF-082: the next successful tap clears saveFailed, and the cell that failed can be tapped again", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [1, 2, 3]),
    );
    const ana = entryIds[0] ?? 0;
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(ana, "P1"));
    expect(store.getState().saveFailed).toBe(true);
    allowMarkWrites(db, "INSERT");
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "saved",
    });
    expect(store.getState().saveFailed).toBe(false);
    expect(savedMarks(db, matchId)).toContain(`${ana}:P1=starter`);
    expect(store.getState().history).toEqual([undoEntryOf(ana, 1)]);
  });

  it("RF-085: a failed tap after a good one leaves exactly the good one in the history", () => {
    const { store, db, entryIds } = openedSession(8);
    const [ana, bea] = [entryIds[0] ?? 0, entryIds[1] ?? 0];
    store.getState().tapCell(cellAt(ana, "P1"));
    const kept = store.getState().history;
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(bea, "P1"));
    expect(store.getState().history).toEqual(kept);
    expect(kept).toEqual([undoEntryOf(ana, 1)]);
    expect(store.getState().view?.canUndo).toBe(true);
  });

  it("RF-085: a tap that fails twice in a row stays saveFailed with nothing published", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().tapCell(cellAt(entryIds[1] ?? 0, "P2")).kind).toBe(
      "saveFailed",
    );
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085 RF-058: a successful overtime added after a failed tap also clears saveFailed", () => {
    const { store, db, entryIds } = openedSession(6);
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
  });
});
