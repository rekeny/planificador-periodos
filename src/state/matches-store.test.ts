// T069: the two match lists of the matches store (RF-074, RF-075, RF-083, E-023, E-032 list half).
// Expected API of src/state/matches-store.ts, which the Implementer writes:
//   createMatchesStore(db): a Zustand store (read it with `getState()`), built like
//     `createSquadStore`. State: `allMatches` (readonly MatchListItem[], [] at first) and
//     `teamMatches` ({ teamId, items } or null at first). Actions: `loadAll()`, `loadTeam(teamId)`
//     and `deleteMatch(matchId): SaveResult` (the last one is tested in matches-store.delete.test.ts).
//   MatchListItem: { id, date: «DD/MM/YYYY», time: «HH:MM» | null, homeName, awayName,
//     score: { home, away } | null, format, team: { name, category } | null }; `team` is null in
//     `teamMatches` and set in `allMatches`.
// The store runs on a migrated in-memory database with the real repositories and the real domain.
import { createMatchesStore } from "@/state/matches-store";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

/** «Alevín A» (category «Alevín») and «Cadete B» (no category), a store on their database. */
function openWithTwoTeams() {
  const db = createTestDatabase();
  const alevin = addTeam(db, { name: "Alevín A", category: "Alevín" });
  const cadete = addTeam(db, { name: "Cadete B", category: null });
  return { db, alevin, cadete, store: createMatchesStore(db) };
}

const idsOf = (items: readonly { readonly id: number }[]): number[] =>
  items.map((item) => item.id);

describe("matches store, the order of the lists", () => {
  it("RF-074 RF-075: three matches of two teams on 2026-11-01, 08 and 15 are listed 15, 8, 1 in both lists", () => {
    const { db, alevin, cadete, store } = openWithTwoTeams();
    const first = addMatch(db, alevin, { date: "2026-11-01" });
    const third = addMatch(db, alevin, { date: "2026-11-15" });
    const second = addMatch(db, cadete, { date: "2026-11-08" });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(idsOf(store.getState().allMatches)).toEqual([third, second, first]);
    expect(idsOf(store.getState().teamMatches?.items ?? [])).toEqual([
      third,
      first,
    ]);
  });

  it("RF-074: two matches on 2026-11-08 at 10:00 and 12:00 are listed 12:00 first, and one without a time goes after both", () => {
    const { db, alevin, store } = openWithTwoTeams();
    const morning = addMatch(db, alevin, { date: "2026-11-08", time: "10:00" });
    const none = addMatch(db, alevin, { date: "2026-11-08", time: null });
    const noon = addMatch(db, alevin, { date: "2026-11-08", time: "12:00" });
    store.getState().loadAll();
    expect(idsOf(store.getState().allMatches)).toEqual([noon, morning, none]);
  });

  it("RF-075: the list of a team is in the same order, latest time first on one date", () => {
    const { db, alevin, store } = openWithTwoTeams();
    const morning = addMatch(db, alevin, { date: "2026-11-08", time: "10:00" });
    const evening = addMatch(db, alevin, { date: "2026-11-08", time: "18:30" });
    const older = addMatch(db, alevin, { date: "2026-10-31", time: "20:00" });
    store.getState().loadTeam(alevin);
    expect(idsOf(store.getState().teamMatches?.items ?? [])).toEqual([
      evening,
      morning,
      older,
    ]);
  });

  it("RF-074: loading again after a new match was saved lists it in its place", () => {
    const { db, alevin, store } = openWithTwoTeams();
    const old = addMatch(db, alevin, { date: "2026-11-01" });
    store.getState().loadAll();
    const recent = addMatch(db, alevin, { date: "2026-11-15" });
    expect(idsOf(store.getState().allMatches)).toEqual([old]);
    store.getState().loadAll();
    expect(idsOf(store.getState().allMatches)).toEqual([recent, old]);
  });
});

describe("matches store, empty lists and the open team", () => {
  it("RF-074 RF-075: before any load the lists are empty and no team is open", () => {
    const { store } = openWithTwoTeams();
    expect(store.getState().allMatches).toEqual([]);
    expect(store.getState().teamMatches).toBeNull();
  });

  it("RF-074 RF-075: with no match in the database both loads publish an empty list, and the team's keeps its id", () => {
    const { alevin, store } = openWithTwoTeams();
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches).toEqual([]);
    expect(store.getState().teamMatches).toEqual({ teamId: alevin, items: [] });
  });

  it("RF-075: loadTeam(1) then loadTeam(2) publishes team 2 with only its own matches", () => {
    const { db, alevin, cadete, store } = openWithTwoTeams();
    const first = addMatch(db, alevin, { date: "2026-11-01" });
    const second = addMatch(db, cadete, { date: "2026-11-08" });
    store.getState().loadTeam(alevin);
    expect(store.getState().teamMatches?.teamId).toBe(alevin);
    expect(idsOf(store.getState().teamMatches?.items ?? [])).toEqual([first]);
    store.getState().loadTeam(cadete);
    expect(store.getState().teamMatches?.teamId).toBe(cadete);
    expect(idsOf(store.getState().teamMatches?.items ?? [])).toEqual([second]);
  });

  it("RF-075: loadTeam for a team with no matches after one that has some leaves none of the old ones", () => {
    const { db, alevin, cadete, store } = openWithTwoTeams();
    addMatch(db, alevin, { date: "2026-11-01" });
    store.getState().loadTeam(alevin);
    store.getState().loadTeam(cadete);
    expect(store.getState().teamMatches).toEqual({ teamId: cadete, items: [] });
  });

  it("RF-074 RF-075: loadTeam does not touch the list of every match, and loadAll does not touch the team's", () => {
    const { db, alevin, cadete, store } = openWithTwoTeams();
    addMatch(db, alevin, { date: "2026-11-01" });
    addMatch(db, cadete, { date: "2026-11-08" });
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches).toEqual([]);
    const team = store.getState().teamMatches;
    store.getState().loadAll();
    expect(store.getState().allMatches).toHaveLength(2);
    expect(store.getState().teamMatches).toBe(team);
    const all = store.getState().allMatches;
    store.getState().loadTeam(cadete);
    expect(store.getState().allMatches).toBe(all);
  });
});

describe("matches store, a new store on the same database", () => {
  it("RF-074 RF-075 RF-083: after the app is reopened the lists are the same", () => {
    const { db, alevin, cadete, store } = openWithTwoTeams();
    addMatch(db, alevin, {
      date: "2026-03-01",
      time: "18:30",
      homeScore: 72,
      awayScore: 65,
    });
    addMatch(db, cadete, { date: "2026-11-08", format: 4 });
    addMatch(db, alevin, { date: "2026-11-15", format: 8 });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    const reopened = createMatchesStore(db);
    reopened.getState().loadAll();
    reopened.getState().loadTeam(alevin);
    expect(reopened.getState().allMatches).toHaveLength(3);
    expect(reopened.getState().allMatches).toStrictEqual(
      store.getState().allMatches,
    );
    expect(reopened.getState().teamMatches).toStrictEqual(
      store.getState().teamMatches,
    );
  });
});
