// T086: create() saves the draft as a match with its call-up (RF-025, RF-030, RF-031, RF-036,
// RF-084, E-015, E-024, E-030). The saved values come from the domain's validation; the database is
// the real in-memory one and the tests read the match back from it.
import { getMatch } from "@/data/match-repository";
import { getTeam } from "@/data/team-repository";
import {
  addSquad,
  deactivate,
  newDraft,
  openedDraft,
  savedEntryLabels,
  teamOf,
} from "../../tests/support/new-match-fixtures";
import type { NewMatchDraft } from "../../tests/support/new-match-fixtures";
import type { AppDatabase } from "@/data/database-types";

function createdId(store: NewMatchDraft): number {
  const result = store.getState().create();
  expect(result.kind).toBe("saved");
  expect(result.matchId).toEqual(expect.any(Number));
  return result.matchId ?? 0;
}

function savedMatch(db: AppDatabase, id: number) {
  const match = getMatch(db, id);
  expect(match).toBeDefined();
  return match;
}

describe("new-match draft create, the defaults and the call-up", () => {
  it("RF-025 RF-030 RF-036: create with the defaults of a 6-period team saves format 6, the clock's date, no time and no home, away, score or notes", () => {
    const { store, db, team } = openedDraft(12);
    const id = createdId(store);
    expect(savedMatch(db, id)).toEqual({
      id,
      teamId: team.id,
      format: 6,
      date: "2026-11-11",
      time: null,
      homeName: null,
      awayName: null,
      notes: null,
      homeScore: null,
      awayScore: null,
      overtimeCount: 0,
    });
  });

  it("RF-030 RF-031: 12 selected players give a match with 12 call-up entries holding each name and number", () => {
    const { store, db } = openedDraft(12);
    const labels = savedEntryLabels(db, createdId(store));
    expect(labels).toHaveLength(12);
    expect(labels).toContain("1 Jugador 1");
    expect(labels).toContain("12 Jugador 12");
  });

  it("RF-030 RF-031: only the selected players are in the call-up, and the deselected ones stay in the team", () => {
    const { store, db, ids } = openedDraft(12);
    store.getState().toggle(ids[0] ?? 0);
    store.getState().toggle(ids[11] ?? 0);
    const labels = savedEntryLabels(db, createdId(store));
    expect(labels).toHaveLength(10);
    expect(labels).not.toContain("1 Jugador 1");
    expect(labels).not.toContain("12 Jugador 12");
  });

  it("RF-030: a deactivated player is not in the call-up of the created match", () => {
    const draft = newDraft();
    const team = teamOf(draft.db);
    const ids = addSquad(draft.db, team.id, 13);
    deactivate(draft.db, ids[12] ?? 0);
    draft.store.getState().reset(team.id);
    const labels = savedEntryLabels(draft.db, createdId(draft.store));
    expect(labels).toHaveLength(12);
    expect(labels).not.toContain("13 Jugador 13");
  });

  it("RF-031: a player deselected in one match is selected again in the next new match", () => {
    const { store, db, team, ids } = openedDraft(12);
    store.getState().toggle(ids[3] ?? 0);
    createdId(store);
    store.getState().reset(team.id);
    const second = savedEntryLabels(db, createdId(store));
    expect(second).toHaveLength(12);
    expect(second).toContain("4 Jugador 4");
  });

  it("RF-025: the match belongs to the draft's team and holds only that team's players", () => {
    const draft = newDraft();
    const first = teamOf(draft.db, { name: "Alevín A" });
    const second = teamOf(draft.db, { name: "Cadete B" });
    addSquad(draft.db, first.id, 9);
    addSquad(draft.db, second.id, 10);
    draft.store.getState().reset(second.id);
    const id = createdId(draft.store);
    expect(savedMatch(draft.db, id)?.teamId).toBe(second.id);
    expect(savedEntryLabels(draft.db, id)).toHaveLength(10);
  });

  it("RF-025: no player selected gives a match with an empty call-up", () => {
    const { store, db, ids } = openedDraft(9);
    ids.forEach((id) => store.getState().toggle(id));
    const id = createdId(store);
    expect(savedEntryLabels(db, id)).toEqual([]);
    expect(savedMatch(db, id)).toBeDefined();
  });
});

describe("new-match draft create, outside the rules", () => {
  it("RF-010 E-015: 8 selected players in 6 periods are created and the range warning stays in the draft", () => {
    const { store, db } = openedDraft(8);
    const id = createdId(store);
    expect(savedEntryLabels(db, id)).toHaveLength(8);
    expect(store.getState().callUpRange).not.toBeNull();
  });

  it("RF-010 E-030: 13 selected players are created and the range warning stays in the draft", () => {
    const { store, db } = openedDraft(13);
    const id = createdId(store);
    expect(savedEntryLabels(db, id)).toHaveLength(13);
    expect(store.getState().callUpRange).not.toBeNull();
  });

  it("RF-010 E-015: 12 selected players, the most the range allows, are created with no range warning", () => {
    const { store, db } = openedDraft(12);
    expect(store.getState().callUpRange).toBeNull();
    expect(savedEntryLabels(db, createdId(store))).toHaveLength(12);
  });
});

describe("new-match draft create, the format", () => {
  it("RF-084 E-024: a match created with 8 periods in a 6-period team has format 8 and the team's default stays 6", () => {
    const { store, db, team } = openedDraft(12, 6);
    store.getState().setFormat(8);
    const id = createdId(store);
    expect(savedMatch(db, id)?.format).toBe(8);
    expect(getTeam(db, team.id)?.defaultFormat).toBe(6);
  });

  it.each([4, 6, 8] as const)(
    "RF-036 RF-084: a team whose default format is %i saves a match with that format when the coach changes nothing",
    (format) => {
      const { store, db } = openedDraft(10, format);
      expect(savedMatch(db, createdId(store))?.format).toBe(format);
    },
  );

  it("RF-084 E-024: after a 4-period match in a 6-period team, the next new match opens with 6 periods again", () => {
    const { store, db, team } = openedDraft(12, 6);
    store.getState().setFormat(4);
    createdId(store);
    store.getState().reset(team.id);
    expect(store.getState().format).toBe(6);
    expect(savedMatch(db, createdId(store))?.format).toBe(6);
  });
});
