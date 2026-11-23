// T095: what the match details draft does with wrong data and with a device that fails (RF-025,
// RF-028, RF-082, RF-085 and D3 rule 2). Failures are real: a table renamed away breaks its
// reads, a SQLite trigger breaks a write, and a SQLite function called from a trigger runs a
// second save() while the first one is writing, so nothing is mocked.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { deleteMatch, getMatch } from "@/data/match-repository";
import { createMatchDetailsDraft } from "@/state/match-details-draft";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
import { guardReadsAfterWrites } from "../../tests/support/read-after-write";
import { createTestDatabase } from "../../tests/support/test-database";

const FILLED = {
  date: "2026-03-01",
  time: "18:30",
  homeName: "Local",
  awayName: "Visitante",
  homeScore: 52,
  awayScore: 48,
  notes: "Pista 2",
};

function seeded(values: Parameters<typeof addMatch>[2] = FILLED) {
  const db = createTestDatabase();
  const teamId = addTeam(db, { name: "Alevín A", category: "2015" });
  const matchId = addMatch(db, teamId, values);
  return { db, teamId, matchId };
}

const run = (db: AppDatabase, statement: string): void => {
  db.run(sql.raw(statement));
};

const failUpdates = (db: AppDatabase): void =>
  run(
    db,
    "CREATE TRIGGER fail_UPDATE_matches BEFORE UPDATE ON matches " +
      "BEGIN SELECT RAISE(ABORT, 'disk full'); END",
  );

const allowUpdates = (db: AppDatabase): void =>
  run(db, "DROP TRIGGER fail_UPDATE_matches");

// Only the two methods used, as tests/support/read-after-write.ts does.
interface RawClient {
  function(name: string, implementation: () => number): unknown;
}

describe("match details draft, a score that cannot be saved", () => {
  const CASES = [
    ["52", "", "scoreIncomplete"],
    ["", "48", "scoreIncomplete"],
    ["1a", "5", "scoreInvalid"],
    ["-1", "3", "scoreInvalid"],
    ["1000", "1", "scoreInvalid"],
    ["1a", "", "scoreInvalid"],
  ] as const;

  it.each(CASES)(
    "RF-025 RF-085: the scores «%s» and «%s» give invalid with %s and nothing is saved",
    (home, away, error) => {
      const { db, matchId } = seeded();
      const before = getMatch(db, matchId);
      const store = createMatchDetailsDraft(db, matchId);
      store.getState().setHomeName("Escrito");
      store.getState().setHomeScore(home);
      store.getState().setAwayScore(away);
      expect(store.getState().save()).toEqual({
        kind: "invalid",
        errors: [error],
      });
      expect(getMatch(db, matchId)).toEqual(before);
      expect(store.getState()).toMatchObject({
        homeName: "Escrito",
        homeScore: home,
        awayScore: away,
      });
    },
  );

  it("RF-025: after an invalid save, fixing the score and saving again saves everything typed", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setNotes("Escrito");
    store.getState().setHomeScore("");
    expect(store.getState().save().kind).toBe("invalid");
    store.getState().setAwayScore("");
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)).toMatchObject({
      notes: "Escrito",
      homeScore: null,
      awayScore: null,
    });
  });
});

describe("match details draft, a second save while one runs", () => {
  // The first save's write fires a trigger, which calls a function that calls save() again, so
  // the second call happens while the first one is still writing.
  function reentrant(): {
    db: AppDatabase;
    matchId: number;
    inner: () => unknown;
    writes: () => number;
  } {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setNotes("Escrito");
    let calls = 0;
    let inner: unknown = "never called";
    (db as unknown as { $client: RawClient }).$client.function(
      "during_save",
      () => {
        calls += 1;
        if (calls === 1) inner = store.getState().save();
        return 1;
      },
    );
    run(
      db,
      "CREATE TRIGGER during_save_trigger AFTER UPDATE ON matches " +
        "BEGIN SELECT during_save(); END",
    );
    const outer = store.getState().save();
    expect(outer).toEqual({ kind: "saved" });
    return { db, matchId, inner: () => inner, writes: () => calls };
  }

  it("RF-085: a save() called while a save runs is ignored and answers unchanged", () => {
    expect(reentrant().inner()).toEqual({ kind: "unchanged" });
  });

  it("RF-085: a save() called while a save runs adds no write: the match is written once with the typed text", () => {
    const { db, matchId, writes } = reentrant();
    expect(writes()).toBe(1);
    expect(getMatch(db, matchId)?.notes).toBe("Escrito");
  });

  it("RF-085: once the save is over, the next save() writes again", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    expect(store.getState().save()).toEqual({ kind: "saved" });
    store.getState().setNotes("Otra");
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)?.notes).toBe("Otra");
  });
});

