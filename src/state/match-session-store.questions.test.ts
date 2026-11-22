// T062: the questions of the session store: the question «¿Entra de cambio o es titular en lugar de
// otro?» and the reminder of removing an X in a period with a sub (RF-009, RF-045, RF-046, RF-050,
// RF-051, RF-054, RF-055, E-011, E-013). A tap that the domain answers with a question only sets
// `pending`; answerSub() and confirmRemove() save through the repository in one transaction.
// Real in-memory SQLite, the real domain. Failures, cancelling and interruptions are in
// match-session-store.questions.failures.test.ts.
import type { ColumnKey } from "@/domain/column";
import { starterCount } from "@/domain/grid";
import { undoEntryOf } from "../../tests/support/match-session-call-up";
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
import {
  FULL_P2,
  P3_WITH_SUB,
  reopened,
} from "../../tests/support/match-session-questions";
import { placed } from "../../tests/support/match-session-undo";

const P2 = { kind: "period", number: 2 } as const;
const P3 = { kind: "period", number: 3 } as const;

describe("match session, the question of a full period", () => {
  it("E-011 RF-045 RF-046 RF-009: tapping Ana's empty P2 with 5 X only asks; answering sub saves a circled X, P2 keeps its 5 X, one undo entry is pushed and Ana loses one rested", () => {
    const seeds = [...FULL_P2, ...fillColumn("P1", [0])];
    const { store, db, matchId, entryIds } = openedSession(8, seeds);
    const ana = entryIds[0] ?? 0;
    const before = snapshotOf(store, db, matchId);
    expect(store.getState().view?.rows[0]?.counter).toEqual({
      played: 1,
      rested: 5,
    });
    expect(store.getState().tapCell(cellAt(ana, "P2"))).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().pending).toEqual({
      kind: "subOrStarter",
      cell: cellAt(ana, "P2"),
    });
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().answerSub()).toEqual({ kind: "saved" });
    const { grid, history, pending, view } = store.getState();
    expect(grid?.marks[`${ana}:P2`]).toBe("sub");
    expect(savedMarks(db, matchId)).toContain(`${ana}:P2=sub`);
    expect(reopened(db, matchId).getState().grid).toEqual(grid);
    expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
    expect(history).toEqual([undoEntryOf(ana, 2)]);
    expect(pending).toBeNull();
    expect(view?.rows[0]?.counter).toEqual({ played: 1, rested: 4 });
    expect(store.getState().saveFailed).toBe(false);
  });
});

const BOUNDARIES: [string, ColumnKey, SeedMark[], string][] = [
  [
    "P6, a free period, with 5 X gives a circled X at once with no question",
    "P6",
    fillColumn("P6", [1, 2, 3, 4, 5]),
    "sub",
  ],
  [
    "P2 with 4 X gives an X with no question",
    "P2",
    fillColumn("P2", [1, 2, 3, 4]),
    "starter",
  ],
];

describe("match session, taps that ask nothing", () => {
  it.each(BOUNDARIES)("RF-044 RF-048 E-012: %s", (_label, key, seeds, mark) => {
    const { store, db, matchId, entryIds } = openedSession(8, seeds);
    const ana = entryIds[0] ?? 0;
    expect(store.getState().tapCell(cellAt(ana, key)).kind).toBe("saved");
    expect(store.getState().pending).toBeNull();
    expect(savedMarks(db, matchId)).toContain(`${ana}:${key}=${mark}`);
    expect(store.getState().history).toHaveLength(1);
  });
});

describe("match session, the reminder of removing an X", () => {
  it("E-013 RF-050 RF-054: tapping Eva's X in P3 with a sub only asks; removing it anyway empties her cell, keeps the sub as a circled X and P3 shows «≠», not «!»", () => {
    const { store, db, matchId, entryIds } = openedSession(8, P3_WITH_SUB);
    const [eva, sub] = [entryIds[4] ?? 0, entryIds[5] ?? 0];
    expect(store.getState().tapCell(cellAt(eva, "P3"))).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().pending).toEqual({
      kind: "confirmRemoveStarter",
      cell: cellAt(eva, "P3"),
    });
    expect(savedMarks(db, matchId)).toContain(`${eva}:P3=starter`);
    expect(store.getState().confirmRemove()).toEqual({ kind: "saved" });
    const { grid, view, pending, history } = store.getState();
    expect(pending).toBeNull();
    expect(grid?.marks[`${eva}:P3`]).toBeUndefined();
    expect(grid?.marks[`${sub}:P3`]).toBe("sub");
    expect(savedMarks(db, matchId)).toContain(`${sub}:P3=sub`);
    expect(savedMarks(db, matchId)).not.toContain(`${eva}:P3=starter`);
    expect(starterCount(savedGrid(db, matchId), P3)).toBe(4);
    expect(view?.columns.find((c) => c.key === "P3")?.headerMark).toBe(
      "inconsistent",
    );
    expect(history).toEqual([[{ cell: cellAt(eva, "P3"), state: "starter" }]]);
  });

  it("RF-055 RF-046: answering sub for every empty cell of a full P2, one after another, never leaves P2 with 6 X", () => {
    const { store, db, matchId, entryIds } = openedSession(8, FULL_P2);
    for (const row of [0, 6, 7]) {
      store.getState().tapCell(cellAt(entryIds[row] ?? 0, "P2"));
      expect(store.getState().pending?.kind).toBe("subOrStarter");
      store.getState().answerSub();
      expect(mostStarters(savedGrid(db, matchId))).toBe(5);
      expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
    }
    expect(
      savedMarks(db, matchId).filter((m) => m.endsWith("=sub")),
    ).toHaveLength(3);
  });
});

