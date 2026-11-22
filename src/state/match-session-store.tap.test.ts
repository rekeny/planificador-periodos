// T051: tapCell on the session store, saved at once (RF-044, RF-048, RF-049, RF-051, RF-055, RF-056,
// RF-060, RF-082). Real in-memory SQLite, the real domain. A tap that the domain answers with a
// question (askSubOrStarter, confirmRemoveStarter) saves nothing and leaves `pending` set (T062,
// RF-045, RF-050); the answers are tested in match-session-store.questions.test.ts.
import { cellState } from "@/domain/grid";
import { evaluateWarnings } from "@/domain/warnings";
import { undoEntryOf } from "../../tests/support/match-session-call-up";
import {
  cellAt,
  fillColumn,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";

describe("match session, tapping an empty cell", () => {
  it("RF-044 RF-060 RF-082: tapping an empty cell in a period with 4 X marks an X, saves it, publishes it and pushes one undo entry", () => {
    const { store, db, matchId, entryIds } = openedSession(
      10,
      fillColumn("P1", [1, 2, 3, 4]),
    );
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "saved",
    });
    const { grid, view, warnings, history } = store.getState();
    expect(grid?.marks[`${ana}:P1`]).toBe("starter");
    expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    expect(savedMarks(db, matchId)).toContain(`${ana}:P1=starter`);
    expect(view?.rows[0]?.cells[0]?.state).toBe("starter");
    expect(warnings).toEqual(evaluateWarnings(savedGrid(db, matchId)));
    expect(history).toEqual([undoEntryOf(ana, 1)]);
    expect(view?.canUndo).toBe(true);
    expect(store.getState().pending).toBeNull();
  });

  it("RF-044 RF-082: the first tap on a match with no marks and no overtimes works and reads back from a new store", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P2")).kind).toBe("saved");
    expect(savedMarks(db, matchId)).toEqual([`${ana}:P2=starter`]);
    expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
  });

  it("RF-048: tapping an empty cell in P6 with 5 X marks a circled X without asking, and the period keeps its 5 X", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P6", [1, 2, 3, 4, 5]),
    );
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P6")).kind).toBe("saved");
    expect(store.getState().grid?.marks[`${ana}:P6`]).toBe("sub");
    expect(savedMarks(db, matchId)).toContain(`${ana}:P6=sub`);
    expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    expect(store.getState().history).toEqual([undoEntryOf(ana, 6)]);
    expect(store.getState().pending).toBeNull();
  });

  it("RF-048: tapping an empty cell in an overtime with 5 X marks a circled X", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("OT1", [1, 2, 3, 4, 5]),
      { overtimeCount: 1 },
    );
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "OT1")).kind).toBe("saved");
    expect(savedMarks(db, matchId)).toContain(`${ana}:OT1=sub`);
    expect(store.getState().view?.rows[0]?.cells[6]?.state).toBe("sub");
  });
});

describe("match session, tapping a mark", () => {
  it("RF-049: tapping an X in a period with no sub empties the cell and the undo entry brings the X back", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [0, 1, 2, 3, 4]),
    );
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P1")).kind).toBe("saved");
    expect(store.getState().grid?.marks[`${ana}:P1`]).toBeUndefined();
    expect(savedMarks(db, matchId)).not.toContain(`${ana}:P1=starter`);
    expect(savedMarks(db, matchId)).toHaveLength(4);
    expect(mostStarters(savedGrid(db, matchId))).toBe(4);
    expect(store.getState().history).toEqual([
      [{ cell: cellAt(ana, "P1"), state: "starter" }],
    ]);
  });

  it("RF-051: tapping a circled X empties it, in any period, and the undo entry brings the circled X back", () => {
    const seeds = [
      ...fillColumn("P2", [1, 2, 3, 4, 5]),
      ...fillColumn("P2", [0], "sub"),
    ];
    const { store, db, matchId, entryIds } = openedSession(8, seeds);
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P2")).kind).toBe("saved");
    expect(
      cellState(
        store.getState().grid ?? savedGrid(db, matchId),
        cellAt(ana, "P2"),
      ),
    ).toBe("empty");
    expect(savedMarks(db, matchId)).toHaveLength(5);
    expect(store.getState().history).toEqual([
      [{ cell: cellAt(ana, "P2"), state: "sub" }],
    ]);
  });

  it("RF-044 RF-049 RF-056: tapping the same cell again and again keeps one row or none in the database, never versions", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    const ana = entryIds[0] ?? 0;
    const sizes = [1, 2, 3, 4, 5, 6].map(() => {
      store.getState().tapCell(cellAt(ana, "P3"));
      return savedMarks(db, matchId).length;
    });
    expect(sizes).toEqual([1, 0, 1, 0, 1, 0]);
    expect(store.getState().history).toHaveLength(6);
  });
});

describe("match session, a tap the domain answers with a question", () => {
  it("RF-055: the sixth tap in a full period of the rule window is unchanged: the database, the grid and the history stay as they were", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [1, 2, 3, 4, 5]),
    );
    const ana = entryIds[0] ?? 0;
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().pending).toEqual({
      kind: "subOrStarter",
      cell: cellAt(ana, "P1"),
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-050 E-013: tapping an X in a period that has a sub asks the reminder: unchanged, nothing saved and the reminder pending on that cell", () => {
    const seeds = [
      ...fillColumn("P6", [0, 1, 2, 3, 4]),
      ...fillColumn("P6", [5], "sub"),
    ];
    const { store, db, matchId, entryIds } = openedSession(8, seeds);
    const eva = entryIds[0] ?? 0;
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().tapCell(cellAt(eva, "P6"))).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().pending).toEqual({
      kind: "confirmRemoveStarter",
      cell: cellAt(eva, "P6"),
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });
});
