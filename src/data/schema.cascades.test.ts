// T028: foreign keys, cascades and transactions of the schema, proven on a migrated in-memory
// database (RF-016, RF-017, RF-025). Checks, defaults and stored values are in
// schema.checks.test.ts.
import { eq } from "drizzle-orm";
import { callUpEntries, matches, players, teams } from "@/data/schema";
import {
  CHECK_FAILED,
  FOREIGN_KEY_FAILED,
  addEntry,
  addMark,
  addMatch,
  addPlayer,
  addTeam,
  counts,
  failureOf,
  openDatabase,
  type Db,
} from "../../tests/data/schema-fixtures";

// A team with two players, two matches, three call-up entries and five marks.
function seedTeam(db: Db, name: string) {
  const teamId = addTeam(db, { name });
  const juan = addPlayer(db, teamId, { name: "Juan", number: "7" });
  const ana = addPlayer(db, teamId, { name: "Ana", number: "0" });
  const first = addMatch(db, teamId);
  const second = addMatch(db, teamId);
  const firstJuan = addEntry(db, first, juan);
  const firstAna = addEntry(db, first, ana, { playerName: "Ana" });
  const secondJuan = addEntry(db, second, juan);
  addMark(db, firstJuan, { columnNumber: 1 });
  addMark(db, firstJuan, { columnNumber: 2, mark: "sub" });
  addMark(db, firstAna, { columnKind: "overtime", columnNumber: 1 });
  addMark(db, secondJuan, { columnNumber: 1 });
  addMark(db, secondJuan, { columnNumber: 3 });
  return { teamId, juan, first, second, firstJuan, firstAna };
}

const EMPTY = {
  teams: 0,
  players: 0,
  matches: 0,
  call_up_entries: 0,
  marks: 0,
};

describe("schema, cascades", () => {
  it("RF-016 RF-017 RF-025: deleting a team removes its players, matches, call-up entries and marks", () => {
    const db = openDatabase();
    const { teamId } = seedTeam(db, "Mini");
    expect(counts(db)).toEqual({
      teams: 1,
      players: 2,
      matches: 2,
      call_up_entries: 3,
      marks: 5,
    });
    db.delete(teams).where(eq(teams.id, teamId)).run();
    expect(counts(db)).toEqual(EMPTY);
  });

  it("RF-016 RF-025: deleting a team leaves every row of the other team", () => {
    const db = openDatabase();
    const { teamId } = seedTeam(db, "Mini");
    seedTeam(db, "Other");
    db.delete(teams).where(eq(teams.id, teamId)).run();
    expect(counts(db)).toEqual({
      teams: 1,
      players: 2,
      matches: 2,
      call_up_entries: 3,
      marks: 5,
    });
  });

  it("RF-025: deleting one match removes its call-up and marks and leaves the other matches of the team", () => {
    const db = openDatabase();
    const { first, second } = seedTeam(db, "Mini");
    db.delete(matches).where(eq(matches.id, first)).run();
    expect(
      db
        .select()
        .from(matches)
        .all()
        .map((m) => m.id),
    ).toEqual([second]);
    expect(counts(db)).toMatchObject({
      teams: 1,
      players: 2,
      call_up_entries: 1,
      marks: 2,
    });
  });

  it("RF-025: deleting a call-up entry removes its marks only", () => {
    const db = openDatabase();
    const { firstJuan } = seedTeam(db, "Mini");
    db.delete(callUpEntries).where(eq(callUpEntries.id, firstJuan)).run();
    expect(counts(db)).toMatchObject({ call_up_entries: 2, marks: 3 });
  });

  it("RF-016 RF-025: deleting a player removes their call-up entries and marks and keeps the matches", () => {
    const db = openDatabase();
    const { juan } = seedTeam(db, "Mini");
    db.delete(players).where(eq(players.id, juan)).run();
    expect(counts(db)).toMatchObject({
      players: 1,
      matches: 2,
      call_up_entries: 1,
      marks: 1,
    });
  });
});

describe("schema, foreign keys and mark checks", () => {
  it("RF-016: a player for a team that does not exist is rejected", () => {
    const db = openDatabase();
    expect(failureOf(() => addPlayer(db, 999))).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db).players).toBe(0);
  });

  it("RF-025: a match for a team that does not exist is rejected", () => {
    const db = openDatabase();
    expect(failureOf(() => addMatch(db, 999))).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db).matches).toBe(0);
  });

  it("RF-025: a call-up entry for a match or a player that does not exist is rejected", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    const playerId = addPlayer(db, teamId);
    const matchId = addMatch(db, teamId);
    expect(failureOf(() => addEntry(db, 999, playerId))).toMatch(
      FOREIGN_KEY_FAILED,
    );
    expect(failureOf(() => addEntry(db, matchId, 999))).toMatch(
      FOREIGN_KEY_FAILED,
    );
    expect(counts(db).call_up_entries).toBe(0);
  });

  it("RF-025: a mark for a call-up entry that does not exist is rejected", () => {
    const db = openDatabase();
    expect(failureOf(() => addMark(db, 999))).toMatch(FOREIGN_KEY_FAILED);
    expect(counts(db).marks).toBe(0);
  });

  it.each([
    ["mark", { mark: "x" }],
    ["column_kind", { columnKind: "week" }],
  ])(
    "RF-025: a mark with a wrong %s is rejected by the check",
    (_column, values) => {
      const db = openDatabase();
      const { firstJuan } = seedTeam(db, "Mini");
      expect(
        failureOf(() => addMark(db, firstJuan, { columnNumber: 9, ...values })),
      ).toMatch(CHECK_FAILED);
      expect(counts(db).marks).toBe(5);
    },
  );

  it("RF-025: the same cell twice is rejected by the composite key, and period 1 and overtime 1 are two cells", () => {
    const db = openDatabase();
    const { firstJuan } = seedTeam(db, "Mini");
    expect(
      failureOf(() => addMark(db, firstJuan, { columnNumber: 1 })),
    ).toMatch(/UNIQUE constraint failed/);
    addMark(db, firstJuan, { columnKind: "overtime", columnNumber: 1 });
    expect(counts(db).marks).toBe(6);
  });
});

describe("schema, transactions", () => {
  it("RF-025: a transaction that fails halfway leaves nothing written", () => {
    const db = openDatabase();
    const failing = () =>
      db.transaction((tx) => {
        const teamId = tx
          .insert(teams)
          .values({ name: "Half", defaultFormat: 4 })
          .returning({ id: teams.id })
          .get().id;
        tx.insert(matches)
          .values({ teamId, format: 5, date: "2026-11-11" })
          .run();
      });
    expect(failureOf(failing)).toMatch(CHECK_FAILED);
    expect(counts(db)).toEqual(EMPTY);
  });

  it("RF-025: a transaction that throws after its writes rolls them back and a later one still works", () => {
    const db = openDatabase();
    const failing = () =>
      db.transaction((tx) => {
        tx.insert(teams).values({ name: "Half", defaultFormat: 4 }).run();
        throw new Error("interrupted");
      });
    expect(failureOf(failing)).toBe("interrupted");
    expect(counts(db).teams).toBe(0);
    addTeam(db);
    expect(counts(db).teams).toBe(1);
  });
});
