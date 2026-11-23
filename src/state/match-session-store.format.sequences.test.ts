// T070: sequences of the format change with the undo history and with the app closing (RF-039,
// RF-040, RF-056, RF-057, RF-082, RF-086, E-016). Real in-memory SQLite and the real domain.
import type { Format } from "@/domain/format";
import { loadGridRecords } from "@/data/grid-repository";
import type { AppDatabase } from "@/data/database-types";
import {
  openedSession,
  savedGrid,
  savedMarks,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import { reopened } from "../../tests/support/match-session-questions";
import { tapAt } from "../../tests/support/match-session-undo";

const SAVED = { kind: "saved" } as const;
const UNCHANGED = { kind: "unchanged" } as const;

const savedFormat = (db: AppDatabase, matchId: number) =>
  loadGridRecords(db, matchId)?.match.format;

/** One X in every period of the format, on rotating rows, plus a circled X in overtime 1. */
function marksFor(format: Format): SeedMark[] {
  const periods = Array.from({ length: format }, (_, i): SeedMark => {
    return [i % 8, `P${i + 1}`, "starter"];
  });
  return [...periods, [7, "OT1", "sub"]];
}

/** The marks the database must hold after the change: the periods that exist, and the overtime. */
function keptAfter(
  entryIds: readonly number[],
  from: Format,
  to: Format,
): string[] {
  return marksFor(from)
    .filter(([, key]) => key.startsWith("OT") || Number(key.slice(1)) <= to)
    .map(([row, key, mark]) => `${entryIds[row] ?? 0}:${key}=${mark}`)
    .sort();
}

function withMarks(format: Format) {
  return openedSession(8, marksFor(format), { format, overtimeCount: 1 });
}

describe("match session, the format change and the undo history", () => {
  it("RF-057 RF-086: a format change pushes no undo entry: with an empty history there is nothing to undo and the format stays", () => {
    const { store, db, matchId } = withMarks(8);
    store.getState().changeFormat(4);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
    expect(store.getState().undo()).toEqual(UNCHANGED);
    expect(store.getState().grid?.format).toBe(4);
    expect(savedFormat(db, matchId)).toBe(4);
  });

  it("RF-056 RF-086: mark P2, change 6 to 8, undo reverts P2: the history survives the change, and the format stays 8", () => {
    const session = openedSession(8, [], { format: 6 });
    const { store, db, matchId } = session;
    tapAt(session, 0, "P2");
    expect(store.getState().changeFormat(8)).toEqual(SAVED);
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().view?.canUndo).toBe(true);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(store.getState().grid?.marks).toEqual({});
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().grid?.format).toBe(8);
    expect(savedFormat(db, matchId)).toBe(8);
  });

  it("RF-086: an entry whose cell disappeared with the format is dropped, and the older entries are kept and undone one press each", () => {
    const session = openedSession(8, [], { format: 8 });
    const { store, db, matchId } = session;
    tapAt(session, 0, "P1");
    tapAt(session, 1, "P6");
    store.getState().changeFormat(4);
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().undo()).toEqual(UNCHANGED);
    expect(store.getState().view?.canUndo).toBe(false);
  });

  it("RF-040 RF-086 E-016: 8 to 4 to 8 then undo never brings back the old P5 to P8 marks, in the grid or in the database", () => {
    const session = openedSession(8, [[2, "P5", "starter"]], {
      format: 8,
      overtimeCount: 0,
    });
    const { store, db, matchId } = session;
    tapAt(session, 0, "P6");
    tapAt(session, 1, "P1");
    tapAt(session, 3, "P8");
    store.getState().changeFormat(4);
    store.getState().changeFormat(8);
    expect(store.getState().grid?.marks).toEqual(savedGrid(db, matchId).marks);
    expect(savedMarks(db, matchId)).toHaveLength(1);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(store.getState().undo()).toEqual(UNCHANGED);
    expect(store.getState().grid?.marks).toEqual({});
    expect(savedMarks(db, matchId)).toEqual([]);
    expect(store.getState().view?.rows.every((row) => !row.hasMarks)).toBe(
      true,
    );
  });

  it("RF-040 E-016: after 8 to 4 to 8 the periods P5 to P8 are empty again: the marks deleted by the change do not come back", () => {
    const { store, db, matchId } = withMarks(8);
    store.getState().changeFormat(4);
    store.getState().changeFormat(8);
    const marks = savedMarks(db, matchId);
    expect(marks.some((m) => /:P[5-8]=/.test(m))).toBe(false);
    expect(marks.filter((m) => /:P[1-4]=/.test(m))).toHaveLength(4);
    expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
  });

  it("RF-056 RF-082: marking in a period that exists only after the change is saved and undone like any mark", () => {
    const session = openedSession(8, [], { format: 4 });
    const { store, db, matchId, entryIds } = session;
    store.getState().changeFormat(6);
    expect(tapAt(session, 0, "P6")).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toEqual([`${entryIds[0]}:P6=starter`]);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toEqual([]);
  });
});

describe("match session, a format change and the app closing", () => {
  it("RF-082 RF-039: closing the match after a format change and opening it again shows the new format, with its marks", () => {
    const { store, db, matchId, entryIds } = withMarks(6);
    store.getState().changeFormat(8);
    store.getState().closeMatch();
    store.getState().openMatch(matchId);
    expect(store.getState().grid?.format).toBe(8);
    expect(store.getState().view?.format).toBe(8);
    expect(store.getState().view?.formatOptions).toContainEqual({
      format: 8,
      isCurrent: true,
    });
    expect(savedMarks(db, matchId)).toEqual(keptAfter(entryIds, 6, 8));
  });

  it("RF-082 RF-040: a new store on the same database after 8 to 6 shows format 6 with P7 and P8 gone", () => {
    const { store, db, matchId } = withMarks(8);
    store.getState().changeFormat(6);
    const fresh = reopened(db, matchId).getState();
    expect(fresh.grid?.format).toBe(6);
    expect(fresh.history).toEqual([]);
    expect(
      Object.keys(fresh.grid?.marks ?? {}).some((k) => /:P[78]$/.test(k)),
    ).toBe(false);
  });
});
