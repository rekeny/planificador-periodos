// T051: addOvertime and removeLastOvertime on the session store, saved at once (RF-058, RF-059, RF-060,
// RF-082). Real in-memory SQLite. Neither action pushes an undo entry (RF-057); removing an overtime
// prunes the history. The confirmation of RF-059 lives in the interface (T055), not in the store.
import { createMatchSessionStore } from "@/state/match-session-store";
import { evaluateWarnings } from "@/domain/warnings";
import { undoEntryOf } from "../../tests/support/match-session-call-up";
import {
  cellAt,
  openedSession,
  savedGrid,
  savedMarks,
  savedOvertimes,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import {
  sessionWith,
  squadSpecs,
} from "../../tests/support/match-session-fixtures";

const keysOf = (store: ReturnType<typeof createMatchSessionStore>) =>
  (store.getState().view?.columns ?? []).map((column) => column.key);

describe("match session, adding overtimes", () => {
  it("RF-058 RF-082: pressing add twice in a 6-period match shows 8 columns and the database holds 2 overtimes", () => {
    const { store, db, matchId } = openedSession(6);
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(keysOf(store)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "OT1",
      "OT2",
    ]);
    expect(store.getState().grid?.overtimeCount).toBe(2);
    expect(savedOvertimes(db, matchId)).toBe(2);
    expect(store.getState().warnings).toEqual(
      evaluateWarnings(savedGrid(db, matchId)),
    );
  });

  it("RF-058: there is no cap: five overtimes in a row are all saved", () => {
    const { store, db, matchId } = openedSession(6);
    for (let i = 0; i < 5; i += 1) {
      expect(store.getState().addOvertime().kind).toBe("saved");
    }
    expect(savedOvertimes(db, matchId)).toBe(5);
    expect(keysOf(store)).toHaveLength(11);
  });

  it("RF-057 RF-058: adding an overtime pushes no undo entry and keeps the history as it was", () => {
    const { store, entryIds } = openedSession(6);
    expect(store.getState().view?.canUndo).toBe(false);
    store.getState().addOvertime();
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
    store.getState().addOvertime();
    expect(store.getState().history).toEqual([
      undoEntryOf(entryIds[0] ?? 0, 1),
    ]);
    expect(store.getState().view?.canUndo).toBe(true);
  });

  it("RF-058 RF-082: a mark in the new overtime is saved, and a new store on the same database reads the overtime and the mark", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    const ana = entryIds[0] ?? 0;
    store.getState().addOvertime();
    expect(store.getState().tapCell(cellAt(ana, "OT1")).kind).toBe("saved");
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(reopened.getState().grid).toEqual(store.getState().grid);
    expect(reopened.getState().grid?.overtimeCount).toBe(1);
    expect(savedMarks(db, matchId)).toEqual([`${ana}:OT1=starter`]);
    expect(reopened.getState().history).toEqual([]);
  });

  it("RF-058: with no match open, adding an overtime is unchanged and writes nothing", () => {
    const { store, db, matchId } = sessionWith(squadSpecs(6));
    expect(store.getState().addOvertime()).toEqual({ kind: "unchanged" });
    expect(savedOvertimes(db, matchId)).toBe(0);
    expect(store.getState().saveFailed).toBe(false);
  });
});

describe("match session, removing the last overtime", () => {
  it("RF-059: removing the only overtime of a 6-period match, with no marks, leaves 6 columns and 0 overtimes in the database", () => {
    const { store, db, matchId } = openedSession(6, [], { overtimeCount: 1 });
    expect(store.getState().view?.canRemoveOvertime).toBe(true);
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(keysOf(store)).toHaveLength(6);
    expect(savedOvertimes(db, matchId)).toBe(0);
    expect(store.getState().view?.canRemoveOvertime).toBe(false);
  });

  it("RF-059: an overtime with marks is removed at once with its marks only, because the confirmation lives in the interface", () => {
    const { store, db, matchId, entryIds } = openedSession(
      6,
      [
        [0, "P1", "starter"],
        [1, "OT1", "starter"],
        [2, "OT2", "starter"],
        [3, "OT2", "sub"],
      ],
      { overtimeCount: 2 },
    );
    expect(store.getState().view?.lastOvertimeHasMarks).toBe(true);
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual(
      [`${entryIds[0]}:P1=starter`, `${entryIds[1]}:OT1=starter`].sort(),
    );
    expect(savedOvertimes(db, matchId)).toBe(1);
    expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
    expect(keysOf(store)).toHaveLength(7);
    expect(store.getState().warnings).toEqual(
      evaluateWarnings(savedGrid(db, matchId)),
    );
  });

  it("RF-057 RF-059: removing an overtime pushes no undo entry and prunes the entries whose cells are gone", () => {
    const { store, entryIds } = openedSession(6, [], { overtimeCount: 1 });
    const ana = entryIds[0] ?? 0;
    store.getState().tapCell(cellAt(ana, "P1"));
    store.getState().tapCell(cellAt(ana, "OT1"));
    expect(store.getState().history).toHaveLength(2);
    store.getState().removeLastOvertime();
    expect(store.getState().history).toEqual([undoEntryOf(ana, 1)]);
    expect(store.getState().view?.canUndo).toBe(true);
  });

  it("RF-059: with no overtime, removing does nothing: unchanged, nothing saved and nothing published", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
    const before = snapshotOf(store, db, matchId);
    const published = jest.fn();
    const stop = store.subscribe(published);
    expect(store.getState().removeLastOvertime()).toEqual({
      kind: "unchanged",
    });
    stop();
    expect(published).not.toHaveBeenCalled();
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });

  it("RF-059: with no match open, removing an overtime is unchanged and writes nothing", () => {
    const { store, db, matchId } = sessionWith(squadSpecs(6), {
      overtimeCount: 1,
    });
    expect(store.getState().removeLastOvertime()).toEqual({
      kind: "unchanged",
    });
    expect(savedOvertimes(db, matchId)).toBe(1);
  });
});
