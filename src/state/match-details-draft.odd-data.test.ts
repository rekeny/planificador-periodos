// T095: odd data of the match details draft (RF-025, RF-027, RF-028, E-022). The text typed goes
// through the domain's validation for real and the match is read back from the database.
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

describe("match details draft, clearing and trimming", () => {
  it("RF-025 RF-083: every optional field cleared is saved as null, and the date and the format stay", () => {
    const { db, matchId } = seeded({ ...FILLED, format: 4 });
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().clearTime();
    store.getState().setHomeName("");
    store.getState().setAwayName("");
    store.getState().setHomeScore("");
    store.getState().setAwayScore("");
    store.getState().setNotes("");
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)).toMatchObject({
      format: 4,
      date: "2026-03-01",
      time: null,
      homeName: null,
      awayName: null,
      homeScore: null,
      awayScore: null,
      notes: null,
    });
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      time: null,
      homeName: "",
      awayName: "",
      homeScore: "",
      awayScore: "",
      notes: "",
    });
  });

  it("RF-025: names and notes of only spaces are saved as null, and the others are saved trimmed", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("   ");
    store.getState().setAwayName("\tVisitante ");
    store.getState().setNotes(" \n ");
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: null,
      awayName: "Visitante",
      notes: null,
    });
  });

  it("RF-025: a score typed as 007 and 1 is saved as the numbers 7 and 1, and 0 to 0 stays 0 to 0", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeScore("007");
    store.getState().setAwayScore("1");
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({ homeScore: 7, awayScore: 1 });
    store.getState().setHomeScore("0");
    store.getState().setAwayScore("0");
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });
});

describe("match details draft, the limits of E-022", () => {
  it("RF-025 E-022: names of 40 characters, notes of 500 and a score of 999 to 0 are saved and a new draft reads them unchanged", () => {
    const { db, matchId } = seeded();
    const home = "L".repeat(40);
    const away = "V".repeat(40);
    const notes = "n".repeat(500);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName(home);
    store.getState().setAwayName(away);
    store.getState().setNotes(notes);
    store.getState().setHomeScore("999");
    store.getState().setAwayScore("0");
    expect(store.getState().save()).toEqual({ kind: "saved" });
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: home,
      awayName: away,
      notes,
      homeScore: 999,
      awayScore: 0,
    });
    expect(createMatchDetailsDraft(db, matchId).getState()).toMatchObject({
      homeName: home,
      awayName: away,
      notes,
      homeScore: "999",
      awayScore: "0",
    });
  });

  it("RF-025 E-022: names with accents, quotes and an emoji are saved as they are", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setHomeName("Ñandú «Sub-12» 🏀");
    store.getState().setNotes("línea 1\nlínea 2 'x' \"y\"");
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: "Ñandú «Sub-12» 🏀",
      notes: "línea 1\nlínea 2 'x' \"y\"",
    });
  });
});

describe("match details draft, an unknown match", () => {
  it("RF-028 RF-082: an unknown matchId gives status notFound, with save answering unchanged and nothing written", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId + 100);
    expect(store.getState().status).toBe("notFound");
    store.getState().setHomeName("Nada");
    expect(store.getState().save()).toEqual({ kind: "unchanged" });
    expect(getMatch(db, matchId + 100)).toBeUndefined();
    expect(getMatch(db, matchId)).toMatchObject(FILLED);
  });

  it.each([0, -1, 1.5])(
    "RF-028: the id %s, which no match has, gives status notFound",
    (id) => {
      const { db } = seeded(FILLED);
      expect(createMatchDetailsDraft(db, id).getState().status).toBe(
        "notFound",
      );
    },
  );

  it("RF-028: a database with no match at all gives status notFound for any id", () => {
    const db = createTestDatabase();
    expect(createMatchDetailsDraft(db, 1).getState().status).toBe("notFound");
  });
});

describe("match details draft, setMyTeamAs (RF-027)", () => {
  it("RF-027: setMyTeamAs(home) writes the team's name only, without the category, and leaves the away name", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setMyTeamAs("home");
    expect(store.getState().homeName).toBe("Alevín A");
    expect(store.getState().awayName).toBe("Visitante");
  });

  it("RF-027: setMyTeamAs(away) writes the team's name in the away field and leaves the home name", () => {
    const { db, matchId } = seeded(FILLED);
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setMyTeamAs("away");
    expect(store.getState().awayName).toBe("Alevín A");
    expect(store.getState().homeName).toBe("Local");
  });

  it("RF-027: the text can be edited after the quick option, and saving writes the edited text", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setMyTeamAs("home");
    store.getState().setHomeName(`${store.getState().homeName} B`);
    store.getState().save();
    expect(getMatch(db, matchId)?.homeName).toBe("Alevín A B");
  });

  it("RF-027: the quick option on both sides gives the same name twice, and saving keeps both", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId);
    store.getState().setMyTeamAs("home");
    store.getState().setMyTeamAs("away");
    store.getState().save();
    expect(getMatch(db, matchId)).toMatchObject({
      homeName: "Alevín A",
      awayName: "Alevín A",
    });
  });

  it("RF-027: the quick option on an unknown match writes no name", () => {
    const { db, matchId } = seeded();
    const store = createMatchDetailsDraft(db, matchId + 100);
    store.getState().setMyTeamAs("home");
    expect(store.getState().homeName).toBe("");
  });
});
