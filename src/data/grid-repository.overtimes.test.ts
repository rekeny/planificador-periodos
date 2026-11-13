// T049: addOvertime(db, matchId) and removeLastOvertime(db, matchId) (RF-058, RF-059, RF-085).
// removeLastOvertime deletes the marks of that overtime in the same transaction as the count.
import {
  addOvertime,
  loadGridRecords,
  removeLastOvertime,
  saveCellChanges,
} from "@/data/grid-repository";
import { counts, failureOf } from "../../tests/data/schema-fixtures";
import {
  addSecondMatch,
  change,
  failMarkDeletes,
  failMatchUpdates,
  openWithMatch,
  row,
  seedMarks,
  sorted,
  sortedMarks,
} from "../../tests/data/grid-write-fixtures";

const countOf = (db: Parameters<typeof loadGridRecords>[0], id: number) =>
  loadGridRecords(db, id)?.match.overtimeCount;

describe("grid repository, adding overtimes", () => {
  it("RF-058: adding an overtime raises the count by one each time, with no limit", () => {
    const { db, matchId } = openWithMatch(1);
    const seen = [1, 2, 3, 4].map(() => {
      addOvertime(db, matchId);
      return countOf(db, matchId);
    });
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it("RF-058 RF-056: an overtime added, a mark saved in it and the match loaded gives the count and the mark", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    addOvertime(db, matchId);
    saveCellChanges(db, matchId, [change(ana, "OT1", "starter")]);
    const records = loadGridRecords(db, matchId);
    expect(records?.match.overtimeCount).toBe(1);
    expect(records?.marks).toEqual([row(ana, "OT1", "starter")]);
  });

  it("RF-058: adding an overtime changes no mark and no other match", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    const other = addSecondMatch(db, teamId, playerIds[0] as number, 2);
    seedMarks(db, [row(ana, "P1", "sub")]);
    addOvertime(db, matchId);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P1", "sub"),
    ]);
    expect(countOf(db, other.matchId)).toBe(2);
  });

  it("RF-085: addOvertime failing leaves the overtime count as it was", () => {
    const { db, matchId } = openWithMatch(1, { overtimeCount: 1 });
    failMatchUpdates(db);
    const failure = failureOf(() => addOvertime(db, matchId));
    expect(failure).toMatch(/disk full/);
    expect(countOf(db, matchId)).toBe(1);
  });

  it("RF-058 RF-085: adding an overtime to a match that does not exist creates nothing and changes no other match", () => {
    const { db, matchId } = openWithMatch(1, { overtimeCount: 1 });
    addOvertime(db, matchId);
    failureOf(() => addOvertime(db, matchId + 1));
    expect(loadGridRecords(db, matchId + 1)).toBeUndefined();
    expect(countOf(db, matchId)).toBe(2);
    expect(counts(db).matches).toBe(1);
  });
});

