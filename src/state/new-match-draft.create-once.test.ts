// T086: create() saves once and never half a match (RF-025, RF-031, RF-085, review P-30). Failures
// come from real SQLite triggers and a renamed table, never from a mocked repository.
import { createNewMatchDraft } from "@/state/new-match-draft";
import {
  allowInserts,
  breakMatchTable,
  failInserts,
  newDraft,
  openedDraft,
  savedEntryCount,
  savedMatches,
} from "../../tests/support/new-match-fixtures";

describe("new-match draft create, only once", () => {
  it("RF-025 P-30: create called twice in a row saves one match and returns the same id both times", () => {
    const { store, db } = openedDraft(12);
    const first = store.getState().create();
    const second = store.getState().create();
    expect(first.kind).toBe("saved");
    expect(second).toEqual(first);
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryCount(db)).toBe(12);
  });

  it("RF-025 P-30: a second create after a field changed writes nothing and returns the first match's id", () => {
    const { store, db } = openedDraft(12);
    store.getState().setNotes("first");
    const first = store.getState().create();
    store.getState().setNotes("second");
    store.getState().setFormat(4);
    expect(store.getState().create()).toEqual(first);
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedMatches(db)[0]).toMatchObject({ notes: "first", format: 6 });
  });

  it("RF-085 P-30: the second create returns saved without touching the database, even if writes would now fail", () => {
    const { store, db } = openedDraft(12);
    const first = store.getState().create();
    failInserts(db, "matches");
    expect(store.getState().create()).toEqual(first);
    expect(savedMatches(db)).toHaveLength(1);
  });

  it("RF-025 P-30: after a reset, create makes a new match with another id", () => {
    const { store, db, team } = openedDraft(12);
    const first = store.getState().create();
    store.getState().reset(team.id);
    const second = store.getState().create();
    expect(second.kind).toBe("saved");
    expect(second.matchId).not.toBe(first.matchId);
    expect(savedMatches(db)).toHaveLength(2);
    expect(savedEntryCount(db)).toBe(24);
  });

  it("RF-025: create on a draft never reset for a team returns unchanged and writes nothing", () => {
    const { store, db } = newDraft();
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-025: a reset for a team that does not exist leaves the draft never reset, so create returns unchanged", () => {
    const { store, db } = newDraft();
    store.getState().reset(9999);
    expect(store.getState().create()).toEqual({ kind: "unchanged" });
    expect(savedMatches(db)).toEqual([]);
  });

  it("RF-025: a fresh draft on a database that already has a match does not return that match's id", () => {
    const { store, db, team } = openedDraft(12);
    store.getState().create();
    const other = createNewMatchDraft(db, () => new Date(2026, 10, 11));
    expect(other.getState().create()).toEqual({ kind: "unchanged" });
    other.getState().reset(team.id);
    expect(other.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toHaveLength(2);
  });
});

describe("new-match draft create, when the write fails", () => {
  it("RF-085: a failing match insert returns saveFailed with no match and no entries", () => {
    const { store, db } = openedDraft(12);
    failInserts(db, "matches");
    expect(store.getState().create()).toEqual({ kind: "saveFailed" });
    expect(savedMatches(db)).toEqual([]);
    expect(savedEntryCount(db)).toBe(0);
  });

  it("RF-085: a failure writing the 3rd entry returns saveFailed and leaves no half-saved match", () => {
    const { store, db } = openedDraft(12);
    failInserts(db, "call_up_entries", "3");
    expect(store.getState().create()).toEqual({ kind: "saveFailed" });
    expect(savedMatches(db)).toEqual([]);
    expect(savedEntryCount(db)).toBe(0);
  });

  it("RF-085: a table that cannot be found makes create return saveFailed, never throw", () => {
    const { store, db } = openedDraft(12);
    breakMatchTable(db, "matches");
    expect(store.getState().create()).toEqual({ kind: "saveFailed" });
  });

  it("RF-085: a failed create keeps everything typed and selected", () => {
    const { store, db, ids } = openedDraft(12);
    store.getState().toggle(ids[0] ?? 0);
    store.getState().setHomeName("Local");
    store.getState().setHomeScore("3");
    store.getState().setAwayScore("2");
    failInserts(db, "matches");
    store.getState().create();
    expect(store.getState()).toMatchObject({
      homeName: "Local",
      homeScore: "3",
      awayScore: "2",
    });
    expect(
      store.getState().callUpSelection.filter((row) => row.selected),
    ).toHaveLength(11);
  });

  it("RF-085 P-30: after a failed create, a retry once writes work saves exactly one match with its entries", () => {
    const { store, db } = openedDraft(12);
    failInserts(db, "call_up_entries", "5");
    expect(store.getState().create().kind).toBe("saveFailed");
    allowInserts(db, "call_up_entries");
    const retry = store.getState().create();
    expect(retry.kind).toBe("saved");
    expect(savedMatches(db)).toHaveLength(1);
    expect(savedEntryCount(db)).toBe(12);
    expect(savedMatches(db)[0]?.id).toBe(retry.matchId);
  });

  it("RF-085: two failed creates in a row both return saveFailed and nothing is saved", () => {
    const { store, db } = openedDraft(12);
    failInserts(db, "matches");
    expect(store.getState().create().kind).toBe("saveFailed");
    expect(store.getState().create().kind).toBe("saveFailed");
    expect(savedMatches(db)).toEqual([]);
  });
});
