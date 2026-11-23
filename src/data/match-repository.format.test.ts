// T068: changing the format of a saved match (RF-038, RF-040, RF-041, RF-082, E-016). The marks of
// the periods above the new count are deleted, the others and every overtime mark stay. Sequences
// and failures halfway through are in match-repository.format.sequences.test.ts.
import {
  changeMatchFormat,
  getMatch,
  updateMatchDetails,
} from "@/data/match-repository";
import {
  CHECK_FAILED,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  addSecondMatch,
  openWithMatch,
  row,
  seedMarks,
  sorted,
} from "../../tests/data/grid-write-fixtures";
import {
  marksOf,
  openMarked,
  type Key,
} from "../../tests/data/format-fixtures";

/** Every format change, in both directions and to the same format (RF-038). */
const CHANGES: readonly (readonly [number, number])[] = [
  [4, 4],
  [4, 6],
  [4, 8],
  [6, 4],
  [6, 6],
  [6, 8],
  [8, 4],
  [8, 6],
  [8, 8],
];

describe("match repository, changing the format", () => {
  it("RF-040 E-016: 8 to 4 deletes the marks of P5 to P8 and keeps those of P1 to P4 and the overtimes", () => {
    const { db, matchId, ana, all } = openMarked(8);
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, matchId)?.format).toBe(4);
    expect(marksOf(db, matchId)).toEqual(
      sorted(
        all.filter(
          (mark) => mark.columnNumber <= 4 || mark.columnKind === "overtime",
        ),
      ),
    );
    expect(marksOf(db, matchId).map((mark) => mark.callUpEntryId)).toEqual(
      Array(6).fill(ana),
    );
  });

  it("RF-040 RF-038 E-016: 4 to 8 deletes nothing and leaves every mark as it was", () => {
    const { db, matchId, all } = openMarked(4);
    changeMatchFormat(db, matchId, 8);
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
  });

  it.each(CHANGES)(
    "RF-038 RF-040 RF-041 E-016: format %i to %i keeps the marks of the periods that still exist and every overtime mark",
    (from, to) => {
      const { db, matchId, all } = openMarked(from);
      changeMatchFormat(db, matchId, to);
      expect(getMatch(db, matchId)?.format).toBe(to);
      expect(marksOf(db, matchId)).toEqual(
        sorted(
          all.filter(
            (mark) => mark.columnKind === "overtime" || mark.columnNumber <= to,
          ),
        ),
      );
    },
  );

  it("RF-041: a 6-period match with one overtime changed to 4 periods keeps the overtime, its count and its marks", () => {
    const { db, matchId, entryIds } = openWithMatch(2, {
      format: 6,
      overtimeCount: 1,
    });
    const [ana, luis] = entryIds as [number, number];
    seedMarks(db, [
      row(ana, "P4", "starter"),
      row(ana, "P5", "sub"),
      row(luis, "OT1", "starter"),
      row(ana, "OT1", "sub"),
    ]);
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, matchId)).toMatchObject({
      format: 4,
      overtimeCount: 1,
    });
    expect(marksOf(db, matchId)).toEqual(
      sorted([
        row(ana, "P4", "starter"),
        row(luis, "OT1", "starter"),
        row(ana, "OT1", "sub"),
      ]),
    );
  });

  it("RF-041: overtime marks numbered like the deleted periods (OT5 and OT6) are kept", () => {
    const { db, matchId, entryIds } = openWithMatch(1, {
      format: 8,
      overtimeCount: 6,
    });
    const [ana] = entryIds as [number];
    const overtimes: Key[] = ["OT5", "OT6"];
    seedMarks(db, [
      row(ana, "P5", "starter"),
      row(ana, "P6", "sub"),
      ...overtimes.map((key) => row(ana, key, "starter")),
    ]);
    changeMatchFormat(db, matchId, 4);
    expect(marksOf(db, matchId)).toEqual(
      sorted(overtimes.map((key) => row(ana, key, "starter"))),
    );
  });

  it("RF-040: the marks of every player in the disappearing periods are deleted, starters and substitutes alike", () => {
    const { db, matchId, entryIds } = openWithMatch(3, { format: 8 });
    const [ana, luis, eva] = entryIds as [number, number, number];
    seedMarks(db, [
      row(ana, "P5", "starter"),
      row(luis, "P5", "sub"),
      row(eva, "P8", "starter"),
      row(eva, "P4", "sub"),
    ]);
    changeMatchFormat(db, matchId, 4);
    expect(marksOf(db, matchId)).toEqual([row(eva, "P4", "sub")]);
    expect(counts(db).call_up_entries).toBe(3);
  });

  it("RF-040: a match with no marks, and one with no call-up, change their format and nothing else", () => {
    const empty = openWithMatch(0, { format: 8 });
    const unmarked = openWithMatch(2, { format: 6 });
    changeMatchFormat(empty.db, empty.matchId, 4);
    changeMatchFormat(unmarked.db, unmarked.matchId, 8);
    expect(getMatch(empty.db, empty.matchId)?.format).toBe(4);
    expect(getMatch(unmarked.db, unmarked.matchId)?.format).toBe(8);
    expect(counts(unmarked.db)).toMatchObject({ call_up_entries: 2, marks: 0 });
  });

  it("RF-040 RF-082: the details, the team and the overtime count of the match stay as they were", () => {
    const { db, teamId, matchId } = openWithMatch(0, {
      format: 8,
      overtimeCount: 3,
    });
    updateMatchDetails(db, matchId, {
      date: "2026-12-24",
      time: "18:30",
      homeName: "Alevín A",
      awayName: "Cadete B",
      homeScore: 72,
      awayScore: 65,
      notes: "Llevar petos",
    });
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, matchId)).toEqual({
      id: matchId,
      teamId,
      format: 4,
      overtimeCount: 3,
      date: "2026-12-24",
      time: "18:30",
      homeName: "Alevín A",
      awayName: "Cadete B",
      homeScore: 72,
      awayScore: 65,
      notes: "Llevar petos",
    });
  });

  it("RF-040: changing one match leaves the format and the marks of the team's other match", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(1, {
      format: 8,
    });
    const other = addSecondMatch(db, teamId, playerIds[0] as number, 1);
    seedMarks(db, [
      row(entryIds[0] as number, "P6", "starter"),
      row(other.entryId, "P6", "sub"),
      row(other.entryId, "OT1", "starter"),
    ]);
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, other.matchId)?.format).toBe(6);
    expect(marksOf(db, other.matchId)).toEqual(
      sorted([
        row(other.entryId, "P6", "sub"),
        row(other.entryId, "OT1", "starter"),
      ]),
    );
  });

  it("RF-040: a match ID that does not exist changes no match and no mark", () => {
    const { db, matchId, all } = openMarked(8);
    failureOf(() => changeMatchFormat(db, matchId + 1, 4));
    failureOf(() => changeMatchFormat(db, 0, 4));
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, matchId)?.format).toBe(4);
  });

  it("RF-038 RF-040: a format that is not 4, 6 or 8 is refused by the check and the format and the marks stay", () => {
    const { db, matchId, all } = openMarked(8);
    const failure = failureOf(() => changeMatchFormat(db, matchId, 5));
    expect(failure).toMatch(CHECK_FAILED);
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
  });
});
