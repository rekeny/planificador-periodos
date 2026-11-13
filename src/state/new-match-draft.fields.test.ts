// T040: the fields of the new-match draft (RF-026, RF-027, RF-036, RF-083, RF-084, E-024). The
// defaults come from the team and the clock, the pickers' parts are stored as text, and a reset
// drops everything typed (the screen closed without «Guardar», RF-082).
import { getTeam } from "@/data/team-repository";
import {
  addSquad,
  clockAt,
  newDraft,
  openedDraft,
  teamOf,
} from "../../tests/support/new-match-fixtures";

describe("new-match draft, defaults", () => {
  it("RF-026 RF-036 RF-083: a draft opened on a 6-period team has format 6, the clock's date 2026-11-11, no time and empty home, away, score and notes", () => {
    const { store } = openedDraft(12, 6);
    expect(store.getState()).toMatchObject({
      format: 6,
      date: "2026-11-11",
      time: null,
      homeName: "",
      awayName: "",
      homeScore: "",
      awayScore: "",
      notes: "",
    });
  });

  it.each([4, 6, 8] as const)(
    "RF-036 RF-084: a team whose default format is %i opens a draft with that format",
    (format) => {
      const { store } = openedDraft(10, format);
      expect(store.getState().format).toBe(format);
    },
  );

  it("RF-026: the date is read from the clock at every reset, so the next day gives the new day", () => {
    const { store, clock, team } = openedDraft(12);
    clock.now = clockAt(2026, 11, 12).now;
    expect(store.getState().date).toBe("2026-11-11");
    store.getState().reset(team.id);
    expect(store.getState().date).toBe("2026-11-12");
  });

  it("RF-026: the date at the end of a month and of a year is the clock's day as it is, 2026-12-31", () => {
    const draft = newDraft(clockAt(2026, 12, 31));
    const team = teamOf(draft.db);
    draft.store.getState().reset(team.id);
    expect(draft.store.getState().date).toBe("2026-12-31");
  });

  it("RF-026 RF-083: the date can be changed from the picker's parts and is kept, with zeros in the month and the day", () => {
    const { store } = openedDraft(12);
    store.getState().setDate({ year: 2026, month: 3, day: 1 });
    expect(store.getState().date).toBe("2026-03-01");
  });
});

describe("new-match draft, time", () => {
  it("RF-083: setTime stores the picker's hour and minute as HH:MM with zeros, 09:05", () => {
    const { store } = openedDraft(12);
    store.getState().setTime({ hour: 9, minute: 5 });
    expect(store.getState().time).toBe("09:05");
  });

  it("RF-083: setTime with 00:00 stores the text 00:00, not an empty time", () => {
    const { store } = openedDraft(12);
    store.getState().setTime({ hour: 0, minute: 0 });
    expect(store.getState().time).toBe("00:00");
  });

  it("RF-083: clearTime leaves no time, and clearTime with no time leaves no time", () => {
    const { store } = openedDraft(12);
    store.getState().clearTime();
    expect(store.getState().time).toBeNull();
    store.getState().setTime({ hour: 18, minute: 30 });
    store.getState().clearTime();
    expect(store.getState().time).toBeNull();
  });

  it("RF-083: setTime, clearTime and setTime again leave the last time, 20:15", () => {
    const { store } = openedDraft(12);
    store.getState().setTime({ hour: 18, minute: 30 });
    store.getState().clearTime();
    store.getState().setTime({ hour: 20, minute: 15 });
    expect(store.getState().time).toBe("20:15");
  });
});

describe("new-match draft, format", () => {
  it("RF-084 E-024: setFormat(8) on a 6-period team gives the draft 8 periods and leaves the team's default at 6", () => {
    const { store, db, team } = openedDraft(12, 6);
    store.getState().setFormat(8);
    expect(store.getState().format).toBe(8);
    expect(getTeam(db, team.id)?.defaultFormat).toBe(6);
  });

  it("RF-084: a format change does not touch the call-up selection or the fields typed", () => {
    const { store } = openedDraft(12, 6);
    store.getState().setHomeName("Local");
    store
      .getState()
      .toggle(store.getState().callUpSelection[0]?.player.id ?? 0);
    store.getState().setFormat(4);
    expect(store.getState().homeName).toBe("Local");
    expect(
      store.getState().callUpSelection.filter((r) => r.selected),
    ).toHaveLength(11);
  });
});

describe("new-match draft, home, away, score and notes", () => {
  it("RF-027: the home, away, score and notes fields keep exactly the text typed, a score included as «007» or «1a»", () => {
    const { store } = openedDraft(12);
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

  it("RF-027: setMyTeamAs('home') writes the team name only, without the category, and leaves the away field alone", () => {
    const { store } = openedDraft(12);
    store.getState().setMyTeamAs("home");
    expect(store.getState().homeName).toBe("Alevín A");
    expect(store.getState().awayName).toBe("");
  });

  it("RF-027: setMyTeamAs('away') writes the team name in the away field and leaves the home field alone", () => {
    const { store } = openedDraft(12);
    store.getState().setMyTeamAs("away");
    expect(store.getState().awayName).toBe("Alevín A");
    expect(store.getState().homeName).toBe("");
  });

  it("RF-027: setMyTeamAs('home') and then setMyTeamAs('away') write the name in each field as asked", () => {
    const { store } = openedDraft(12);
    store.getState().setMyTeamAs("home");
    store.getState().setMyTeamAs("away");
    expect(store.getState().homeName).toBe("Alevín A");
    expect(store.getState().awayName).toBe("Alevín A");
  });

  it("RF-027: the quick home name can then be edited, and editing it never changes the away field", () => {
    const { store } = openedDraft(12);
    store.getState().setMyTeamAs("home");
    store.getState().setHomeName("Alevín A (casa)");
    expect(store.getState().homeName).toBe("Alevín A (casa)");
    expect(store.getState().awayName).toBe("");
  });
});

describe("new-match draft, reset", () => {
  it("RF-082 RF-026 RF-083: a reset drops every field typed before and goes back to the defaults", () => {
    const { store, team } = openedDraft(12, 6);
    store.getState().setFormat(8);
    store.getState().setDate({ year: 2027, month: 1, day: 2 });
    store.getState().setTime({ hour: 18, minute: 30 });
    store.getState().setMyTeamAs("home");
    store.getState().setAwayName("Rival");
    store.getState().setHomeScore("10");
    store.getState().setAwayScore("8");
    store.getState().setNotes("Notas");
    store.getState().reset(team.id);
    expect(store.getState()).toMatchObject({
      format: 6,
      date: "2026-11-11",
      time: null,
      homeName: "",
      awayName: "",
      homeScore: "",
      awayScore: "",
      notes: "",
    });
  });

  it("RF-036 RF-082: a reset on another team takes that team's default format and its players", () => {
    const { store, db } = openedDraft(12, 6);
    const other = teamOf(db, { name: "Cadete B", defaultFormat: 8 });
    addSquad(db, other.id, 9);
    store.getState().reset(other.id);
    expect(store.getState().format).toBe(8);
    expect(store.getState().callUpSelection).toHaveLength(9);
  });
});