describe("match session, taps and answers while a question is pending", () => {
  it("RF-045 RF-050: with a question pending, a tap on another cell and a second tap on the same cell are unchanged and change nothing", () => {
    const { store, db, matchId, entryIds } = openedSession(8, FULL_P2);
    const ana = entryIds[0] ?? 0;
    store.getState().tapCell(cellAt(ana, "P2"));
    const asked = store.getState().pending;
    const before = snapshotOf(store, db, matchId);
    const others = [cellAt(ana, "P2"), cellAt(ana, "P1")];
    others.push(cellAt(entryIds[1] ?? 0, "P2"), cellAt(entryIds[6] ?? 0, "P2"));
    for (const cell of others) {
      expect(store.getState().tapCell(cell)).toEqual({ kind: "unchanged" });
      expect(store.getState().pending).toEqual(asked);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    }
  });

  it("RF-045 RF-050: answerSub() with the reminder pending, confirmRemove() with the question pending, and both with nothing pending, are unchanged", () => {
    const reminder = openedSession(8, P3_WITH_SUB);
    reminder.store.getState().tapCell(cellAt(reminder.entryIds[4] ?? 0, "P3"));
    const asked = reminder.store.getState().pending;
    const before = snapshotOf(reminder.store, reminder.db, reminder.matchId);
    expect(reminder.store.getState().answerSub()).toEqual({
      kind: "unchanged",
    });
    expect(reminder.store.getState().pending).toEqual(asked);
    expect(snapshotOf(reminder.store, reminder.db, reminder.matchId)).toEqual(
      before,
    );

    const question = openedSession(8, FULL_P2);
    question.store.getState().tapCell(cellAt(question.entryIds[0] ?? 0, "P2"));
    const open = question.store.getState().pending;
    const kept = snapshotOf(question.store, question.db, question.matchId);
    expect(question.store.getState().confirmRemove()).toEqual({
      kind: "unchanged",
    });
    expect(question.store.getState().pending).toEqual(open);
    expect(snapshotOf(question.store, question.db, question.matchId)).toEqual(
      kept,
    );

    const idle = openedSession(8, FULL_P2);
    expect(idle.store.getState().answerSub()).toEqual({ kind: "unchanged" });
    expect(idle.store.getState().confirmRemove()).toEqual({
      kind: "unchanged",
    });
    expect(idle.store.getState().pending).toBeNull();
    expect(savedMarks(idle.db, idle.matchId)).toHaveLength(5);
  });

  it("RF-045: cancelQuestion() with nothing pending changes nothing", () => {
    const { store, db, matchId } = openedSession(8, FULL_P2);
    const before = snapshotOf(store, db, matchId);
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(false);
  });
});

const CIRCLED: [string, ColumnKey, number][] = [
  ["P2, a period with its 5 X in the rule window", "P2", 0],
  ["P6, a free period", "P6", 0],
  ["OT1, an overtime", "OT1", 1],
];

describe("match session, undoing an answer and removing a circled X", () => {
  it("E-011 RF-045 RF-046 RF-057: question, sub, «Deshacer»: the cell is empty again in one press and P2 has 5 X", () => {
    const { store, db, matchId, entryIds } = openedSession(8, FULL_P2);
    const before = placed(store, db, matchId);
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P2"));
    store.getState().answerSub();
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().pending).toBeNull();
  });

  it("E-013 RF-050 RF-054 RF-057: reminder, remove anyway, «Deshacer»: Eva's X is back in one press", () => {
    const { store, db, matchId, entryIds } = openedSession(8, P3_WITH_SUB);
    const before = placed(store, db, matchId);
    store.getState().tapCell(cellAt(entryIds[4] ?? 0, "P3"));
    store.getState().confirmRemove();
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(placed(store, db, matchId)).toEqual(before);
    expect(savedMarks(db, matchId)).toContain(`${entryIds[4]}:P3=starter`);
    expect(store.getState().history).toEqual([]);
  });

  it.each(CIRCLED)(
    "RF-051 RF-045: tapping a circled X in %s empties it with no question",
    (_label, key, overtimeCount) => {
      const seeds = [
        ...fillColumn(key, [1, 2, 3, 4, 5]),
        ...fillColumn(key, [0], "sub"),
      ];
      const { store, db, matchId, entryIds } = openedSession(8, seeds, {
        overtimeCount,
      });
      const ana = entryIds[0] ?? 0;
      expect(store.getState().tapCell(cellAt(ana, key)).kind).toBe("saved");
      expect(store.getState().pending).toBeNull();
      expect(savedMarks(db, matchId).join()).not.toContain(`${ana}:${key}`);
    },
  );
});
