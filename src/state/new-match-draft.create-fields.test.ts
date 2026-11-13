// T086: create() saves the normalised fields of the draft and reports the score errors (RF-025,
// RF-036). The domain's validation is not mocked: the text typed goes through it for real.
import { getMatch } from "@/data/match-repository";
import {
  openedDraft,
  savedMatches,
} from "../../tests/support/new-match-fixtures";
import type { NewMatchDraft } from "../../tests/support/new-match-fixtures";

function saved(store: NewMatchDraft, db: Parameters<typeof getMatch>[0]) {
  const result = store.getState().create();
  expect(result.kind).toBe("saved");
  return getMatch(db, result.matchId ?? 0);
}

describe("new-match draft create, the fields saved", () => {
  it("RF-025: every field filled, names of 40 characters, notes of 500, score 999 to 0 and a time, is saved and read back unchanged", () => {
    const { store, db } = openedDraft(12);
    const name40 = "L".repeat(40);
    const notes500 = "n".repeat(500);
    store.getState().setHomeName(name40);
    store.getState().setAwayName("V".repeat(40));
    store.getState().setHomeScore("999");
    store.getState().setAwayScore("0");
    store.getState().setNotes(notes500);
    store.getState().setTime({ hour: 18, minute: 30 });
    store.getState().setDate({ year: 2026, month: 12, day: 24 });
    expect(saved(store, db)).toMatchObject({
      homeName: name40,
      awayName: "V".repeat(40),
      homeScore: 999,
      awayScore: 0,
      notes: notes500,
      time: "18:30",
      date: "2026-12-24",
    });
  });

  it("RF-025: a score of 0 to 0 is saved as the numbers 0 and 0, not as empty", () => {
    const { store, db } = openedDraft(12);
    store.getState().setHomeScore("0");
    store.getState().setAwayScore("0");
    const match = saved(store, db);
    expect(match?.homeScore).toBe(0);
    expect(match?.awayScore).toBe(0);
  });

  it("RF-025: a score typed as 007 and 1 is saved as the numbers 7 and 1", () => {
    const { store, db } = openedDraft(12);
    store.getState().setHomeScore("007");
    store.getState().setAwayScore("1");
    const match = saved(store, db);
    expect(match?.homeScore).toBe(7);
    expect(match?.awayScore).toBe(1);
  });

  it("RF-025: names and notes are saved trimmed at both ends", () => {
    const { store, db } = openedDraft(12);
    store.getState().setHomeName("  Local  ");
    store.getState().setAwayName("\tVisitante ");
    store.getState().setNotes("  con prórroga \n");
    expect(saved(store, db)).toMatchObject({
      homeName: "Local",
      awayName: "Visitante",
      notes: "con prórroga",
    });
  });

  it("RF-025: a home name of only spaces, and spaces-only away name and notes, are saved as null", () => {
    const { store, db } = openedDraft(12);
    store.getState().setHomeName("   ");
    store.getState().setAwayName(" ");
    store.getState().setNotes("  \n ");
    expect(saved(store, db)).toMatchObject({
      homeName: null,
      awayName: null,
      notes: null,
    });
  });

  it("RF-025 RF-027: the team name placed on the home side with the quick action is saved as the home name", () => {
    const { store, db } = openedDraft(12);
    store.getState().setMyTeamAs("home");
    expect(saved(store, db)).toMatchObject({
      homeName: "Alevín A",
      awayName: null,
    });
  });

  it("RF-025 RF-083: a match with only the format and the date saves, with no time", () => {
    const { store, db } = openedDraft(10);
    store.getState().setTime({ hour: 9, minute: 0 });
    store.getState().clearTime();
    expect(saved(store, db)).toMatchObject({ time: null, notes: null });
  });

  it("RF-025: a time of 00:00 is saved as 00:00, not as no time", () => {
    const { store, db } = openedDraft(12);
    store.getState().setTime({ hour: 0, minute: 0 });
    expect(saved(store, db)?.time).toBe("00:00");
  });
});

describe("new-match draft create, the score is checked", () => {
  it.each([
    ["5", "", "scoreIncomplete"],
    ["", "5", "scoreIncomplete"],
    ["1a", "2", "scoreInvalid"],
    ["1000", "1", "scoreInvalid"],
    ["-1", "0", "scoreInvalid"],
    [" 5", "5", "scoreInvalid"],
  ] as const)(
    "RF-025: a home score %j and an away score %j return invalid with %s and save nothing",
    (home, away, error) => {
      const { store, db } = openedDraft(12);
      store.getState().setHomeScore(home);
      store.getState().setAwayScore(away);
      expect(store.getState().create()).toEqual({
        kind: "invalid",
        errors: [error],
      });
      expect(savedMatches(db)).toEqual([]);
    },
  );

  it("RF-025: an invalid create keeps everything typed and selected, and the corrected score then saves one match", () => {
    const { store, db, ids } = openedDraft(12);
    store.getState().toggle(ids[0] ?? 0);
    store.getState().setHomeName("Local");
    store.getState().setHomeScore("4");
    expect(store.getState().create().kind).toBe("invalid");
    expect(store.getState().homeName).toBe("Local");
    expect(store.getState().homeScore).toBe("4");
    expect(
      store.getState().callUpSelection.filter((row) => row.selected),
    ).toHaveLength(11);
    store.getState().setAwayScore("2");
    const match = saved(store, db);
    expect(match).toMatchObject({ homeScore: 4, awayScore: 2 });
    expect(savedMatches(db)).toHaveLength(1);
  });
});
