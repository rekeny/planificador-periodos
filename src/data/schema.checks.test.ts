// T028: the checks, defaults, keys and stored values of the schema, proven on a migrated in-memory
// database (RF-016, RF-017, RF-025; E-020 to E-022). Cascades are in schema.cascades.test.ts.
import { eq } from "drizzle-orm";
import { callUpEntries, matches, players, teams } from "@/data/schema";
import {
  CHECK_FAILED,
  UNIQUE_FAILED,
  addEntry,
  addMatch,
  addPlayer,
  addTeam,
  counts,
  failureOf,
  migrateAgain,
  openDatabase,
  userTables,
} from "../../tests/data/schema-fixtures";

const FORTY = "Ñandú «Águila» \"x\" 'y' 🏀 ".padEnd(40, "é").slice(0, 40);
const FIVE_HUNDRED = "Notas: ñ á é 🏀 \"x\" 'y'; ".repeat(30).slice(0, 500);

describe("schema, fresh database", () => {
  it("RF-016 RF-017 RF-025: a fresh database migrates and has the five tables", () => {
    expect(userTables(openDatabase())).toEqual([
      "call_up_entries",
      "marks",
      "matches",
      "players",
      "teams",
    ]);
  });

  it("RF-016 RF-017 RF-025: migrating twice does nothing the second time and keeps the rows", () => {
    const db = openDatabase();
    addTeam(db, { name: "Kept" });
    migrateAgain(db);
    expect(userTables(db)).toHaveLength(5);
    expect(db.select().from(teams).all()).toMatchObject([{ name: "Kept" }]);
  });

  it("RF-016 RF-017 RF-025: every test gets its own empty database", () => {
    addTeam(openDatabase());
    expect(counts(openDatabase()).teams).toBe(0);
  });
});

describe("schema, format checks", () => {
  it.each([4, 6, 8])(
    "RF-025: a team and a match with format %i are accepted",
    (format) => {
      const db = openDatabase();
      const teamId = addTeam(db, { defaultFormat: format });
      addMatch(db, teamId, { format });
      expect(db.select().from(matches).get()?.format).toBe(format);
    },
  );

  it.each([0, 3, 5, 7, 9, -4])(
    "RF-025: a team with default format %i is rejected by the check",
    (format) => {
      const db = openDatabase();
      expect(failureOf(() => addTeam(db, { defaultFormat: format }))).toMatch(
        CHECK_FAILED,
      );
      expect(counts(db).teams).toBe(0);
    },
  );

  it.each([0, 3, 5, 7, 9, -8])(
    "RF-025: a match with format %i is rejected by the check",
    (format) => {
      const db = openDatabase();
      const teamId = addTeam(db);
      expect(failureOf(() => addMatch(db, teamId, { format }))).toMatch(
        CHECK_FAILED,
      );
      expect(counts(db).matches).toBe(0);
    },
  );
});

describe("schema, scores", () => {
  it.each([
    [0, 0],
    [999, 0],
    [0, 999],
  ])(
    "RF-025 E-022: the score %i-%i is stored as it is",
    (homeScore, awayScore) => {
      const db = openDatabase();
      addMatch(db, addTeam(db), { homeScore, awayScore });
      expect(db.select().from(matches).get()).toMatchObject({
        homeScore,
        awayScore,
      });
    },
  );

  it.each([
    [3, null],
    [null, 3],
    [0, null],
  ])(
    "RF-025: a match with only one side of the score (%s, %s) is rejected by the check",
    (homeScore, awayScore) => {
      const db = openDatabase();
      const teamId = addTeam(db);
      expect(
        failureOf(() => addMatch(db, teamId, { homeScore, awayScore })),
      ).toMatch(CHECK_FAILED);
      expect(counts(db).matches).toBe(0);
    },
  );

  it("RF-025: a match with no score at all is stored with both sides null", () => {
    const db = openDatabase();
    addMatch(db, addTeam(db));
    expect(db.select().from(matches).get()).toMatchObject({
      homeScore: null,
      awayScore: null,
    });
  });

  it("RF-025: removing only one side of a stored score is rejected and keeps the score", () => {
    const db = openDatabase();
    const id = addMatch(db, addTeam(db), { homeScore: 4, awayScore: 2 });
    const update = () =>
      db
        .update(matches)
        .set({ homeScore: null })
        .where(eq(matches.id, id))
        .run();
    expect(failureOf(update)).toMatch(CHECK_FAILED);
    expect(db.select().from(matches).get()).toMatchObject({
      homeScore: 4,
      awayScore: 2,
    });
  });
});

