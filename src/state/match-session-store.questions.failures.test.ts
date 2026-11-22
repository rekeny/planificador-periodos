// T062: the questions of the session store when the coach cancels, when the app closes and when
// saving the answer fails (RF-045, RF-050, RF-085, D3 rules 2 and D3-4). Writes fail through real
// SQLite triggers and reads through a renamed table, so no repository is mocked. A failed answer
// closes the question, leaves everything as it was before the tap and sets saveFailed.
import type { ColumnKey } from "@/domain/column";
import {
  breakReads,
  type MatchSessionStore,
} from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  openedSession,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
  reopened,
} from "../../tests/support/match-session-questions";

type Answer = "answerSub" | "confirmRemove";
type Case0 = [
  label: string,
  seeds: readonly SeedMark[],
  row: number,
  key: ColumnKey,
];
// The first four entries of a table row; the answering rows carry two more.
type Case = readonly [...Case0, ...unknown[]];
type Failing = [...Case0, answer: Answer, write: "INSERT" | "DELETE"];

const QUESTION = ["the question on Ana's P2", FULL_P2, 0, "P2"] as const;
const REMINDER = ["the reminder on Eva's P3", P3_WITH_SUB, 4, "P3"] as const;
const CASES = [QUESTION, REMINDER] as const;
const ANSWERS: Failing[] = [
  [...QUESTION, "answerSub", "INSERT"],
  [...REMINDER, "confirmRemove", "DELETE"],
];

function asked([, seeds, row, key]: Case) {
  const session = openedSession(8, seeds);
  const cell = cellAt(session.entryIds[row] ?? 0, key);
  session.store.getState().tapCell(cell);
  // The precondition of every test below: the tap left a question on that cell.
  expect(session.store.getState().pending?.cell).toEqual(cell);
  return { ...session, cell };
}

function answerWith(store: MatchSessionStore, answer: Answer) {
  return store.getState()[answer]();
}

describe("match session, a question left open when the app closes", () => {
  it.each(CASES)(
    "RF-045 RF-050 RF-082: closing the match with %s pending leaves nothing pending and nothing saved, and a new store reads the grid as before the tap",
    (...one) => {
      const { store, db, matchId } = asked(one);
      const gridBefore = store.getState().grid;
      const before = savedMarks(db, matchId);
      store.getState().closeMatch();
      expect(store.getState().pending).toBeNull();
      expect(savedMarks(db, matchId)).toEqual(before);
      const fresh = reopened(db, matchId);
      expect(fresh.getState().pending).toBeNull();
      expect(fresh.getState().grid).toEqual(gridBefore);
      expect(fresh.getState().history).toEqual([]);
    },
  );

  it.each(CASES)(
    "RF-045 RF-050: opening the match again with %s pending drops it",
    (...one) => {
      const { store, matchId } = asked(one);
      store.getState().openMatch(matchId);
      expect(store.getState().pending).toBeNull();
    },
  );
});

describe("match session, cancelling a question", () => {
  it.each(CASES)(
    "RF-045 RF-050: cancelQuestion() with %s pending changes no cell, pushes no undo entry and writes nothing",
    (...one) => {
      const { store, db, matchId } = asked(one);
      const before = snapshotOf(store, db, matchId);
      store.getState().cancelQuestion();
      expect(store.getState().pending).toBeNull();
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().history).toEqual([]);
      expect(store.getState().saveFailed).toBe(false);
    },
  );

  it("RF-045 RF-085: cancelQuestion() leaves saveFailed as it was", () => {
    const { store, db, entryIds } = openedSession(8, FULL_P2);
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[1] ?? 0, "P1"));
    allowMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P2"));
    expect(store.getState().pending).not.toBeNull();
    expect(store.getState().saveFailed).toBe(true);
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(store.getState().saveFailed).toBe(true);
  });
});

describe("match session, an answer that cannot be saved", () => {
  it.each(ANSWERS)(
    "RF-085 RF-045 RF-050: %s, answered with a throwing write: the cell stays as it was, «Deshacer» has nothing new, saveFailed is set and nothing is pending",
    (...failing) => {
      const { store, db, matchId } = asked(failing);
      const [answer, write] = failing.slice(4) as [Answer, "INSERT" | "DELETE"];
      const before = snapshotOf(store, db, matchId);
      failMarkWrites(db, write);
      expect(answerWith(store, answer)).toEqual({ kind: "saveFailed" });
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().history).toEqual([]);
      expect(store.getState().view?.canUndo).toBe(false);
      expect(store.getState().saveFailed).toBe(true);
      expect(store.getState().pending).toBeNull();
    },
  );

  it.each(ANSWERS)(
    "RF-085 RF-045 RF-050: %s, answered with the read before the write throwing: nothing is written, saveFailed is set and nothing is pending",
    (...failing) => {
      const { store, db, matchId } = asked(failing);
      const answer = failing[4] as Answer;
      const before = snapshotOf(store, db, matchId);
      breakReads(db, "players");
      expect(answerWith(store, answer)).toEqual({ kind: "saveFailed" });
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().history).toEqual([]);
      expect(store.getState().saveFailed).toBe(true);
      expect(store.getState().pending).toBeNull();
    },
  );

  it("RF-085 RF-046: after a failed answerSub the coach can tap the same cell again and, with space on the device, the sub is saved and saveFailed clears", () => {
    const { store, db, matchId, cell } = asked(QUESTION);
    failMarkWrites(db, "INSERT");
    store.getState().answerSub();
    allowMarkWrites(db, "INSERT");
    expect(store.getState().tapCell(cell)).toEqual({ kind: "unchanged" });
    expect(store.getState().pending).toEqual({ kind: "subOrStarter", cell });
    expect(store.getState().answerSub()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).toContain(`${cell.entryId}:P2=sub`);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-045 RF-050 RF-085: a tap that asks reads and writes nothing: with every read of players and every write of marks failing it still asks and saveFailed stays false", () => {
    const { store, db, entryIds } = openedSession(8, P3_WITH_SUB);
    failMarkWrites(db, "INSERT");
    failMarkWrites(db, "DELETE");
    breakReads(db, "players");
    const eva = cellAt(entryIds[4] ?? 0, "P3");
    expect(store.getState().tapCell(eva)).toEqual({ kind: "unchanged" });
    expect(store.getState().pending).toEqual({
      kind: "confirmRemoveStarter",
      cell: eva,
    });
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().history).toEqual([]);
  });
});
