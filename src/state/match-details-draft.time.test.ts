// T095: E-032, the details half: the time of a saved match is cleared, set again or left alone
// (RF-025, RF-082, RF-083). The list half of E-032 is T069 and the screen half is T072.
import { getMatch } from "@/data/match-repository";
import { createMatchDetailsDraft } from "@/state/match-details-draft";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
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

function seeded(values: Parameters<typeof addMatch>[2] = {}) {
  const db = createTestDatabase();
  const teamId = addTeam(db, { name: "Alevín A", category: "2015" });
  const matchId = addMatch(db, teamId, values);
  return { db, teamId, matchId };
}

describe("match details draft, E-032 (the details half)", () => {
  it("RF-025 RF-083 E-032: a match of 1 March 2026 at 18:30, clearTime and save, has no time and still the date 2026-03-01", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    expect(store.getState()).toMatchObject({
      date: "2026-03-01",
      time: "18:30",
    });
    store.getState().clearTime();
    expect(store.getState().time).toBeNull();
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)).toMatchObject({
      date: "2026-03-01",
      time: null,
    });
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      date: "2026-03-01",
      time: null,
    });
  });

  it("RF-083 E-032: after clearTime, setTime with 12:00 gives 12:00, and saving writes 12:00", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().clearTime();
    store.getState().setTime({ hour: 12, minute: 0 });
    expect(store.getState().time).toBe("12:00");
    store.getState().save();
    expect(getMatch(db, matchId)?.time).toBe("12:00");
  });

  it("RF-082 RF-083 E-032: after clearTime and no save, the saved match keeps its time 18:30 and a new draft shows it", () => {
    const { db, matchId } = seeded(FILLED);
    createMatchDetailsDraft(db, matchId).getState().clearTime();
    expect(getMatch(db, matchId)?.time).toBe("18:30");
    expect(createMatchDetailsDraft(db, matchId).getState().time).toBe("18:30");
  });

  it("RF-083 E-032: a match with no time, setTime and save, has that time", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setTime({ hour: 18, minute: 30 });
    store.getState().save();
    expect(getMatch(db, matchId)?.time).toBe("18:30");
  });
});
