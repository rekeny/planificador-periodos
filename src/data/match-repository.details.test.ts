// T068: editing the details of a saved match (RF-028, RF-082).
// updateMatchDetails writes the date, the time, the two names, the scores and the notes, and never
// the format or the overtime count.
import { loadGridRecords } from "@/data/grid-repository";
import { getMatch, updateMatchDetails } from "@/data/match-repository";
import {
  CHECK_FAILED,
  counts,
  failureOf,
} from "../../tests/data/schema-fixtures";
import {
  addSecondMatch,
  failMatchUpdates,
  openWithMatch,
  row,
  seedMarks,
  sortedMarks,
} from "../../tests/data/grid-write-fixtures";

type Details = Parameters<typeof updateMatchDetails>[2];

const details = (values: Partial<Details> = {}): Details => ({
  date: "2026-12-24",
  time: "18:30",
  homeName: "Alevín A",
  awayName: "Cadete B",
  homeScore: 72,
  awayScore: 65,
  notes: "Llevar petos",
  ...values,
});

describe("match repository, editing the details", () => {
  it("RF-028: every detail is written and the returned record is what a later read gives", () => {
    const { db, teamId, matchId } = openWithMatch(0);
    const saved = updateMatchDetails(db, matchId, details());
    expect(saved).toEqual({
      id: matchId,
      teamId,
      format: 6,
      overtimeCount: 0,
      ...details(),
    });
    expect(getMatch(db, matchId)).toEqual(saved);
  });

  it("RF-028 RF-082: the format, the overtime count, the team and the ID stay as they were", () => {
    const { db, teamId, matchId } = openWithMatch(0, {
      format: 8,
      overtimeCount: 2,
    });
    const saved = updateMatchDetails(db, matchId, details());
    expect(saved).toMatchObject({ id: matchId, teamId, format: 8 });
    expect(saved?.overtimeCount).toBe(2);
  });

  it("RF-028 RF-082: values with a format, an overtime count or a team the type does not have are not written", () => {
    const { db, teamId, matchId } = openWithMatch(0, {
      format: 8,
      overtimeCount: 1,
    });
    const intruders = { ...details(), format: 4, overtimeCount: 9, teamId: 99 };
    updateMatchDetails(db, matchId, intruders);
    expect(getMatch(db, matchId)).toMatchObject({
      teamId,
      format: 8,
      overtimeCount: 1,
    });
  });

  it("RF-028: editing the details twice and reading back gives the second edit only", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details());
    updateMatchDetails(
      db,
      matchId,
      details({ date: "2027-01-09", homeName: "Otro", homeScore: 3 }),
    );
    expect(getMatch(db, matchId)).toMatchObject({
      date: "2027-01-09",
      time: "18:30",
      homeName: "Otro",
      homeScore: 3,
      awayScore: 65,
    });
  });

  it("RF-028 RF-083: clearing the time stores no time, and the date stays", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details({ time: "18:30" }));
    const saved = updateMatchDetails(db, matchId, details({ time: null }));
    expect(saved?.time).toBeNull();
    expect(getMatch(db, matchId)).toMatchObject({
      date: "2026-12-24",
      time: null,
    });
  });

  it("RF-028 RF-083: the time 00:00 is stored as a time, not as no time", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details({ time: "00:00" }));
    expect(getMatch(db, matchId)?.time).toBe("00:00");
  });

  it("RF-028: clearing the names, the notes and the score stores nulls, and a score of 0-0 stays a score", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details());
    updateMatchDetails(
      db,
      matchId,
      details({
        homeName: null,
        awayName: null,
        notes: null,
        homeScore: null,
        awayScore: null,
      }),
    );
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: null,
      awayName: null,
      notes: null,
      homeScore: null,
      awayScore: null,
    });
    updateMatchDetails(db, matchId, details({ homeScore: 0, awayScore: 0 }));
    expect(getMatch(db, matchId)).toMatchObject({
      homeScore: 0,
      awayScore: 0,
    });
  });

  it("RF-028: names of 40 characters and notes of 500, with accents, emoji and quotes, come back unchanged", () => {
    const { db, matchId } = openWithMatch(0);
    const name = "Ñandú «Águila» \"x\" 'y' 🏀 ".padEnd(40, "é").slice(0, 40);
    const notes = "Notas 🏀 'a' \"b\" ".padEnd(500, "ñ").slice(0, 500);
    updateMatchDetails(
      db,
      matchId,
      details({ homeName: name, awayName: `${name.slice(0, 39)}'`, notes }),
    );
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: name,
      awayName: `${name.slice(0, 39)}'`,
      notes,
    });
  });

  it("RF-028 RF-085: a text with a SQL injection attempt is stored as plain text and every table is still there", () => {
    const { db, matchId } = openWithMatch(1);
    const text = "x'); DROP TABLE matches; --";
    updateMatchDetails(db, matchId, details({ notes: text, homeName: text }));
    expect(getMatch(db, matchId)).toMatchObject({
      notes: text,
      homeName: text,
    });
    expect(counts(db).matches).toBe(1);
  });

  it("RF-028 RF-082: editing the details leaves the call-up, the marks and the other matches as they were", () => {
    const { db, teamId, matchId, entryIds, playerIds } = openWithMatch(2, {
      overtimeCount: 1,
    });
    const [ana, luis] = entryIds as [number, number];
    const other = addSecondMatch(db, teamId, playerIds[0] as number, 1);
    seedMarks(db, [
      row(ana, "P1", "starter"),
      row(luis, "OT1", "sub"),
      row(other.entryId, "P2", "sub"),
    ]);
    const otherBefore = getMatch(db, other.matchId);
    const before = counts(db);
    updateMatchDetails(db, matchId, details());
    expect(counts(db)).toEqual(before);
    expect(sortedMarks(loadGridRecords(db, matchId))).toEqual([
      row(ana, "P1", "starter"),
      row(luis, "OT1", "sub"),
    ]);
    expect(getMatch(db, other.matchId)).toEqual(otherBefore);
  });

  it("RF-028: an ID that does not exist gives nothing back and writes nothing", () => {
    const { db, matchId } = openWithMatch(1);
    const before = getMatch(db, matchId);
    const counted = counts(db);
    expect(updateMatchDetails(db, matchId + 1, details())).toBeUndefined();
    expect(updateMatchDetails(db, 0, details())).toBeUndefined();
    expect(getMatch(db, matchId)).toEqual(before);
    expect(counts(db)).toEqual(counted);
  });

  it("RF-028: a score with only one side fails on the check and the match keeps everything it had", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details());
    const before = getMatch(db, matchId);
    const failure = failureOf(() =>
      updateMatchDetails(
        db,
        matchId,
        details({ date: "2030-01-01", homeScore: 5, awayScore: null }),
      ),
    );
    expect(failure).toMatch(CHECK_FAILED);
    expect(getMatch(db, matchId)).toEqual(before);
  });

  it("RF-028 RF-085: a write that fails throws and leaves the details as they were", () => {
    const { db, matchId } = openWithMatch(0);
    updateMatchDetails(db, matchId, details());
    const before = getMatch(db, matchId);
    failMatchUpdates(db);
    const failure = failureOf(() =>
      updateMatchDetails(db, matchId, details({ notes: "Nuevo" })),
    );
    expect(failure).toMatch(/disk full/);
    expect(getMatch(db, matchId)).toEqual(before);
  });
});
