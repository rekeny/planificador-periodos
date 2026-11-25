// F-D3-04 (Codex review of PR 25, finding 2, RF-023, RF-032): a player deactivated AFTER the draft
// was created is dropped from the selection when «Guardar» creates the match, so the saved call-up
// never holds a deactivated player. The squad store and the draft share one real in-memory
// database, as the app shares one file; nothing is mocked.
import { createSquadStore } from "@/state/squad-store";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  openedDraft,
  savedEntryLabels,
  savedMatches,
} from "../../tests/support/new-match-fixtures";

/** A draft of a team of 10 players (numbers 1 to 10, all selected), and a squad store on its database. */
function draftWithSquad() {
  const opened = openedDraft(10);
  const squad = createSquadStore(opened.db);
  squad.getState().openTeam(opened.team.id);
  return { ...opened, squad };
}

describe("new-match draft, a player deactivated after the draft was created (F-D3-04)", () => {
  it("F-D3-04 RF-023 RF-032: «Guardar» saves a call-up without the player deactivated since the draft was created", () => {
    const { store, db, squad, ids } = draftWithSquad();
    expect(squad.getState().setPlayerActive(ids[2] ?? 0, false)).toEqual({
      kind: "saved",
    });
    const created = store.getState().create();
    expect(created.kind).toBe("saved");
    const labels = savedEntryLabels(db, created.matchId ?? 0);
    expect(labels).toHaveLength(9);
    expect(labels).not.toContain("3 Jugador 3");
  });

  it("F-D3-04 RF-023 RF-032: with two players deactivated since, neither is saved and the other eight are", () => {
    const { store, db, squad, ids } = draftWithSquad();
    squad.getState().setPlayerActive(ids[0] ?? 0, false);
    squad.getState().setPlayerActive(ids[9] ?? 0, false);
    const created = store.getState().create();
    const labels = savedEntryLabels(db, created.matchId ?? 0);
    expect(labels).toHaveLength(8);
    expect(labels).not.toContain("1 Jugador 1");
    expect(labels).not.toContain("10 Jugador 10");
  });

  it("F-D3-04 RF-023 RF-025: a player deactivated since is not saved, and the player the coach had deselected stays out", () => {
    const { store, db, squad, ids } = draftWithSquad();
    store.getState().toggle(ids[3] ?? 0);
    squad.getState().setPlayerActive(ids[1] ?? 0, false);
    const created = store.getState().create();
    const labels = savedEntryLabels(db, created.matchId ?? 0);
    expect(labels).toHaveLength(8);
    expect(labels).not.toContain("2 Jugador 2");
    expect(labels).not.toContain("4 Jugador 4");
  });

  it("F-D3-04 RF-023 RF-024: a player deactivated and reactivated since the draft was created is saved, selected", () => {
    const { store, db, squad, ids } = draftWithSquad();
    squad.getState().setPlayerActive(ids[2] ?? 0, false);
    squad.getState().setPlayerActive(ids[2] ?? 0, true);
    const created = store.getState().create();
    expect(savedEntryLabels(db, created.matchId ?? 0)).toHaveLength(10);
  });

  it("F-D3-04 RF-085: when the players cannot be read to check them, «Guardar» saves nothing and returns saveFailed", () => {
    const { store, db } = draftWithSquad();
    breakReads(db, "players");
    expect(store.getState().create()).toEqual({ kind: "saveFailed" });
    expect(savedMatches(db)).toEqual([]);
  });
});
