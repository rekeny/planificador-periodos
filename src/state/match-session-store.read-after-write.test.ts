// Codex F3 (BLOCKING): a grid action must not leave a committed write behind when the read that
// follows it fails (the players are read again to publish the view). RF-085: the change either
// fully succeeds and is published (grid, view, history), or it fails and nothing changed (database,
// grid, view, history), with saveFailed set; one retry then changes exactly once. The reads fail
// through a real SQLite trigger plus a guard on `select` (tests/support/read-after-write.ts).
import {
  cellAt,
  fillColumn,
  openedSession,
  savedMarks,
  savedOvertimes,
} from "../../tests/support/match-session-marks";
import { CONSISTENT } from "../../tests/support/read-after-write";
import {
  judgedSession,
  type Session,
} from "../../tests/support/read-after-write-session";

const MARKS: ["marks", "INSERT" | "DELETE"][] = [
  ["marks", "INSERT"],
  ["marks", "DELETE"],
];
const OVERTIME: ["matches", "UPDATE"][] = [["matches", "UPDATE"]];
const makeTap = () => openedSession(6, fillColumn("P1", [1, 2, 3]));
const tapAna = ({ store, entryIds }: Session) =>
  store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P1"));
const undo = ({ store }: Session) => store.getState().undo();
const addOvertime = ({ store }: Session) => store.getState().addOvertime();
const removeOvertime = ({ store }: Session) =>
  store.getState().removeLastOvertime();
const makeWithOvertime = () =>
  openedSession(6, fillColumn("OT1", [0, 1]), { overtimeCount: 1 });
const marksOf = (s: Session, key: string) =>
  savedMarks(s.db, s.matchId).filter((mark) => mark.includes(`:${key}=`));

describe("match session, a read that fails after the write", () => {
  it("RF-044 RF-085 E-025: a tap is either saved and published or saveFailed with the mark not stored", () => {
    const { outcome } = judgedSession(makeTap, MARKS, { act: tapAna });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-044 RF-085: a tap whose publication fails answers saveFailed instead of throwing", () => {
    const { result } = judgedSession(makeTap, MARKS, { act: tapAna });
    expect(result.kind).not.toBe("threw");
  });

  it("RF-044 RF-085: Ana's X is in the database if and only if it is in the displayed grid", () => {
    const { session } = judgedSession(makeTap, MARKS, { act: tapAna });
    const ana = session.entryIds[0] ?? 0;
    const shown = session.store.getState().grid?.marks[`${ana}:P1`];
    expect(marksOf(session, "P1").some((m) => m.startsWith(`${ana}:`))).toBe(
      shown === "starter",
    );
  });

  it("RF-085 RF-057: a tap that failed sets saveFailed and pushes nothing to Undo; a saved one has its entry", () => {
    const { session, result } = judgedSession(makeTap, MARKS, { act: tapAna });
    const state = session.store.getState();
    expect(["saved", "saveFailed"]).toContain(result.kind);
    expect(state.saveFailed).toBe(result.kind === "saveFailed");
    expect(state.history).toHaveLength(result.kind === "saved" ? 1 : 0);
    expect(state.view?.canUndo).toBe(result.kind === "saved");
  });

  it("RF-044 RF-085: after a saveFailed tap the retry leaves exactly one X in Ana's P1 and one Undo entry", () => {
    const { session, retry } = judgedSession(makeTap, MARKS, { act: tapAna });
    const ana = session.entryIds[0] ?? 0;
    expect(retry()).toEqual({ kind: "saved" });
    expect(marksOf(session, "P1")).toContain(`${ana}:P1=starter`);
    expect(session.store.getState().grid?.marks[`${ana}:P1`]).toBe("starter");
    expect(session.store.getState().history).toHaveLength(1);
    expect(session.store.getState().saveFailed).toBe(false);
  });

  it("RF-055 RF-085: undo is either saved and published or saveFailed with the mark still stored", () => {
    const { outcome } = judgedSession(makeTap, MARKS, {
      prepare: tapAna,
      act: undo,
    });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-055 RF-085: after a saveFailed undo the retry removes Ana's X once and the history is empty", () => {
    const { session, retry } = judgedSession(makeTap, MARKS, {
      prepare: tapAna,
      act: undo,
    });
    expect(retry()).toEqual({ kind: "saved" });
    const ana = session.entryIds[0] ?? 0;
    expect(marksOf(session, "P1").some((m) => m.startsWith(`${ana}:`))).toBe(
      false,
    );
    expect(session.store.getState().history).toEqual([]);
    expect(session.store.getState().saveFailed).toBe(false);
  });

  it("RF-058 RF-085: addOvertime is either saved and published or saveFailed with the count unchanged", () => {
    const { outcome } = judgedSession(makeTap, OVERTIME, { act: addOvertime });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-058 RF-085: after a saveFailed addOvertime the retry leaves exactly one overtime", () => {
    const { session, retry } = judgedSession(makeTap, OVERTIME, {
      act: addOvertime,
    });
    expect(retry()).toEqual({ kind: "saved" });
    expect(savedOvertimes(session.db, session.matchId)).toBe(1);
    expect(session.store.getState().grid?.overtimeCount).toBe(1);
  });

  it("RF-059 RF-085: removeLastOvertime is either saved and published or saveFailed with the overtime and its X kept", () => {
    const { outcome } = judgedSession(
      makeWithOvertime,
      [...OVERTIME, ["marks", "DELETE"]],
      { act: removeOvertime },
    );
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-059 RF-085: after a saveFailed removeLastOvertime the retry leaves no overtime and no overtime X", () => {
    const { session, retry } = judgedSession(
      makeWithOvertime,
      [...OVERTIME, ["marks", "DELETE"]],
      { act: removeOvertime },
    );
    expect(retry()).toEqual({ kind: "saved" });
    expect(savedOvertimes(session.db, session.matchId)).toBe(0);
    expect(marksOf(session, "OT1")).toEqual([]);
    expect(session.store.getState().grid?.overtimeCount).toBe(0);
  });
});
