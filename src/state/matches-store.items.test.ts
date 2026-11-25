// T069: what each item of the matches store's lists shows (RF-074, RF-075, RF-083, E-023, E-032 list
// half). Same expected API as matches-store.test.ts: `createMatchesStore(db)` with `loadAll()`,
// `loadTeam(teamId)`, `allMatches` and `teamMatches`, on a migrated in-memory database.
import { updateMatchDetails } from "@/data/match-repository";
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

describe("matches store, what each item shows", () => {
  it("RF-074 RF-083 E-023: a match of 11 November 2026 shows «11/11/2026» in both lists", () => {
    const { db, alevin, store } = openWithTwoTeams();
    addMatch(db, alevin, { date: "2026-11-11" });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches[0]?.date).toBe("11/11/2026");
    expect(store.getState().teamMatches?.items[0]?.date).toBe("11/11/2026");
  });

  it("RF-074 RF-083: a match without a time shows no time, and one at 18:30 shows «18:30»", () => {
    const { db, alevin, store } = openWithTwoTeams();
    addMatch(db, alevin, { date: "2026-11-02", time: null });
    addMatch(db, alevin, { date: "2026-11-03", time: "18:30" });
    store.getState().loadAll();
    expect(store.getState().allMatches.map((item) => item.time)).toEqual([
      "18:30",
      null,
    ]);
  });

  it("RF-074 RF-083 E-032: a match of 1 March 2026 at 18:30 shows «01/03/2026» and «18:30», and after its time is cleared the next load shows no time", () => {
    const { db, alevin, store } = openWithTwoTeams();
    const id = addMatch(db, alevin, { date: "2026-03-01", time: "18:30" });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches[0]).toMatchObject({
      date: "01/03/2026",
      time: "18:30",
    });
    updateMatchDetails(db, id, {
      date: "2026-03-01",
      time: null,
      homeName: null,
      awayName: null,
      homeScore: null,
      awayScore: null,
      notes: null,
    });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    expect(store.getState().allMatches[0]).toMatchObject({
      date: "01/03/2026",
      time: null,
    });
    expect(store.getState().teamMatches?.items[0]).toMatchObject({
      date: "01/03/2026",
      time: null,
    });
  });

  it("RF-074: a score of 72 to 65 is shown as home 72 and away 65, 0 to 0 is a score, and no score is null", () => {
    const { db, alevin, store } = openWithTwoTeams();
    addMatch(db, alevin, {
      date: "2026-11-03",
      homeScore: 72,
      awayScore: 65,
    });
    addMatch(db, alevin, { date: "2026-11-02", homeScore: 0, awayScore: 0 });
    addMatch(db, alevin, { date: "2026-11-01" });
    store.getState().loadAll();
    expect(store.getState().allMatches.map((item) => item.score)).toEqual([
      { home: 72, away: 65 },
      { home: 0, away: 0 },
      null,
    ]);
  });

  it("RF-074 RF-075: each item shows the format and the home and away names as they were saved, and a missing name is null", () => {
    const { db, alevin, store } = openWithTwoTeams();
    addMatch(db, alevin, {
      date: "2026-11-03",
      format: 8,
      homeName: "Alevín A",
      awayName: null,
    });
    addMatch(db, alevin, {
      date: "2026-11-02",
      format: 4,
      homeName: null,
      awayName: "Cadete B",
    });
    addMatch(db, alevin, { date: "2026-11-01", format: 6 });
    store.getState().loadTeam(alevin);
    expect(
      store
        .getState()
        .teamMatches?.items.map((item) => [
          item.format,
          item.homeName,
          item.awayName,
        ]),
    ).toEqual([
      [8, "Alevín A", null],
      [4, null, "Cadete B"],
      [6, null, null],
    ]);
  });

  it("RF-074 RF-075: the list of every match carries the team's name and category, the list of a team carries no team", () => {
    const { db, alevin, store } = openWithTwoTeams();
    const id = addMatch(db, alevin, {
      date: "2026-11-11",
      time: "10:00",
      format: 8,
      homeName: "Alevín A",
      awayName: "Cadete B",
      homeScore: 72,
      awayScore: 65,
      notes: "Llevar petos",
      overtimeCount: 2,
    });
    store.getState().loadAll();
    store.getState().loadTeam(alevin);
    const item = {
      id,
      date: "11/11/2026",
      time: "10:00",
      homeName: "Alevín A",
      awayName: "Cadete B",
      score: { home: 72, away: 65 },
      format: 8,
    };
    expect(store.getState().allMatches).toStrictEqual([
      { ...item, team: { name: "Alevín A", category: "Alevín" } },
    ]);
    expect(store.getState().teamMatches).toStrictEqual({
      teamId: alevin,
      items: [{ ...item, team: null }],
    });
  });

  it("RF-074: a team with no category shows a null category in the list of every match", () => {
    const { db, cadete, store } = openWithTwoTeams();
    addMatch(db, cadete, { date: "2026-11-08" });
    store.getState().loadAll();
    expect(store.getState().allMatches[0]?.team).toStrictEqual({
      name: "Cadete B",
      category: null,
    });
  });
});
