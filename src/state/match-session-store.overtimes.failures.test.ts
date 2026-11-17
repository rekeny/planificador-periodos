// T051: overtime changes whose save fails (RF-058, RF-059, RF-085). The write fails through a real
// SQLite trigger, so no repository is mocked. A failed change publishes nothing, pushes nothing and sets
// saveFailed; the next successful change clears it.
import {
  allowOvertimeWrites,
  cellAt,
  failMarkWrites,
  failOvertimeWrites,
  openedSession,
  savedMarks,
  savedOvertimes,
  snapshotOf,
} from "../../tests/support/match-session-marks";

describe("match session, an overtime that cannot be saved", () => {
  it("RF-058 RF-085: adding an overtime that fails leaves no overtime anywhere and sets saveFailed", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
    const before = snapshotOf(store, db, matchId);
    failOvertimeWrites(db);
    expect(store.getState().addOvertime()).toEqual({ kind: "saveFailed" });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().grid?.overtimeCount).toBe(0);
    expect(store.getState().view?.columns).toHaveLength(6);
    expect(savedOvertimes(db, matchId)).toBe(0);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-059 RF-085: removing an overtime that fails keeps the overtime and its marks, in the grid and in the database", () => {
    const { store, db, matchId } = openedSession(
      6,
      [
        [0, "OT1", "starter"],
        [1, "OT1", "sub"],
        [2, "P1", "starter"],
      ],
      { overtimeCount: 1 },
    );
    const before = snapshotOf(store, db, matchId);
    failOvertimeWrites(db);
    expect(store.getState().removeLastOvertime()).toEqual({
      kind: "saveFailed",
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(3);
    expect(savedOvertimes(db, matchId)).toBe(1);
    expect(store.getState().view?.lastOvertimeHasMarks).toBe(true);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-059 RF-085: when only the deletion of its marks fails, the overtime stays with its count and its marks", () => {
    const { store, db, matchId } = openedSession(6, [[0, "OT1", "starter"]], {
      overtimeCount: 1,
    });
    const before = snapshotOf(store, db, matchId);
    failMarkWrites(db, "DELETE");
    expect(store.getState().removeLastOvertime().kind).toBe("saveFailed");
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-058 RF-059 RF-085: after the device has space again, the next overtime change succeeds and clears saveFailed", () => {
    const { store, db, matchId } = openedSession(6);
    failOvertimeWrites(db);
    store.getState().addOvertime();
    expect(store.getState().saveFailed).toBe(true);
    allowOvertimeWrites(db);
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
    expect(savedOvertimes(db, matchId)).toBe(1);
    failOvertimeWrites(db);
    store.getState().removeLastOvertime();
    expect(store.getState().saveFailed).toBe(true);
    allowOvertimeWrites(db);
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
    expect(savedOvertimes(db, matchId)).toBe(0);
  });
});
