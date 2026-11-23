// T068: several format changes in a row, and a failure halfway through one (RF-038, RF-040,
// RF-082, E-016). The format and the marks change in one transaction.
import { sql } from "drizzle-orm";
import {
  changeMatchFormat,
  getMatch,
  updateMatchDetails,
} from "@/data/match-repository";
import { failureOf } from "../../tests/data/schema-fixtures";
import {
  failMarkDeletes,
  failMatchUpdates,
  openWithMatch,
  sorted,
} from "../../tests/data/grid-write-fixtures";
import { marksOf, openMarked } from "../../tests/data/format-fixtures";

describe("match repository, several changes in a row", () => {
  it("RF-040 E-016: 8 to 4 and back to 8 does not bring back the deleted marks", () => {
    const { db, matchId, all } = openMarked(8);
    changeMatchFormat(db, matchId, 4);
    changeMatchFormat(db, matchId, 8);
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(
      sorted(
        all.filter(
          (mark) => mark.columnKind === "overtime" || mark.columnNumber <= 4,
        ),
      ),
    );
  });

  it("RF-038 RF-040: 8 to 6 and then to 4 deletes P7 and P8 first and P5 and P6 next", () => {
    const { db, matchId, all } = openMarked(8);
    changeMatchFormat(db, matchId, 6);
    expect(marksOf(db, matchId)).toHaveLength(all.length - 2);
    changeMatchFormat(db, matchId, 4);
    expect(marksOf(db, matchId)).toHaveLength(all.length - 4);
  });

  it("RF-082: after a format change, saving the details keeps the new format and the details are saved", () => {
    const { db, matchId } = openWithMatch(0, { format: 6 });
    changeMatchFormat(db, matchId, 8);
    updateMatchDetails(db, matchId, {
      date: "2026-12-24",
      time: null,
      homeName: "Local B",
      awayName: null,
      homeScore: null,
      awayScore: null,
      notes: null,
    });
    expect(getMatch(db, matchId)).toMatchObject({
      format: 8,
      date: "2026-12-24",
      homeName: "Local B",
    });
  });

  it("RF-082: saving the details and then changing the format keeps the details", () => {
    const { db, matchId } = openWithMatch(0, { format: 8 });
    updateMatchDetails(db, matchId, {
      date: "2027-02-02",
      time: "09:00",
      homeName: "A",
      awayName: "B",
      homeScore: 1,
      awayScore: 2,
      notes: "n",
    });
    changeMatchFormat(db, matchId, 4);
    expect(getMatch(db, matchId)).toMatchObject({
      format: 4,
      date: "2027-02-02",
      time: "09:00",
      homeScore: 1,
      notes: "n",
    });
  });
});

describe("match repository, a failure halfway through a format change", () => {
  it("RF-040 RF-082: the marks cannot be deleted, so the format and every mark stay as they were", () => {
    const { db, matchId, all } = openMarked(8);
    failMarkDeletes(db);
    expect(failureOf(() => changeMatchFormat(db, matchId, 4))).toMatch(
      /disk full/,
    );
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
  });

  it("RF-040 RF-082: the format cannot be written, so every mark stays and so does the format", () => {
    const { db, matchId, all } = openMarked(8);
    failMatchUpdates(db);
    expect(failureOf(() => changeMatchFormat(db, matchId, 4))).toMatch(
      /disk full/,
    );
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
  });

  it("RF-040 RF-082: a statement that throws right after the format update leaves the old format and every mark", () => {
    const { db, matchId, all } = openMarked(8);
    db.run(
      sql.raw(
        `CREATE TRIGGER fail_after_update AFTER UPDATE ON matches ` +
          `BEGIN SELECT RAISE(ABORT, 'disk full'); END`,
      ),
    );
    expect(failureOf(() => changeMatchFormat(db, matchId, 4))).toMatch(
      /disk full/,
    );
    expect(getMatch(db, matchId)?.format).toBe(8);
    expect(marksOf(db, matchId)).toEqual(sorted(all));
  });
});
