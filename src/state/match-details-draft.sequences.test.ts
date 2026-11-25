// T095: sequences and interruptions of the match details draft (RF-027, RF-028, RF-082). The
// format changes through the repository of T068, as the session's changeFormat does; the same
// through the session is proved in T070 and on the screen in T096.
import {
  changeMatchFormat,
  getMatch,
  updateMatchDetails,
} from "@/data/match-repository";
import { updateTeam } from "@/data/team-repository";
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

describe("match details draft, the format changed while it is open", () => {
  it.each([
    [6, 8],
    [8, 4],
    [4, 6],
  ] as const)(
    "RF-082: a draft opened on a %i-period match, the format changed to %i in the database, then save, keeps the new format and saves the details",
    (from, to) => {
      const { db, matchId } = seeded({ ...FILLED, format: from });
      const store = createMatchDetailsDraft(db, matchId);
      changeMatchFormat(db, matchId, to);
      store.getState().setNotes("Nuevas notas");
      expect(store.getState().save()).toEqual({ kind: "saved" });
      expect(getMatch(db, matchId)).toMatchObject({
        format: to,
        notes: "Nuevas notas",
      });
    },
  );

  it("RF-082: the overtimes of the match are not touched by a save", () => {
    const { db, matchId } = seeded({ ...FILLED, overtimeCount: 2 });
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setNotes("Prórrogas");
    store.getState().save();
    expect(getMatch(db, matchId)?.overtimeCount).toBe(2);
  });
});

describe("match details draft, one draft for each screen", () => {
  it("RF-082: two drafts of the same match are independent: what one types never reaches the other", () => {
    const { db, matchId } = seeded(FILLED);
    const first = createMatchDetailsDraft(db, matchId);
    const second = createMatchDetailsDraft(db, matchId);
    first.getState().setHomeName("Primero");
    second.getState().setNotes("Segundo");
    expect(second.getState().homeName).toBe("Local");
    expect(first.getState().notes).toBe("Pista 2");
    expect(first.getState().save().kind).toBe("saved");
    expect(second.getState()).toMatchObject({
      homeName: "Local",
      notes: "Segundo",
    });
    expect(createMatchDetailsDraft(db, matchId).getState().homeName).toBe(
      "Primero",
    );
  });

  it("RF-082: two drafts of two matches of the same team keep each its own values, and saving one leaves the other match", () => {
    const { db, matchId, teamId } = seeded(FILLED);
    const otherId = addMatch(db, teamId, { homeName: "Otro" });
    const first = createMatchDetailsDraft(db, matchId);
    const second = createMatchDetailsDraft(db, otherId);
    expect(first.getState().homeName).toBe("Local");
    expect(second.getState().homeName).toBe("Otro");
    first.getState().setHomeName("Cambiado");
    first.getState().save();
    expect(getMatch(db, otherId)?.homeName).toBe("Otro");
  });
});

describe("match details draft, read once", () => {
  it("RF-082: the draft keeps the values it read when it opened, even when the match changes in the database later", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    updateMatchDetails(db, matchId, {
      date: "2027-01-01",
      time: null,
      homeName: "Cambiado fuera",
      awayName: null,
      homeScore: null,
      awayScore: null,
      notes: null,
    });
    expect(store.getState()).toMatchObject({
      status: "ready",
      date: "2026-03-01",
      time: "18:30",
      homeName: "Local",
      notes: "Pista 2",
    });
  });

  it("RF-027: setMyTeamAs uses the team's name as the draft read it, not a name changed later", () => {
    const { db, matchId, teamId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    updateTeam(db, teamId, {
      name: "Alevín B",
      category: "2015",
      defaultFormat: 6,
    });
    store.getState().setMyTeamAs("home");
    expect(store.getState().homeName).toBe("Alevín A");
  });
});

describe("match details draft, leaving and coming back", () => {
  it("RF-082: a draft dropped without save leaves the match as it was, and a new draft reads the saved values", () => {
    const { db, matchId } = seeded(FILLED);
    const before = getMatch(db, matchId);
    const dropped = createMatchDetailsDraft(db, matchId);
    dropped.getState().setHomeName("Perdido");
    dropped.getState().clearTime();
    expect(getMatch(db, matchId)).toEqual(before);
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      homeName: "Local",
      time: "18:30",
    });
  });

  it("RF-028 RF-082: a saved draft, dropped, and another opened later on the same database read the saved details", () => {
    const { db, matchId } = seeded(FILLED);
    const first = createMatchDetailsDraft(db, matchId);
    first.getState().setAwayName("Guardado");
    first.getState().save();
    const reopened = createMatchDetailsDraft(db, matchId);
    expect(reopened.getState().awayName).toBe("Guardado");
    expect(reopened.getState().status).toBe("ready");
  });

  it("RF-028: after a save, the same draft can be edited and saved again, and the last save is in the database", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Uno");
    expect(store.getState().save().kind).toBe("saved");
    store.getState().setHomeName("Dos");
    expect(store.getState().save().kind).toBe("saved");
    expect(getMatch(db, matchId)?.homeName).toBe("Dos");
  });

  it("RF-027: typing, the quick option and typing again leave the last text, and a cleared time can come back", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("A mano");
    store.getState().setMyTeamAs("home");
    store.getState().setHomeName("Otra vez");
    store.getState().clearTime();
    store.getState().setTime({ hour: 20, minute: 0 });
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: "Otra vez",
      time: "20:00",
    });
  });
});
