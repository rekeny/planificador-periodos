// D2 review F1 (RF-082): a reset that cannot load its team (it does not exist, or a read fails)
// must leave the draft empty and unsaveable, never holding the previous team's identity or text.
// Failures come from a real renamed table, never from a mocked repository.
import {
  newDraft,
  openedDraft,
  savedMatches,
  teamOf,
  addSquad,
} from "../../tests/support/new-match-fixtures";
import { breakReads } from "../../tests/support/squad-fixtures";

describe("new-match draft, a reset that cannot load its team", () => {
  it("RF-082: reset for team A, unsaved text, then reset for a team that does not exist: create returns unchanged and saves nothing", () => {
    const { store, db, team } = openedDraft(12);
    store.getState().setHomeName("Abandoned home");
    store.getState().setNotes("Abandoned notes");
    store.getState().reset(9999);
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
    expect(savedMatches(db)).toEqual([]);
    expect(team.id).not.toBe(9999);
  });

  it("RF-082: after resetting for a team that does not exist the draft holds no text, no selection and no team name", () => {
    const { store } = openedDraft(12);
    store.getState().setHomeName("Abandoned home");
    store.getState().setAwayName("Abandoned away");
    store.getState().setHomeScore("10");
    store.getState().setAwayScore("8");
    store.getState().setNotes("Abandoned notes");
    store.getState().reset(9999);
    expect(store.getState()).toMatchObject({
      homeName: "",
      awayName: "",
      homeScore: "",
      awayScore: "",
      notes: "",
      callUpSelection: [],
      callUpRange: null,
    });
    store.getState().setMyTeamAs("home");
    expect(store.getState().homeName).toBe("");
  });

  it("RF-082: the team's own reset after one for a team that does not exist works again and saves its match", () => {
    const { store, db, team } = openedDraft(12);
    store.getState().reset(9999);
    store.getState().reset(team.id);
    expect(store.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toHaveLength(1);
  });

  it("RF-082: a reset for a team that does not exist, on a draft that was never reset, leaves it empty and unsaveable", () => {
    const { store, db } = newDraft();
    teamOf(db);
    store.getState().reset(9999);
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
    expect(store.getState().callUpSelection).toEqual([]);
  });

  it("RF-082 RF-085: a reset whose team read fails does not throw and leaves the draft empty and unsaveable", () => {
    const { store, db, team } = openedDraft(12);
    store.getState().setHomeName("Abandoned home");
    breakReads(db, "teams");
    expect(() => store.getState().reset(team.id)).not.toThrow();
    expect(store.getState().homeName).toBe("");
    expect(store.getState().callUpSelection).toEqual([]);
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
  });

  it("RF-082 RF-085: a reset whose players read fails does not throw and leaves the draft empty and unsaveable", () => {
    const { store, db, team } = openedDraft(12);
    store.getState().setNotes("Abandoned notes");
    breakReads(db, "players");
    expect(() => store.getState().reset(team.id)).not.toThrow();
    expect(store.getState().notes).toBe("");
    expect(store.getState().callUpSelection).toEqual([]);
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
  });

  it("RF-082: a reset for another team that exists replaces the previous team's text and saves under the new team", () => {
    const { store, db } = openedDraft(12);
    store.getState().setHomeName("Abandoned home");
    const other = teamOf(db, { name: "Cadete B" });
    addSquad(db, other.id, 9);
    store.getState().reset(other.id);
    expect(store.getState().homeName).toBe("");
    expect(store.getState().callUpSelection).toHaveLength(9);
    expect(store.getState().create().kind).toBe("saved");
    expect(savedMatches(db)[0]?.teamId).toBe(other.id);
  });
});
