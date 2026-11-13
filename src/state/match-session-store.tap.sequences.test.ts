// T051: tapCell with odd targets and in sequences (RF-044, RF-048, RF-049, RF-051, RF-055, RF-056,
// RF-060, RF-082). Real in-memory SQLite, the real domain.
import type { ColumnKey } from "@/domain/column";
import { createMatchSessionStore } from "@/state/match-session-store";
import { evaluateWarnings } from "@/domain/warnings";
import {
  cellAt,
  fillColumn,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import {
  sessionWith,
  squadSpecs,
} from "../../tests/support/match-session-fixtures";

describe("match session, a tap that breaks a rule", () => {
  it("RF-060 E-001: a tap that breaks the rest minimum is saved, and the light red cells follow the new grid", () => {
    const { store, db, matchId, entryIds } = openedSession(10);
    const juan = entryIds[0] ?? 0;
    for (const key of ["P1", "P2", "P3"] as const) {
      expect(store.getState().tapCell(cellAt(juan, key)).kind).toBe("saved");
    }
    const { warnings } = store.getState();
    expect(warnings?.lightRedCells.has(`${juan}:P4`)).toBe(true);
    expect(warnings?.lightRedCells.has(`${juan}:P5`)).toBe(true);
    expect(store.getState().tapCell(cellAt(juan, "P4")).kind).toBe("saved");
    expect(savedMarks(db, matchId)).toContain(`${juan}:P4=starter`);
    expect(store.getState().warnings).toEqual(
      evaluateWarnings(savedGrid(db, matchId)),
    );
  });
});

describe("match session, a tap that has no cell to act on", () => {
  it("RF-044 RF-055: a cell of an entry no longer in the call-up is unchanged and nothing is written", () => {
    const { store, db, matchId, entryIds } = openedSession(
      8,
      fillColumn("P1", [1, 2]),
    );
    const ana = entryIds[0] ?? 0;
    store.getState().removeFromCallUp(ana);
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "unchanged",
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });

  it("RF-044 RF-058 RF-059: a cell of an overtime that was removed, or of a period the format does not have, is unchanged", () => {
    const { store, db, matchId, entryIds } = openedSession(6);
    const ana = entryIds[0] ?? 0;
    store.getState().addOvertime();
    store.getState().removeLastOvertime();
    const before = snapshotOf(store, db, matchId);
    const gone: ColumnKey[] = ["OT1", "P7", "P9"];
    for (const key of gone) {
      expect(store.getState().tapCell(cellAt(ana, key))).toEqual({
        kind: "unchanged",
      });
    }
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });

  it("RF-044 RF-082: with no match open, or after closing it, a tap is unchanged and writes nothing", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(6));
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "unchanged",
    });
    store.getState().openMatch(matchId);
    store.getState().closeMatch();
    expect(store.getState().tapCell(cellAt(ana, "P1"))).toEqual({
      kind: "unchanged",
    });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().grid).toBeNull();
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-085: an unchanged tap neither sets saveFailed nor clears one that was already there", () => {
    const { store, entryIds } = openedSession(
      8,
      fillColumn("P1", [1, 2, 3, 4, 5]),
    );
    store.setState({ saveFailed: true });
    expect(store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1")).kind).toBe(
      "unchanged",
    );
    expect(store.getState().saveFailed).toBe(true);
  });
});

describe("match session, many taps in a row", () => {
  it("RF-056 RF-082: after every tap the database holds exactly the published grid, and a new store opens the same grid", () => {
    const { store, db, matchId, entryIds } = openedSession(8);
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
    for (const [row, key] of taps) {
      store.getState().tapCell(cellAt(entryIds[row] ?? 0, key));
      expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
      expect(mostStarters(savedGrid(db, matchId))).toBeLessThanOrEqual(5);
    }
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(reopened.getState().grid).toEqual(store.getState().grid);
    expect(reopened.getState().history).toEqual([]);
  });

  it("RF-044 RF-048 RF-049: a full journey through P6 (X, the fifth X, circled X, removals) ends with the grid a coach expects", () => {
    const { store, db, matchId, entryIds } = openedSession(8);
    const at = (row: number) => cellAt(entryIds[row] ?? 0, "P6");
    for (const row of [0, 1, 2, 3, 4, 5, 6]) {
      store.getState().tapCell(at(row));
    }
    expect(savedMarks(db, matchId)).toEqual(
      [0, 1, 2, 3, 4]
        .map((row) => `${entryIds[row]}:P6=starter`)
        .concat([5, 6].map((row) => `${entryIds[row]}:P6=sub`))
        .sort(),
    );
    store.getState().tapCell(at(5));
    expect(savedMarks(db, matchId)).toHaveLength(6);
    expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    expect(store.getState().history).toHaveLength(8);
  });
});