describe("match details draft, a write that throws", () => {
  it("RF-085: a throwing write answers saveFailed without throwing, and the saved match stays as it was", () => {
    const { db, matchId } = seeded();
    const before = getMatch(db, matchId);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Escrito");
    failUpdates(db);
    expect(() => store.getState().save()).not.toThrow();
    expect(store.getState().save()).toEqual({ kind: "saveFailed" });
    expect(getMatch(db, matchId)).toEqual(before);
  });

  it("RF-085: after a failed save the draft is still ready and keeps every field typed", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Escrito");
    store.getState().setAwayScore("7");
    store.getState().clearTime();
    failUpdates(db);
    store.getState().save();
    expect(store.getState()).toMatchObject({
      status: "ready",
      homeName: "Escrito",
      awayScore: "7",
      time: null,
      homeScore: "52",
    });
  });

  it("RF-085: once the device recovers, saving again saves what was typed (the failed save does not block the next)", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Escrito");
    failUpdates(db);
    expect(store.getState().save().kind).toBe("saveFailed");
    allowUpdates(db);
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)?.homeName).toBe("Escrito");
  });

  it("RF-085: a read that breaks right after the write does not turn a saved match into a failure", () => {
    const raw = createTestDatabase();
    const teamId = addTeam(raw, { name: "Alevín A" });
    const matchId = addMatch(raw, teamId, FILLED);
    const guard = guardReadsAfterWrites(raw, [["matches", "UPDATE"]]);
    const store = createMatchDetailsDraft(guard.db, matchId);
    store.getState().setNotes("Escrito");
    guard.watch(true);
    expect(store.getState().save()).toEqual({ kind: "saved" });
    guard.heal();
    expect(getMatch(raw, matchId)?.notes).toBe("Escrito");
  });
});

describe("match details draft, a read that throws", () => {
  it("RF-028 RF-085: when reading the match throws, the draft is notFound and nothing throws", () => {
    const { db, matchId } = seeded();
    run(db, "ALTER TABLE matches RENAME TO broken_matches");
    const open = () => createMatchDetailsDraft(db, matchId);
    expect(open).not.toThrow();
    expect(open().getState().status).toBe("notFound");
  });

  it("RF-028 RF-085: when only the team's name cannot be read, the draft is notFound and nothing throws", () => {
    const { db, matchId } = seeded();
    run(db, "ALTER TABLE teams RENAME TO broken_teams");
    const open = () => createMatchDetailsDraft(db, matchId);
    expect(open).not.toThrow();
    expect(open().getState().status).toBe("notFound");
  });

  it("RF-085: a draft that could not be read saves nothing and answers unchanged", () => {
    const { db, matchId } = seeded();
    run(db, "ALTER TABLE teams RENAME TO broken_teams");
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setNotes("Escrito");
    expect(store.getState().save()).toEqual({ kind: "unchanged" });
    expect(getMatch(db, matchId)?.notes).toBe("Pista 2");
  });
});

describe("match details draft, a match that is gone", () => {
  it("RF-082 RF-085: saving after the match was deleted does not answer saved and does not bring the match back", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    deleteMatch(db, matchId);
    store.getState().setNotes("Escrito");
    expect(() => store.getState().save()).not.toThrow();
    expect(store.getState().save().kind).not.toBe("saved");
    expect(getMatch(db, matchId)).toBeUndefined();
  });
});
