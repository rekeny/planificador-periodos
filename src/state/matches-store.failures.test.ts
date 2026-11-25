// T069: what the matches store does when the device fails (RF-029, RF-074, RF-075, RF-085 and D3
// rule 2, read first and write last). Failures are real: a table renamed away breaks its reads, a
// SQLite trigger breaks a delete, and the read guard of tests/support/read-after-write.ts breaks
// every read after a committed delete, so nothing is mocked and the database tells the truth.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { getMatch } from "@/data/match-repository";
import { createMatchesStore } from "@/state/matches-store";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
import {
  answerOf,
  guardReadsAfterWrites,
} from "../../tests/support/read-after-write";
import { createTestDatabase } from "../../tests/support/test-database";

/** Two teams, three matches (dates 1, 8 and 15 of November), and a store on their database. */
function seeded() {
  const db = createTestDatabase();
  const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
  const cadete = addTeam(db, { name: "Cadete B", category: null });
  const first = addMatch(db, alevin, { date: "2026-11-01" });
  const third = addMatch(db, alevin, { date: "2026-11-15" });
  const second = addMatch(db, cadete, { date: "2026-11-08" });
  return {
    db,
    alevin,
    cadete,
    first,
    second,
    third,
    store: createMatchesStore(db),
  };
}

const run = (db: AppDatabase, statement: string): void => {
  db.run(sql.raw(statement));
};

/** Every read of the table throws from now on ("no such table"). */
const breakReads = (db: AppDatabase, table: "matches" | "teams"): void =>
  run(db, `ALTER TABLE ${table} RENAME TO broken_${table}`);

const failDeletes = (db: AppDatabase): void =>
  run(
    db,
    "CREATE TRIGGER fail_DELETE_matches BEFORE DELETE ON matches " +
      "BEGIN SELECT RAISE(ABORT, 'disk full'); END",
  );

const allowDeletes = (db: AppDatabase): void =>
  run(db, "DROP TRIGGER fail_DELETE_matches");

const idsOf = (items: readonly { readonly id: number }[] | undefined) =>
  (items ?? []).map((item) => item.id);

describe("matches store, a read that throws", () => {
  it("RF-074 RF-085: when reading every match throws, loadAll throws nothing and publishes an empty list", () => {
    const { db, store } = seeded();
    store.getState().loadAll();
    expect(store.getState().allMatches).toHaveLength(3);
    breakReads(db, "matches");
    expect(() => store.getState().loadAll()).not.toThrow();
    expect(store.getState().allMatches).toEqual([]);
  });

  it("RF-074: when only the teams cannot be read, loadAll still throws nothing and publishes an empty list", () => {
    const { db, store } = seeded();
    store.getState().loadAll();
    breakReads(db, "teams");
    expect(() => store.getState().loadAll()).not.toThrow();
    expect(store.getState().allMatches).toEqual([]);
  });

  it("RF-075 RF-085: when reading a team's matches throws, loadTeam throws nothing and publishes that team with an empty list", () => {
    const { db, alevin, cadete, store } = seeded();
    store.getState().loadTeam(alevin);
    expect(store.getState().teamMatches?.items).toHaveLength(2);
    breakReads(db, "matches");
    expect(() => store.getState().loadTeam(cadete)).not.toThrow();
    expect(store.getState().teamMatches).toEqual({ teamId: cadete, items: [] });
  });

  it("RF-074 RF-075: a failed read changes only the list it was loading", () => {
    const { db, alevin, store } = seeded();
    store.getState().loadAll();
    const all = store.getState().allMatches;
    breakReads(db, "matches");
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches).toBe(all);
  });
});

describe("matches store, a delete that fails", () => {
  it("RF-029 RF-085: when the write throws, both lists stay as they were, the answer is saveFailed and the match is still stored", () => {
    const { db, alevin, third, store } = seeded();
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    const all = store.getState().allMatches;
    const team = store.getState().teamMatches;
    failDeletes(db);
    expect(store.getState().deleteMatch(third)).toEqual({
      kind: "saveFailed",
    });
    expect(store.getState().allMatches).toStrictEqual(all);
    expect(store.getState().teamMatches).toStrictEqual(team);
    expect(getMatch(db, third)?.id).toBe(third);
  });

  it("RF-029 RF-085: after a failed delete the retry on a healthy device deletes the match once and removes it from both lists", () => {
    const { db, alevin, first, second, third, store } = seeded();
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    failDeletes(db);
    store.getState().deleteMatch(third);
    allowDeletes(db);
    expect(store.getState().deleteMatch(third)).toEqual({ kind: "saved" });
    expect(idsOf(store.getState().allMatches)).toEqual([second, first]);
    expect(idsOf(store.getState().teamMatches?.items)).toEqual([first]);
    expect(getMatch(db, third)).toBeUndefined();
  });

  it("RF-029 RF-085: a failed delete of a match that was never loaded answers saveFailed and stores nothing different", () => {
    const { db, third, store } = seeded();
    failDeletes(db);
    expect(store.getState().deleteMatch(third)).toEqual({
      kind: "saveFailed",
    });
    expect(store.getState().allMatches).toEqual([]);
    expect(getMatch(db, third)?.id).toBe(third);
  });
});

describe("matches store, read first and write last (D3 rule 2)", () => {
  it("RF-029 RF-085: no read is made after the delete is committed, so reads that fail from then on change nothing", () => {
    const db = createTestDatabase();
    const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
    const first = addMatch(db, alevin, { date: "2026-11-01" });
    const second = addMatch(db, alevin, { date: "2026-11-08" });
    const guard = guardReadsAfterWrites(db, [["matches", "DELETE"]]);
    const store = createMatchesStore(guard.db);
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(store.getState().deleteMatch(second)).toEqual({ kind: "saved" });
    expect(idsOf(store.getState().allMatches)).toEqual([first]);
    expect(idsOf(store.getState().teamMatches?.items)).toEqual([first]);
    expect(getMatch(db, second)).toBeUndefined();
  });

  it("RF-029 RF-085: when every read throws before the delete, the answer is saved or saveFailed, never an exception, and the database and the lists agree", () => {
    const db = createTestDatabase();
    const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
    const id = addMatch(db, alevin, { date: "2026-11-01" });
    // The reads are healthy while the lists load, then every `select` throws.
    let broken = false;
    const failing = new Proxy(db, {
      get(target, property) {
        if (property === "select" && broken) {
          return () => {
            throw new Error("disk read failed");
          };
        }
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const store = createMatchesStore(failing);
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    broken = true;
    const answer = answerOf(() => store.getState().deleteMatch(id));
    broken = false;
    expect(answer.kind === "saved" || answer.kind === "saveFailed").toBe(true);
    const stored = getMatch(db, id) !== undefined;
    expect(stored).toBe(answer.kind === "saveFailed");
    expect(store.getState().allMatches).toHaveLength(stored ? 1 : 0);
    expect(store.getState().teamMatches?.items).toHaveLength(stored ? 1 : 0);
  });
});