describe("grid repository, removing the last overtime", () => {
  it("RF-059: removing the only overtime, with no marks in it, leaves the count at 0 and the period marks", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 1 });
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "P1", "starter")]);
    removeLastOvertime(db, matchId);
    expect(countOf(db, matchId)).toBe(0);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P1", "starter"),
    ]);
  });

  it("RF-059: removing an overtime with marks deletes only its marks, not the period marks, even of the same number", () => {
    const { db, matchId, entryIds } = openWithMatch(2, { overtimeCount: 1 });
    const [ana, luis] = entryIds as [number, number];
    seedMarks(db, [
      row(ana, "P1", "starter"),
      row(luis, "P1", "sub"),
      row(ana, "OT1", "starter"),
      row(luis, "OT1", "sub"),
    ]);
    removeLastOvertime(db, matchId);
    expect(countOf(db, matchId)).toBe(0);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual(
      sorted([row(ana, "P1", "starter"), row(luis, "P1", "sub")]),
    );
  });

  it("RF-059: with two overtimes, removing the last leaves one with its marks", () => {
    const { db, matchId, entryIds } = openWithMatch(2, { overtimeCount: 2 });
    const [ana, luis] = entryIds as [number, number];
    seedMarks(db, [
      row(ana, "OT1", "starter"),
      row(luis, "OT1", "sub"),
      row(ana, "OT2", "starter"),
    ]);
    removeLastOvertime(db, matchId);
    expect(countOf(db, matchId)).toBe(1);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual(
      sorted([row(ana, "OT1", "starter"), row(luis, "OT1", "sub")]),
    );
  });

  it("RF-059: marks only in overtime 2 are all deleted when it is removed", () => {
    const { db, matchId, entryIds } = openWithMatch(3, { overtimeCount: 2 });
    seedMarks(
      db,
      entryIds.map((id) => row(id, "OT2", "starter")),
    );
    removeLastOvertime(db, matchId);
    expect(countOf(db, matchId)).toBe(1);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([]);
    expect(counts(db).marks).toBe(0);
  });

  it("RF-059: removing the overtimes one after the other deletes each one's marks and the count never goes below 0", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 3 });
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "OT1", "sub"), row(ana, "OT3", "starter")]);
    const seen = [1, 2, 3, 4].map(() => {
      removeLastOvertime(db, matchId);
      return [countOf(db, matchId), counts(db).marks];
    });
    expect(seen).toEqual([
      [2, 1],
      [1, 1],
      [0, 0],
      [0, 0],
    ]);
  });

  it("RF-059: removing an overtime of one match leaves the overtimes and marks of another match", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1, {
      overtimeCount: 1,
    });
    const [ana] = entryIds as [number];
    const other = addSecondMatch(db, teamId, playerIds[0] as number, 1);
    seedMarks(db, [
      row(ana, "OT1", "starter"),
      row(other.entryId, "OT1", "sub"),
    ]);
    removeLastOvertime(db, matchId);
    expect(countOf(db, other.matchId)).toBe(1);
    expect(loadGridRecords(db, other.matchId)?.marks).toEqual([
      row(other.entryId, "OT1", "sub"),
    ]);
  });

  it("RF-059: removing with no overtime changes nothing, not even the period marks, and does not throw", () => {
    const { db, matchId, entryIds } = openWithMatch(1);
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "P1", "starter")]);
    const failure = failureOf(() => removeLastOvertime(db, matchId));
    expect(failure).toBe("");
    expect(countOf(db, matchId)).toBe(0);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "P1", "starter"),
    ]);
  });

  it("RF-059 RF-085: removing from a match that does not exist changes no other match", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 1 });
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "OT1", "starter")]);
    addOvertime(db, matchId);
    failureOf(() => removeLastOvertime(db, matchId + 1));
    expect(countOf(db, matchId)).toBe(2);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "OT1", "starter"),
    ]);
  });

  it("RF-059 RF-085: the count cannot be written, so the overtime marks stay and the count as it was (one transaction)", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 2 });
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "OT2", "starter"), row(ana, "P1", "sub")]);
    failMatchUpdates(db);
    const failure = failureOf(() => removeLastOvertime(db, matchId));
    expect(failure).toMatch(/disk full/);
    expect(countOf(db, matchId)).toBe(2);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual(
      sorted([row(ana, "OT2", "starter"), row(ana, "P1", "sub")]),
    );
  });

  it("RF-059 RF-085: the marks cannot be deleted, so the count stays as it was (one transaction)", () => {
    const { db, matchId, entryIds } = openWithMatch(1, { overtimeCount: 2 });
    const [ana] = entryIds as [number];
    seedMarks(db, [row(ana, "OT2", "starter")]);
    failMarkDeletes(db);
    const failure = failureOf(() => removeLastOvertime(db, matchId));
    expect(failure).toMatch(/disk full/);
    expect(countOf(db, matchId)).toBe(2);
    expect(loadGridRecords(db, matchId)?.marks).toEqual([
      row(ana, "OT2", "starter"),
    ]);
  });
});
