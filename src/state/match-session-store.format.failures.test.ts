// T070: the format change of the open match when saving fails, and the order of reads and writes
// (RF-039, RF-040, RF-085, D3 rule 2). Writes fail through real SQLite triggers and reads through a
// renamed table or a read guard, so no repository is mocked. A failed change publishes nothing,
// leaves the format and the marks as they were, pushes no undo entry and sets saveFailed.
import type { AppDatabase } from "@/data/database-types";
import { loadGridRecords } from "@/data/grid-repository";
import type { Format } from "@/domain/format";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  allowOvertimeWrites,
  failMarkWrites,
  failOvertimeWrites,
  openedSession,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import { tapAt } from "../../tests/support/match-session-undo";
import { reopened } from "../../tests/support/match-session-questions";
import { CONSISTENT } from "../../tests/support/read-after-write";
import { judgedSession } from "../../tests/support/read-after-write-session";

const SAVED = { kind: "saved" } as const;
const SAVE_FAILED = { kind: "saveFailed" } as const;

const MARKS: SeedMark[] = [
  [0, "P1", "starter"],
  [1, "P5", "starter"],
  [2, "P8", "sub"],
  [3, "OT1", "starter"],
];

const savedFormat = (db: AppDatabase, matchId: number) =>
  loadGridRecords(db, matchId)?.match.format;

function eightPeriods() {
  const session = openedSession(8, MARKS, { format: 8, overtimeCount: 1 });
  tapAt(session, 4, "P2");
  return session;
}

/** Everything a failed change must leave alone: the published state, the history and the database. */
function pictureOf(session: ReturnType<typeof eightPeriods>) {
  const { store, db, matchId } = session;
  return {
    ...snapshotOf(store, db, matchId),
    format: savedFormat(db, matchId),
    options: store.getState().view?.formatOptions,
  };
}

describe("match session, a format change that cannot be saved", () => {
  it("RF-085 RF-040: a throwing write of the format answers saveFailed and leaves the format, the marks, the view and the history as they were", () => {
    const session = eightPeriods();
    const { store, db } = session;
    const before = pictureOf(session);
    failOvertimeWrites(db);
    expect(store.getState().changeFormat(4)).toEqual(SAVE_FAILED);
    expect(pictureOf(session)).toEqual(before);
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().grid?.format).toBe(8);
  });

  it("RF-085 RF-040: a throwing delete of the marks rolls the whole change back: the format in the database stays 8 and every mark stays", () => {
    const session = eightPeriods();
    const { store, db, matchId } = session;
    const before = pictureOf(session);
    failMarkWrites(db, "DELETE");
    expect(store.getState().changeFormat(4)).toEqual(SAVE_FAILED);
    expect(savedFormat(db, matchId)).toBe(8);
    expect(pictureOf(session)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085 RF-040 D3 rule 2: a throwing read of the players before the write changes nothing: no format and no mark is written and saveFailed is set", () => {
    const session = eightPeriods();
    const { store, db, matchId } = session;
    const before = pictureOf(session);
    breakReads(db, "players");
    expect(store.getState().changeFormat(4)).toEqual(SAVE_FAILED);
    expect(savedFormat(db, matchId)).toBe(8);
    expect(savedMarks(db, matchId)).toEqual(before.marks);
    expect(pictureOf(session)).toEqual(before);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-085 RF-086: a failed change pushes no undo entry and does not prune the history: «Deshacer» still reverts the mark made before it", () => {
    const session = eightPeriods();
    const { store, db, matchId, entryIds } = session;
    const withP2 = savedMarks(db, matchId);
    failOvertimeWrites(db);
    store.getState().changeFormat(4);
    allowOvertimeWrites(db);
    expect(store.getState().view?.canUndo).toBe(true);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toEqual(
      withP2.filter((m) => m !== `${entryIds[4]}:P2=starter`),
    );
    expect(withP2).toContain(`${entryIds[4]}:P2=starter`);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-085: the next good change clears saveFailed, saves the format once and deletes the marks that disappear", () => {
    const session = eightPeriods();
    const { store, db, matchId } = session;
    failOvertimeWrites(db);
    expect(store.getState().changeFormat(4)).toEqual(SAVE_FAILED);
    allowOvertimeWrites(db);
    expect(store.getState().changeFormat(4)).toEqual(SAVED);
    expect(store.getState().saveFailed).toBe(false);
    expect(savedFormat(db, matchId)).toBe(4);
    expect(savedMarks(db, matchId).some((m) => /:P[5-8]=/.test(m))).toBe(false);
    expect(store.getState().grid?.format).toBe(4);
  });

  it("RF-085: after a failed delete of marks and a retry on a healthy device, a new store reads format 4 and the marks of P1 to P4", () => {
    const session = eightPeriods();
    const { store, db, matchId } = session;
    failMarkWrites(db, "DELETE");
    store.getState().changeFormat(4);
    allowMarkWrites(db, "DELETE");
    expect(store.getState().changeFormat(4)).toEqual(SAVED);
    const fresh = reopened(db, matchId).getState();
    expect(fresh.grid).toEqual(store.getState().grid);
    expect(fresh.grid?.format).toBe(4);
  });
});

describe("match session, a read that fails right after the format is written", () => {
  const WRITES: ["matches" | "marks", "UPDATE" | "DELETE"][] = [
    ["matches", "UPDATE"],
    ["marks", "DELETE"],
  ];
  it.each([
    [8, 4],
    [8, 6],
    [4, 8],
  ] as [Format, Format][])(
    "RF-085 D3 rule 2: changing %i to %i reads everything before the write, so with every read failing after it the change is published, as on a healthy device",
    (from, to) => {
      // Only marks the starting format can hold.
      const marks = MARKS.filter(
        ([, key]) => key.startsWith("OT") || Number(key.slice(1)) <= from,
      );
      const { outcome, result } = judgedSession(
        () => openedSession(8, marks, { format: from, overtimeCount: 1 }),
        WRITES,
        { act: ({ store }) => store.getState().changeFormat(to) },
      );
      expect(result).toEqual(SAVED);
      expect(outcome).toBe("published");
      expect(CONSISTENT).toContain(outcome);
    },
  );
});
