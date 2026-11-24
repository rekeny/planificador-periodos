// T097: a starter in place of another, in the session store (RF-047, RF-055, RF-057, E-011).
// answerStarter() turns the question «¿Entra de cambio o es titular en lugar de otro?» into the
// choice of the replaced X (`pending` is { kind: "chooseReplaced", cell }, nothing is read or
// written, and the view's `replaceableStarters` lists the rows with an X in that column);
// chooseReplaced(entryId) saves both cells in one transaction and one undo entry. Real in-memory
// SQLite and the real domain. Sequences, interruptions, cancelling and failures are in
// match-session-store.replace.sequences.test.ts. Rows are positions of the call-up: 0 is Ana,
// 1 to 5 hold the X of P2 and 4 is Eva.
import { starterCount } from "@/domain/grid";
import {
  cellAt,
  fillColumn,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import { FULL_P2, reopened } from "../../tests/support/match-session-questions";
import {
  sessionWith,
  writeMark,
} from "../../tests/support/match-session-fixtures";

const P2 = { kind: "period", number: 2 } as const;
const UNCHANGED = { kind: "unchanged" };

/** 8 players, the given marks, and Ana's empty P2 tapped: the question is open. */
function asked(seeds: readonly SeedMark[] = FULL_P2) {
  const session = openedSession(8, seeds);
  const [ana, eva] = [session.entryIds[0] ?? 0, session.entryIds[4] ?? 0];
  session.store.getState().tapCell(cellAt(ana, "P2"));
  expect(session.store.getState().pending?.kind).toBe("subOrStarter");
  return { ...session, ana, eva, cell: cellAt(ana, "P2") };
}

/** The same, with «Titular en lugar de otro» answered: the choice of the replaced X is open. */
function choosing(seeds: readonly SeedMark[] = FULL_P2) {
  const session = asked(seeds);
  session.store.getState().answerStarter();
  return session;
}

describe("match session, a starter in place of another", () => {
  it("E-011 RF-047 RF-057 RF-055: answering starter and choosing Eva puts an X on Ana's P2 and empties Eva's (not a circled X), P2 keeps its 5 X, both are saved and one undo entry holds both cells", () => {
    const { store, db, matchId, ana, eva, cell } = asked();
    store.getState().answerStarter();
    expect(store.getState().chooseReplaced(eva)).toEqual({ kind: "saved" });
    const { grid, history, pending, view, saveFailed } = store.getState();
    expect(grid?.marks[`${ana}:P2`]).toBe("starter");
    expect(grid?.marks[`${eva}:P2`]).toBeUndefined();
    expect(savedMarks(db, matchId)).toContain(`${ana}:P2=starter`);
    expect(savedMarks(db, matchId).join()).not.toContain(`${eva}:P2`);
    expect(reopened(db, matchId).getState().grid).toEqual(grid);
    expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
    expect(history).toHaveLength(1);
    expect(history[0]).toHaveLength(2);
    expect(history[0]).toEqual(
      expect.arrayContaining([
        { cell, state: "empty" },
        { cell: cellAt(eva, "P2"), state: "starter" },
      ]),
    );
    expect(pending).toBeNull();
    expect(saveFailed).toBe(false);
    expect(view?.replaceableStarters).toEqual([]);
  });

  it("RF-047: after the replacement Ana's counter gains a played period and Eva's loses one", () => {
    const { store, eva } = asked();
    const counters = () =>
      (store.getState().view?.rows ?? []).map((row) => row.counter);
    expect(counters().slice(0, 5)).toEqual([
      { played: 0, rested: 6 },
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
    ]);
    store.getState().answerStarter();
    store.getState().chooseReplaced(eva);
    expect(counters().slice(0, 5)).toEqual([
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
      { played: 1, rested: 5 },
      { played: 0, rested: 6 },
    ]);
  });

  it("RF-047 RF-055: answerStarter() only turns the question into the choice of the same cell: nothing is saved, no undo entry, the rest of the view stays", () => {
    const { store, db, matchId, cell } = asked();
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().view?.replaceableStarters).toEqual([]);
    expect(store.getState().answerStarter()).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({ kind: "chooseReplaced", cell });
    const after = snapshotOf(store, db, matchId);
    expect({ ...after.view, replaceableStarters: [] }).toEqual(before.view);
    expect({ ...after, view: null }).toEqual({ ...before, view: null });
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-047 E-011: replaceableStarters holds exactly the five rows with an X in P2, in the grid's order, and none of the circled X of that column nor the X of other columns", () => {
    const seeds = [
      ...FULL_P2,
      ...fillColumn("P2", [6], "sub"),
      ...fillColumn("P1", [0, 7]),
    ];
    const { store, entryIds } = choosing(seeds);
    const { view } = store.getState();
    expect(view?.replaceableStarters.map((row) => row.entryId)).toEqual(
      entryIds.slice(1, 6),
    );
    // The rows are the ones the grid draws, in the same order.
    expect(view?.replaceableStarters).toEqual(
      (view?.rows ?? []).filter((row) =>
        entryIds.slice(1, 6).includes(row.entryId),
      ),
    );
    expect(view?.replaceableStarters.map((row) => row.name)).toEqual([
      "Jugador 2",
      "Jugador 3",
      "Jugador 4",
      "Jugador 5",
      "Jugador 6",
    ]);
  });

  it.each([1, 2, 3, 4, 5])(
    "RF-047 RF-055: choosing the X in row %i empties that cell, gives Ana the X, and P2 keeps exactly 5 X",
    (row) => {
      const { store, db, matchId, ana, entryIds } = choosing();
      const replaced = entryIds[row] ?? 0;
      expect(store.getState().chooseReplaced(replaced)).toEqual({
        kind: "saved",
      });
      const marks = savedMarks(db, matchId);
      expect(marks).toContain(`${ana}:P2=starter`);
      expect(marks.join()).not.toContain(`${replaced}:P2`);
      expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
      expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    },
  );

  it("RF-047: two starters with the same number are both listed, told apart by name, and choosing the second empties only that one", () => {
    const names = [
      "Ana",
      "Beto",
      "Carla",
      "Dani",
      "Eva",
      "Fran",
      "Gus",
      "Hugo",
    ];
    const numbers = ["1", "7", "7", "3", "4", "5", "6", "8"];
    const { db, store, matchId, entryIds } = sessionWith(
      names.map((name, i): [string, string] => [name, numbers[i] ?? ""]),
    );
    for (const row of [1, 2, 3, 4, 5]) {
      writeMark(db, entryIds[row] ?? 0, "P", 2, "starter");
    }
    store.getState().openMatch(matchId);
    const cell = cellAt(entryIds[0] ?? 0, "P2");
    store.getState().tapCell(cell);
    store.getState().answerStarter();
    const sevens = (store.getState().view?.replaceableStarters ?? []).filter(
      (row) => row.number === "7",
    );
    expect(sevens.map((row) => row.name).sort()).toEqual(["Beto", "Carla"]);
    const [beto, carla] = [entryIds[1] ?? 0, entryIds[2] ?? 0];
    expect(store.getState().chooseReplaced(carla)).toEqual({ kind: "saved" });
    const marks = savedMarks(db, matchId);
    expect(marks).toContain(`${beto}:P2=starter`);
    expect(marks.join()).not.toContain(`${carla}:P2`);
  });
});
