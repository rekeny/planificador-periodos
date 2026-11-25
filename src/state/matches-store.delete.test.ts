// T069: deleting a match through the matches store (RF-029, RF-074, RF-075, RF-085). The store runs
// on a migrated in-memory database with the real repositories; the lists are published again in
// memory, never read again. Failures are in matches-store.failures.test.ts.
import { getMatch, listAllMatches } from "@/data/match-repository";
import { createMatchesStore } from "@/state/matches-store";
import {
  addEntry,
  addMark,
  addMatch,
  addPlayer,
  addTeam,
  counts,
} from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

/** Two teams with three matches (dates 1, 8 and 15 of November) and a store with both lists loaded. */
function loaded() {
  const db = createTestDatabase();
  const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
  const cadete = addTeam(db, { name: "Cadete B", category: null });
  const first = addMatch(db, alevin, { date: "2026-11-01" });
  const third = addMatch(db, alevin, { date: "2026-11-15" });
  const second = addMatch(db, cadete, { date: "2026-11-08" });
  const store = createMatchesStore(db);
  store.getState().loadAll();
  store.getState().loadTeam(alevin);
  return { db, alevin, cadete, first, second, third, store };
}

const idsOf = (items: readonly { readonly id: number }[] | undefined) =>
  (items ?? []).map((item) => item.id);

describe("matches store, delete a match", () => {
  it("RF-029 RF-074 RF-075: deleting the middle match of the team's list removes it from both lists and keeps the order of the rest", () => {
    const { db, alevin, first, second, third, store } = loaded();
    expect(store.getState().deleteMatch(third)).toEqual({ kind: "saved" });
    expect(idsOf(store.getState().allMatches)).toEqual([second, first]);
    expect(store.getState().teamMatches?.teamId).toBe(alevin);
    expect(idsOf(store.getState().teamMatches?.items)).toEqual([first]);
    expect(getMatch(db, third)).toBeUndefined();
    expect(listAllMatches(db)).toHaveLength(2);
  });

  it("RF-029: a match of the other team leaves the open team's list as it was", () => {
    const { second, store } = loaded();
    const team = store.getState().teamMatches;
    expect(store.getState().deleteMatch(second)).toEqual({ kind: "saved" });
    expect(store.getState().teamMatches).toStrictEqual(team);
    expect(store.getState().allMatches.map((item) => item.id)).not.toContain(
      second,
    );
  });

  it("RF-029: with only the list of every match loaded, deleting leaves the team's list unopened", () => {
    const db = createTestDatabase();
    const alevin = addTeam(db, { name: "Alevín A" });
    const id = addMatch(db, alevin, { date: "2026-11-01" });
    const store = createMatchesStore(db);
    store.getState().loadAll();
    expect(store.getState().deleteMatch(id)).toEqual({ kind: "saved" });
    expect(store.getState().allMatches).toEqual([]);
    expect(store.getState().teamMatches).toBeNull();
  });

  it("RF-029: deleting the only match of the open team leaves its list empty and its id", () => {
    const db = createTestDatabase();
    const alevin = addTeam(db, { name: "Alevín A" });
    const id = addMatch(db, alevin, { date: "2026-11-01" });
    const store = createMatchesStore(db);
    store.getState().loadTeam(alevin);
    expect(store.getState().deleteMatch(id)).toEqual({ kind: "saved" });
    expect(store.getState().teamMatches).toEqual({ teamId: alevin, items: [] });
  });

  it("RF-029: the match's call-up and marks go with it, and the other matches keep theirs", () => {
    const { db, alevin, first, third, store } = loaded();
    const ana = addPlayer(db, alevin, { name: "Ana", number: "4" });
    for (const matchId of [first, third]) {
      addMark(db, addEntry(db, matchId, ana));
    }
    expect(store.getState().deleteMatch(third)).toEqual({ kind: "saved" });
    expect(counts(db).call_up_entries).toBe(1);
    expect(counts(db).marks).toBe(1);
    expect(counts(db).players).toBe(1);
  });

  it("RF-029 RF-074: a new store on the same database lists no deleted match in any list", () => {
    const { db, alevin, first, second, third, store } = loaded();
    store.getState().deleteMatch(third);
    const reopened = createMatchesStore(db);
    reopened.getState().loadAll();
    reopened.getState().loadTeam(alevin);
    expect(idsOf(reopened.getState().allMatches)).toEqual([second, first]);
    expect(idsOf(reopened.getState().teamMatches?.items)).toEqual([first]);
  });

  it("RF-029: after deleting, the same id answers unchanged and the lists stay as they were", () => {
    const { third, store } = loaded();
    store.getState().deleteMatch(third);
    const all = store.getState().allMatches;
    const team = store.getState().teamMatches;
    expect(store.getState().deleteMatch(third)).toEqual({ kind: "unchanged" });
    expect(store.getState().allMatches).toStrictEqual(all);
    expect(store.getState().teamMatches).toStrictEqual(team);
  });

  it("RF-029: an id in neither list and not in the database answers unchanged and deletes nothing", () => {
    const { db, store } = loaded();
    const all = store.getState().allMatches;
    const team = store.getState().teamMatches;
    expect(store.getState().deleteMatch(9999)).toEqual({ kind: "unchanged" });
    expect(listAllMatches(db)).toHaveLength(3);
    expect(store.getState().allMatches).toStrictEqual(all);
    expect(store.getState().teamMatches).toStrictEqual(team);
  });

  it("RF-029: with nothing loaded and an empty database, deleting an id answers unchanged", () => {
    const store = createMatchesStore(createTestDatabase());
    expect(store.getState().deleteMatch(1)).toEqual({ kind: "unchanged" });
    expect(store.getState().allMatches).toEqual([]);
    expect(store.getState().teamMatches).toBeNull();
  });

  it("RF-029: a match saved after the lists were loaded is still deleted, and the lists published stay as they were", () => {
    const { db, alevin, store } = loaded();
    const late = addMatch(db, alevin, { date: "2026-12-01" });
    const all = store.getState().allMatches;
    expect(store.getState().deleteMatch(late)).toEqual({ kind: "saved" });
    expect(getMatch(db, late)).toBeUndefined();
    expect(store.getState().allMatches).toStrictEqual(all);
  });
});
