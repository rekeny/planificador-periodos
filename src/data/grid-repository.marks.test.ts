// T049: saveCellChanges(db, matchId, changes) writes marks (RF-056, RF-082, RF-085). Each Cell
// maps to call_up_entry_id, column_kind and column_number; "empty" deletes the row; one transaction.
import { loadGridRecords, saveCellChanges } from "@/data/grid-repository";
import { counts, failureOf } from "../../tests/data/schema-fixtures";
import {
  addSecondMatch,
  change,
  failMarkInserts,
  openWithMatch,
  row,
  seedMarks,
  sortedMarks,
  sorted,
} from "../../tests/data/grid-write-fixtures";

describe("grid repository, saving cell changes", () => {
  it("RF-056 RF-082: three marks saved are read back as the same three records", () => {
    const { db, matchId, entryIds } = openWithMatch(2);
    const [ana, luis] = entryIds as [number, number];
    saveCellChanges(db, matchId, [
      change(ana, "P1", "starter"),
      change(ana, "P4", "sub"),
      change(luis, "P1", "starter"),
    ]);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual(
      sorted([
        row(ana, "P1", "starter"),
        row(ana, "P4", "sub"),
        row(luis, "P1", "starter"),
      ]),
    );
  });

  it("RF-056 RF-058: a mark in an overtime is saved as an overtime row and read back with the overtime count", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 1 });
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [change(ana, "OT1", "sub")]);
    const records = loadGridRecords(db, matchId);
    expect(records?.match.overtimeCount).toBe(1);
    expect(records?.marks).toEqual([row(ana, "OT1", "sub")]);
  });

  it("RF-056 RF-058: a mark in overtime 3 and one in period 8 are saved in their own kind and number", () => {
    const { db, matchId, entryIds } = openWithMatch(1, {
      format: 8,
      overtimeCount: 3,
    });
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [
      change(ana, "OT3", "starter"),
      change(ana, "P8", "sub"),
    ]);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual(
      sorted([row(ana, "OT3", "starter"), row(ana, "P8", "sub")]),
    );
  });

  it("RF-056: period 2 and overtime 2 of the same entry are different cells", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 2 });
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [change(ana, "P2", "starter")]);
    saveCellChanges(db, matchId, [change(ana, "OT2", "sub")]);
    saveCellChanges(db, matchId, [change(ana, "P2", "empty")]);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "OT2", "sub"),
    ]);
  });

  it("RF-056: a match with no marks and no overtimes reads back empty, and an empty list of changes writes nothing", () => {
    const { db, matchId } = openWithMatch(2);
    saveCellChanges(db, matchId, []);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([]);
    expect(loadGridRecords(db, matchId)?.match.overtimeCount).toBe(0);
    expect(counts(db).marks).toBe(0);
  });

  it("RF-056 RF-082: the same change saved twice leaves one row", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [change(ana, "P3", "starter")]);
    saveCellChanges(db, matchId, [change(ana, "P3", "starter")]);
    expect(counts(db).marks).toBe(1);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P3", "starter"),
    ]);
  });

  it("RF-056: two changes of the same cell in one list leave one row with the last state", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [
      change(ana, "P3", "starter"),
      change(ana, "P3", "sub"),
    ]);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P3", "sub"),
    ]);
  });

  it("RF-056: an empty change on a cell with no row does nothing and does not throw, and leaves the other marks", () => {
    const { db, matchId, entryIds } = openWithMatch(2);
    const [ana, luis] = entryIds as [number, number];
    seedMarks(db, [row(luis, "P1", "starter")]);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId, [change(ana, "P5", "empty")]),
    );
    expect(failure).toBe("");
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(luis, "P1", "starter"),
    ]);
  });

  it("RF-056 RF-057: X, then circled X, then empty on the same cell leaves one row each time and none at the end", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    const states = ["starter", "sub", "empty"] as const;
    const seen = states.map((state) => {
      saveCellChanges(db, matchId, [change(ana, "P2", state)]);
      return loadGridRecords(db, matchId)?.marks;
    });
    expect(seen).toEqual([
      [row(ana, "P2", "starter")],
      [row(ana, "P2", "sub")],
      [],
    ]);
  });

  it("RF-056: the marks of another match stay untouched when this one is saved, replaced or emptied", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    const other = addSecondMatch(db, teamId, playerIds[0] as number);
    seedMarks(db, [row(other.entryId, "P1", "starter")]);
    saveCellChanges(db, matchId, [change(ana, "P1", "sub")]);
    saveCellChanges(db, matchId, [change(ana, "P1", "empty")]);
    expect(loadGridRecords(db, other.matchId)?.marks).toEqual([
      row(other.entryId, "P1", "starter"),
    ]);
  });
});

describe("grid repository, writes that are rejected", () => {
  it("RF-085: a failure in the second change of a replacement leaves neither change saved", () => {
    const { db, matchId, entryIds } = openWithMatch(2);
    const [ana, luis] = entryIds as [number, number];
    seedMarks(db, [row(ana, "P2", "starter")]);
    failMarkInserts(db, 3);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId, [
        change(ana, "P2", "empty"),
        change(luis, "P3", "starter"),
      ]),
    );
    expect(failure).toMatch(/disk full/);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P2", "starter"),
    ]);
  });

  it("RF-085: a failure in the second of two new marks leaves the first one unsaved too", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    failMarkInserts(db, 2);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId, [
        change(ana, "P1", "starter"),
        change(ana, "P2", "starter"),
      ]),
    );
    expect(failure).toMatch(/disk full/);
    expect(counts(db).marks).toBe(0);
  });

  it("RF-085: a mark of an entry that is in another match is rejected and nothing is written", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    const other = addSecondMatch(db, teamId, playerIds[0] as number);
    saveCellChanges(db, matchId, [change(ana, "P9", "sub")]);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId, [
        change(ana, "P1", "starter"),
        change(other.entryId, "P1", "starter"),
      ]),
    );
    expect(failure).not.toBe("");
    expect(counts(db).marks).toBe(1);
  });

  it("RF-085: a mark of an entry that does not exist is rejected and nothing is written", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [change(ana, "P9", "sub")]);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId, [
        change(ana, "P1", "starter"),
        change(ana + 100, "P1", "starter"),
      ]),
    );
    expect(failure).not.toBe("");
    expect(counts(db).marks).toBe(1);
  });

  it("RF-085: an empty change for an entry of another match does not delete that match's mark", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1);
    const other = addSecondMatch(db, teamId, playerIds[0] as number);
    seedMarks(db, [row(other.entryId, "P1", "starter")]);
    saveCellChanges(db, matchId, [change(entryIds[0] as number, "P2", "sub")]);
    failureOf(() =>
      saveCellChanges(db, matchId, [change(other.entryId, "P1", "empty")]),
    );
    expect(loadGridRecords(db, other.matchId)?.marks).toEqual([
      row(other.entryId, "P1", "starter"),
    ]);
  });

  it("RF-085: saving marks for a match that does not exist is rejected and nothing is written", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    saveCellChanges(db, matchId, [change(ana, "P9", "sub")]);
    const failure = failureOf(() =>
      saveCellChanges(db, matchId + 1, [change(ana, "P1", "starter")]),
    );
    expect(failure).not.toBe("");
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P9", "sub"),
    ]);
  });
});
