// T052: undo after the grid changed shape, and undo across the life of the session (RF-057, RF-082,
// RF-086, E-019, E-031). Real in-memory SQLite, the real domain. E-026 itself needs the starter
// replacement (D3, T062): its D2 counterpart removes the player in the call-up instead.
import { createMatchSessionStore } from "@/state/match-session-store";
import {
  cellAt,
  fillColumn,
  openedSession,
  savedMarks,
  savedOvertimes,
} from "../../tests/support/match-session-marks";
import {
  savedEntryIds,
  sessionWithBench,
} from "../../tests/support/match-session-call-up";
import { placed, tapAt } from "../../tests/support/match-session-undo";

describe("match session, undo after an overtime was removed", () => {
  it("RF-057 RF-086 E-031: Ana's P1, Bea's overtime cell, the overtime removed: one undo empties Ana's P1, the overtime does not come back and nothing is left to undo", () => {
    const session = openedSession(6, [], { overtimeCount: 1 });
    const { store, db, matchId, entryIds } = session;
    tapAt(session, 0, "P1");
    store.getState().tapCell(cellAt(entryIds[1] ?? 0, "OT1"));
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(store.getState().grid?.overtimeCount).toBe(0);
    expect(savedOvertimes(db, matchId)).toBe(0);
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().view?.columns).toHaveLength(6);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedOvertimes(db, matchId)).toBe(0);
  });

  it("RF-057 RF-086: with the overtime removed and added again, undo never writes into the new column, which stays empty", () => {
    const session = openedSession(8, fillColumn("OT1", [1]), {
      overtimeCount: 1,
    });
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    tapAt(session, 1, "OT1"); // removes Bea's X: the entry would restore it
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().grid?.marks).toEqual({});
    expect(savedOvertimes(db, matchId)).toBe(1);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedMarks(db, matchId)).toEqual([]);
  });

  it("RF-057 RF-086: a mark made in the new overtime after the old one was removed is the one undo reverts", () => {
    const session = openedSession(8, fillColumn("OT1", [1]), {
      overtimeCount: 1,
    });
    const { store, db, matchId } = session;
    tapAt(session, 1, "OT1"); // old overtime: Bea's X removed
    store.getState().removeLastOvertime();
    store.getState().addOvertime();
    tapAt(session, 2, "OT1"); // new overtime: Cris's X
    expect(savedMarks(db, matchId)).toHaveLength(1);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
  });
});

describe("match session, undo only covers marks", () => {
  it("RF-057 RF-058: mark, add an overtime, undo: the overtime is still there and the mark is gone", () => {
    const session = openedSession(6);
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    store.getState().addOvertime();
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(store.getState().grid?.overtimeCount).toBe(1);
    expect(savedOvertimes(db, matchId)).toBe(1);
    expect(store.getState().view?.columns).toHaveLength(7);
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedOvertimes(db, matchId)).toBe(1);
  });

  it("RF-057 RF-058: a mark in an overtime is undone and the overtime stays", () => {
    const session = openedSession(6, [], { overtimeCount: 1 });
    const { store, db, matchId } = session;
    tapAt(session, 0, "OT1");
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(savedOvertimes(db, matchId)).toBe(1);
  });

  it("RF-057 RF-086: mark, add a player to the call-up and remove her, undo: the mark is gone, the call-up is as the actions left it and undo made no row come back", () => {
    const session = sessionWithBench(
      [
        ["Ana", "1"],
        ["Bea", "2"],
      ],
      [["Eva", "3"]],
    );
    const { store, db, matchId, benched } = session;
    store.getState().openMatch(matchId);
    const ana = session.entryIds[0] ?? 0;
    store.getState().tapCell(cellAt(ana, "P1"));
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    const added = savedEntryIds(db, matchId).filter(
      (id) => !session.entryIds.includes(id),
    );
    expect(store.getState().removeFromCallUp(added[0] ?? 0).kind).toBe("saved");
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(savedEntryIds(db, matchId)).toEqual(session.entryIds);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
  });

  it("RF-057: a call-up change on its own pushes no entry, so with no marks undo has nothing to undo", () => {
    const session = sessionWithBench([["Ana", "1"]], [["Eva", "3"]]);
    const { store, db, matchId, benched } = session;
    store.getState().openMatch(matchId);
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedEntryIds(db, matchId)).toHaveLength(2);
  });
});

