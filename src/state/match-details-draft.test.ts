// T095: the match details draft, opened on a saved match and saved with «Guardar» (RF-025,
// RF-027, RF-028, RF-082, RF-083, E-032). Expected API of src/state/match-details-draft.ts, which
// the Implementer writes: createMatchDetailsDraft(db, matchId), a Zustand vanilla store with
// status "ready" | "notFound", date ("YYYY-MM-DD"), time ("HH:MM" | null), homeName, awayName,
// homeScore, awayScore and notes (the text as typed, "" for none), the setters of the new-match
// draft and save(): SaveResult. The database is the real in-memory one; nothing is mocked.
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

describe("match details draft, opening a saved match", () => {
  it("RF-025 RF-028 RF-083: a saved match at 18:30 opens ready, with its date, its time 18:30 and every other field as text", () => {
    const { db, matchId } = seeded(FILLED);
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      status: "ready",
      date: "2026-03-01",
      time: "18:30",
      homeName: "Local",
      awayName: "Visitante",
      homeScore: "52",
      awayScore: "48",
      notes: "Pista 2",
    });
  });

  it("RF-025 RF-083: a match with only the format and the date opens with no time and empty home, away, score and notes", () => {
    const { db, matchId } = seeded();
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      status: "ready",
      date: "2026-11-11",
      time: null,
      homeName: "",
      awayName: "",
      homeScore: "",
      awayScore: "",
      notes: "",
    });
  });

  it("RF-025 RF-028: a saved score of 0 to 0 opens as the text 0 and 0, not as empty", () => {
    const { db, matchId } = seeded({ homeScore: 0, awayScore: 0 });
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      homeScore: "0",
      awayScore: "0",
    });
  });

  it("RF-082: a draft never carries the format, so «Guardar» has no format to write", () => {
    const { db, matchId } = seeded({ format: 8 });
    const state = createMatchDetailsDraft(db, matchId).getState();
    expect(state).not.toHaveProperty("format");
    expect(state).not.toHaveProperty("setFormat");
  });
});

describe("match details draft, the setters of the new-match draft", () => {
  it("RF-083: setDate stores the picker's parts as YYYY-MM-DD with zeros, 2026-03-01", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setDate({ year: 2026, month: 3, day: 1 });
    expect(store.getState().date).toBe("2026-03-01");
    store.getState().setDate({ year: 2026, month: 12, day: 31 });
    expect(store.getState().date).toBe("2026-12-31");
  });

  it.each([
    [{ hour: 9, minute: 5 }, "09:05"],
    [{ hour: 0, minute: 0 }, "00:00"],
    [{ hour: 23, minute: 59 }, "23:59"],
  ])(
    "RF-083: setTime stores the picker's hour and minute as HH:MM with zeros (%j gives %s)",
    (parts, expected) => {
      const { db, matchId } = seeded();
      const store = createMatchDetailsDraft(db, matchId);
      store.getState().setTime(parts);
      expect(store.getState().time).toBe(expected);
    },
  );

  it("RF-083: clearTime leaves no time, also when there was none, and setTime then gives the new time", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().clearTime();
    expect(store.getState().time).toBeNull();
    store.getState().clearTime();
    expect(store.getState().time).toBeNull();
    store.getState().setTime({ hour: 20, minute: 15 });
    expect(store.getState().time).toBe("20:15");
  });

  it("RF-025 RF-027: the home, away, score and notes setters keep exactly the text typed, a score included as «007» or «1a»", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("  Local  ");
    store.getState().setAwayName("Visitante");
    store.getState().setHomeScore("007");
    store.getState().setAwayScore("1a");
    store.getState().setNotes("Pista 2\nllevar balones");
    expect(store.getState()).toMatchObject({
      homeName: "  Local  ",
      awayName: "Visitante",
      homeScore: "007",
      awayScore: "1a",
      notes: "Pista 2\nllevar balones",
    });
  });

  it("RF-082: a setter changes only its own field", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Otro");
    expect(store.getState()).toMatchObject({
      date: "2026-03-01",
      time: "18:30",
      homeName: "Otro",
      awayName: "Visitante",
      homeScore: "52",
      awayScore: "48",
      notes: "Pista 2",
    });
  });
});

describe("match details draft, «Guardar»", () => {
  it("RF-028: change home, away and the score, save, and a new draft reads the same values", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Otro local");
    store.getState().setAwayName("Otro visitante");
    store.getState().setHomeScore("60");
    store.getState().setAwayScore("61");
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: "Otro local",
      awayName: "Otro visitante",
      homeScore: 60,
      awayScore: 61,
    });
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      homeName: "Otro local",
      awayName: "Otro visitante",
      homeScore: "60",
      awayScore: "61",
      date: "2026-03-01",
      time: "18:30",
      notes: "Pista 2",
    });
  });

  it("RF-025 RF-028 RF-083: a new date, a new time and new notes are saved and read back, and the format, overtimes and team stay", () => {
    const { db, matchId, teamId } = seeded({ ...FILLED, format: 8 });
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setDate({ year: 2026, month: 12, day: 24 });
    store.getState().setTime({ hour: 9, minute: 5 });
    store.getState().setNotes("Navidad");
    expect(store.getState().save().kind).toBe("saved");
    expect(getMatch(db, matchId)).toEqual({
      id: matchId,
      teamId,
      format: 8,
      date: "2026-12-24",
      time: "09:05",
      homeName: "Local",
      awayName: "Visitante",
      homeScore: 52,
      awayScore: 48,
      notes: "Navidad",
      overtimeCount: 0,
    });
  });

  it("RF-082: typing in every field and never calling save leaves the match exactly as it was", () => {
    const { db, matchId } = seeded(FILLED);
    const before = getMatch(db, matchId);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setDate({ year: 2027, month: 1, day: 2 });
    store.getState().clearTime();
    store.getState().setHomeName("Nada");
    store.getState().setAwayName("Nada");
    store.getState().setHomeScore("1");
    store.getState().setAwayScore("2");
    store.getState().setNotes("Nada");
    expect(getMatch(db, matchId)).toEqual(before);
  });

  it("RF-082: a save writes the match of this draft only, never another match of the same team", () => {
    const { db, matchId, teamId } = seeded(FILLED);
    const other = addMatch(db, teamId, { homeName: "Otro partido" });
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Cambiado");
    store.getState().save();
    expect(getMatch(db, other)?.homeName).toBe("Otro partido");
  });
});