describe("schema, defaults and optional columns", () => {
  it("RF-025: overtime_count is 0 and a new match starts with no time, names, notes or score", () => {
    const db = openDatabase();
    addMatch(db, addTeam(db));
    expect(db.select().from(matches).get()).toMatchObject({
      overtimeCount: 0,
      time: null,
      homeName: null,
      awayName: null,
      notes: null,
    });
  });

  it("RF-016: is_active is true by default and a player is stored with it", () => {
    const db = openDatabase();
    addPlayer(db, addTeam(db));
    expect(db.select().from(players).get()?.isActive).toBe(true);
  });

  it("RF-016: a player stored as inactive stays inactive", () => {
    const db = openDatabase();
    addPlayer(db, addTeam(db), { isActive: false });
    expect(db.select().from(players).get()?.isActive).toBe(false);
  });

  it("RF-016 RF-025: a team with a null category and a match with a null time are stored", () => {
    const db = openDatabase();
    const teamId = addTeam(db, { category: null });
    addMatch(db, teamId, { time: null });
    expect(db.select().from(teams).get()?.category).toBeNull();
    expect(db.select().from(matches).get()?.time).toBeNull();
  });

  it("RF-025: a match with a time stores the time unchanged", () => {
    const db = openDatabase();
    addMatch(db, addTeam(db), { time: "09:05" });
    expect(db.select().from(matches).get()?.time).toBe("09:05");
  });
});

describe("schema, text values", () => {
  it("RF-016 RF-025 E-022: names of 40 characters and notes of 500, with accents, emoji and quotes, are stored unchanged", () => {
    const db = openDatabase();
    const teamId = addTeam(db, { name: FORTY, category: FORTY });
    addPlayer(db, teamId, { name: FORTY });
    addMatch(db, teamId, {
      homeName: FORTY,
      awayName: FORTY,
      notes: FIVE_HUNDRED,
    });
    expect(db.select().from(teams).get()).toMatchObject({
      name: FORTY,
      category: FORTY,
    });
    expect(db.select().from(players).get()?.name).toBe(FORTY);
    expect(db.select().from(matches).get()).toMatchObject({
      homeName: FORTY,
      awayName: FORTY,
      notes: FIVE_HUNDRED,
    });
  });

  it.each(["0", "00", "7", "99", "07", "100"])(
    "RF-016 E-021: the player number %s is stored as the same text",
    (number) => {
      const db = openDatabase();
      addPlayer(db, addTeam(db), { number });
      expect(db.select().from(players).get()?.number).toBe(number);
    },
  );

  it("RF-016 E-021: the numbers 0 and 00 of one team are stored as two distinct players", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    addPlayer(db, teamId, { name: "Ana", number: "0" });
    addPlayer(db, teamId, { name: "Luis", number: "00" });
    const numbers = db
      .select()
      .from(players)
      .all()
      .map((p) => p.number);
    expect(numbers).toEqual(["0", "00"]);
  });
});

describe("schema, duplicates", () => {
  it("RF-017: two players with the same number in one team are both stored", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    addPlayer(db, teamId, { name: "Luis", number: "7" });
    addPlayer(db, teamId, { name: "Ana", number: "7" });
    expect(db.select().from(players).all()).toHaveLength(2);
  });

  it("RF-017: two players with the same name and the same number in one team are both stored", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    const first = addPlayer(db, teamId, { name: "Ana", number: "7" });
    const second = addPlayer(db, teamId, { name: "Ana", number: "7" });
    expect(second).not.toBe(first);
    expect(counts(db).players).toBe(2);
  });

  it("RF-017: the same player twice in one match's call-up is rejected by the unique index", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    const playerId = addPlayer(db, teamId);
    const matchId = addMatch(db, teamId);
    addEntry(db, matchId, playerId);
    expect(failureOf(() => addEntry(db, matchId, playerId))).toMatch(
      UNIQUE_FAILED,
    );
    expect(counts(db).call_up_entries).toBe(1);
  });

  it("RF-017: the same player in two matches is accepted, and two players in one match too", () => {
    const db = openDatabase();
    const teamId = addTeam(db);
    const juan = addPlayer(db, teamId);
    const ana = addPlayer(db, teamId, { name: "Ana", number: "7" });
    const first = addMatch(db, teamId);
    const second = addMatch(db, teamId);
    addEntry(db, first, juan);
    addEntry(db, second, juan);
    addEntry(db, first, ana, { playerName: "Ana" });
    expect(db.select().from(callUpEntries).all()).toHaveLength(3);
  });
});
