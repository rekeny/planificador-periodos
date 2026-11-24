// T097: odd data in the choice of the replaced X (RF-045, RF-047, RF-050, RF-055, RF-057). An entry
// that has no X in the tapped column, an answer of another kind and a choice with nothing pending
// all answer `unchanged`, change nothing and leave the pending question open. Real in-memory
// SQLite and the real domain. The helpers repeat the ones of match-session-store.replace.test.ts
// on purpose: a shared one would go in tests/support/, which makes the full Stryker run necessary.
import {
  cellAt,
  fillColumn,
  openedSession,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
  reopened,
} from "../../tests/support/match-session-questions";

const UNCHANGED = { kind: "unchanged" };
type Answer = "answerStarter" | "answerSub" | "confirmRemove";
type Open = Pick<ReturnType<typeof asked>, "store" | "db" | "matchId" | "eva">;

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

/** The reminder of E-013 is open on Eva's X in P3. */
function reminder() {
  const session = openedSession(8, P3_WITH_SUB);
  const eva = session.entryIds[4] ?? 0;
  session.store.getState().tapCell(cellAt(eva, "P3"));
  expect(session.store.getState().pending?.kind).toBe("confirmRemoveStarter");
  return { ...session, eva };
}

/** The question was asked and cancelled: nothing is pending. */
function idle() {
  const session = asked();
  session.store.getState().cancelQuestion();
  expect(session.store.getState().pending).toBeNull();
  return session;
}

describe("match session, odd data in the choice of the replaced X", () => {
  const INVALID: [string, readonly SeedMark[], number][] = [
    ["a circled X in P2", [...FULL_P2, ...fillColumn("P2", [6], "sub")], 6],
    ["no mark in P2", FULL_P2, 7],
    ["an X in another column only", [...FULL_P2, ...fillColumn("P1", [6])], 6],
    ["the tapped player herself, with no mark", FULL_P2, 0],
    ["no entry of the call-up", FULL_P2, -1],
  ];

  it.each(INVALID)(
    "RF-047 RF-055: chooseReplaced with %s is unchanged, changes nothing and keeps the choice open, and a valid choice still works",
    (_label, seeds, row) => {
      const { store, db, matchId, eva, cell, entryIds } = choosing(seeds);
      const before = snapshotOf(store, db, matchId);
      const open = store.getState().pending;
      expect(store.getState().chooseReplaced(entryIds[row] ?? 99999)).toEqual(
        UNCHANGED,
      );
      expect(store.getState().pending).toEqual(open);
      expect(open).toEqual({ kind: "chooseReplaced", cell });
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().saveFailed).toBe(false);
      expect(store.getState().chooseReplaced(eva)).toEqual({ kind: "saved" });
    },
  );

  const NOT_CHOOSING: [string, () => Open][] = [
    ["nothing pending", idle],
    ["the question pending", asked],
    ["the reminder pending", reminder],
  ];

  it.each(NOT_CHOOSING)(
    "RF-047 RF-057: chooseReplaced(Eva) with %s is unchanged and changes nothing",
    (_label, make) => {
      const { store, db, matchId, eva } = make();
      const before = snapshotOf(store, db, matchId);
      const open = store.getState().pending;
      expect(store.getState().chooseReplaced(eva)).toEqual(UNCHANGED);
      expect(store.getState().pending).toEqual(open);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );

  const OTHER_ANSWERS: [string, () => Open, Answer][] = [
    ["nothing pending", idle, "answerStarter"],
    ["the reminder pending", reminder, "answerStarter"],
    ["the choice pending", choosing, "answerStarter"],
    ["the choice pending", choosing, "answerSub"],
    ["the choice pending", choosing, "confirmRemove"],
  ];

  it.each(OTHER_ANSWERS)(
    "RF-047 RF-045 RF-050: with %s, an answer of another kind is unchanged and leaves the pending question as it was (%#)",
    (_label, make, answer) => {
      const { store, db, matchId } = make();
      const before = snapshotOf(store, db, matchId);
      const open = store.getState().pending;
      expect(store.getState()[answer]()).toEqual(UNCHANGED);
      expect(store.getState().pending).toEqual(open);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );
});

describe("match session, the choice list after other changes", () => {
  it("RF-047 RF-057: after any publish the view's replaceableStarters is empty, also on a freshly opened match and after answering sub", () => {
    const { store, db, matchId, ana } = asked();
    expect(reopened(db, matchId).getState().view?.replaceableStarters).toEqual(
      [],
    );
    store.getState().answerSub();
    expect(store.getState().view?.replaceableStarters).toEqual([]);
    expect(store.getState().grid?.marks[`${ana}:P2`]).toBe("sub");
  });
});