describe("match session, undo after a player left the call-up (the D2 counterpart of E-026)", () => {
  it("RF-057 RF-086: Ana's P2 and Eva's P2 marked, Eva removed in the call-up: undo skips Eva's entry, reverts Ana's mark in the same press and Eva does not come back", () => {
    const session = openedSession(8, fillColumn("P2", [1, 2, 3]));
    const { store, db, matchId, entryIds } = session;
    const eva = entryIds[5] ?? 0;
    tapAt(session, 0, "P2");
    tapAt(session, 5, "P2");
    expect(store.getState().removeFromCallUp(eva).kind).toBe("saved");
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toHaveLength(3);
    expect(savedMarks(db, matchId).join()).not.toContain(`${eva}:`);
    expect(savedEntryIds(db, matchId)).not.toContain(eva);
    expect(store.getState().grid?.callUp.map((e) => e.id)).not.toContain(eva);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
  });

  it("RF-057 RF-086: with no other marks, undo after removing the only marked player does nothing and writes nothing into her removed row", () => {
    const session = openedSession(8);
    const { store, db, matchId, entryIds } = session;
    const eva = entryIds[5] ?? 0;
    tapAt(session, 5, "P2");
    store.getState().removeFromCallUp(eva);
    const before = placed(store, db, matchId);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
  });

  it("RF-057 RF-086: a player removed and added again is a new row, and undo never marks it", () => {
    const session = sessionWithBench(
      [
        ["Ana", "1"],
        ["Bea", "2"],
      ],
      [],
    );
    const { store, db, matchId, players } = session;
    store.getState().openMatch(matchId);
    const bea = session.entryIds[1] ?? 0;
    store.getState().tapCell(cellAt(bea, "P2")); // an X for Bea
    store.getState().tapCell(cellAt(bea, "P2")); // removed: undo would put it back
    store.getState().removeFromCallUp(bea);
    store.getState().addToCallUp(players[1]?.id ?? 0);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().grid?.marks).toEqual({});
  });
});

describe("match session, undo and the life of the session", () => {
  it("RF-057 RF-082 E-019: marks in P1-P3 and an overtime, a new store on the same database: same marks and overtime, nothing to undo", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    for (const key of ["P1", "P2", "P3"] as const) tapAt(session, 0, key);
    store.getState().addOvertime();
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(reopened.getState().grid).toEqual(store.getState().grid);
    expect(reopened.getState().grid?.overtimeCount).toBe(1);
    expect(reopened.getState().history).toEqual([]);
    expect(reopened.getState().view?.canUndo).toBe(false);
    const before = placed(reopened, db, matchId);
    expect(reopened.getState().undo()).toEqual({ kind: "unchanged" });
    expect(placed(reopened, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toHaveLength(3);
  });

  it("RF-057 RF-082: mark, closeMatch, openMatch of the same match: the mark is kept and there is nothing to undo", () => {
    const session = openedSession(8);
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    tapAt(session, 1, "P1");
    store.getState().closeMatch();
    expect(store.getState().history).toEqual([]);
    store.getState().openMatch(matchId);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().undo()).toEqual({ kind: "unchanged" });
    expect(savedMarks(db, matchId)).toHaveLength(2);
  });

  it("RF-057: the history survives an overtime added and removed and a call-up change in between, and undo still reverts the mark", () => {
    const session = sessionWithBench([["Ana", "1"]], [["Eva", "3"]]);
    const { store, db, matchId, benched } = session;
    store.getState().openMatch(matchId);
    store.getState().tapCell(cellAt(session.entryIds[0] ?? 0, "P1"));
    store.getState().addOvertime();
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    store.getState().removeLastOvertime();
    expect(store.getState().view?.canUndo).toBe(true);
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toEqual([]);
  });
});
