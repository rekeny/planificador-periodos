// T075: deleteTeam when saving fails (RF-015, RF-082, RF-085, D3 rule 2: read first, write last).
// A throwing delete, a throwing read before it and a read that would throw after it each change
// nothing, publish nothing and answer saveFailed (the last one never happens, because nothing is
// read after the commit). The failures are real SQLite triggers and a guard on `select`; nothing
// is mocked. The delete is one statement with cascades, so a failure in any of the five tables
// rolls the whole team back.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import {
  allowDeletesOf,
  failDeletesOf,
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";
import { guardReadsAfterWrites } from "../../tests/support/read-after-write";
import { judged, squadWith } from "../../tests/support/read-after-write-squad";
import type { SquadStore } from "../../tests/support/squad-fixtures";
import { teamNames } from "../../tests/support/squad-fixtures";

const TABLES = [
  ["teams"],
  ["players"],
  ["matches"],
  ["call_up_entries"],
  ["marks"],
] as const;

function openedOn(db: AppDatabase, teamId: number): SquadStore {
  const store = createSquadStore(db);
  store.getState().loadTeams();
  store.getState().openTeam(teamId);
  return store;
}

function everything(db: AppDatabase) {
  return listTeams(db).map((team) => rowsOfTeam(db, team.id));
}

describe("squad store, a team delete whose write fails", () => {
  it.each(TABLES)(
    "RF-015 RF-085: when deleting from %s throws, deleteTeam answers saveFailed and the team, its rows and the published state are as they were",
    (table) => {
      const { db, first } = openWithTwoTeams();
      const store = openedOn(db, first.teamId);
      const rows = everything(db);
      const before = store.getState();
      failDeletesOf(db, table);
      expect(store.getState().deleteTeam(first.teamId)).toEqual({
        kind: "saveFailed",
      });
      expect(everything(db)).toEqual(rows);
      expect(store.getState()).toBe(before);
      expect(teamNames(store)).toEqual(["Alevín A", "Cadete B"]);
    },
  );

  it("RF-015 RF-085: after a failed delete the next try, with space again, deletes the team and drops it from the list once", () => {
    const { db, first, second } = openWithTwoTeams();
    const store = openedOn(db, second.teamId);
    failDeletesOf(db, "marks");
    store.getState().deleteTeam(first.teamId);
    allowDeletesOf(db, "marks");
    expect(store.getState().deleteTeam(first.teamId)).toEqual({
      kind: "saved",
    });
    expect(teamNames(store)).toEqual(["Cadete B"]);
    expect(rowsOfTeam(db, first.teamId).team).toEqual([]);
  });

  it("RF-015 RF-085: a failed delete of the open team leaves the open team and its players published", () => {
    const { db, first } = openWithTwoTeams();
    const store = openedOn(db, first.teamId);
    const open = store.getState();
    failDeletesOf(db, "teams");
    store.getState().deleteTeam(first.teamId);
    expect(store.getState().team).toBe(open.team);
    expect(store.getState().status).toBe("open");
    expect(store.getState().addPlayer({ name: "Nuevo", number: "5" })).toEqual({
      kind: "saved",
    });
  });
});

describe("squad store, a team delete whose read before the write fails", () => {
  /** The reads throw once the test writes the watched table itself, before the action. */
  function readsBroken() {
    const { db, first, second } = openWithTwoTeams();
    const guard = guardReadsAfterWrites(db, [["teams", "UPDATE"]]);
    const store = openedOn(guard.db, first.teamId);
    const rows = everything(db);
    const before = store.getState();
    db.run(sql`UPDATE teams SET name = name`);
    return { db, first, second, guard, store, rows, before };
  }

  it("RF-015 RF-085: when the read before the delete throws, deleteTeam answers saveFailed, deletes nothing and publishes nothing", () => {
    const { db, first, store, rows, before } = readsBroken();
    expect(store.getState().deleteTeam(first.teamId)).toEqual({
      kind: "saveFailed",
    });
    expect(everything(db)).toEqual(rows);
    expect(store.getState()).toBe(before);
  });

  it("RF-015 RF-085: once the reads work again, the same delete saves and the team leaves the list", () => {
    const { db, first, guard, store } = readsBroken();
    store.getState().deleteTeam(first.teamId);
    guard.heal();
    expect(store.getState().deleteTeam(first.teamId)).toEqual({
      kind: "saved",
    });
    expect(teamNames(store)).toEqual(["Cadete B"]);
    expect(rowsOfTeam(db, first.teamId).team).toEqual([]);
  });
});

describe("squad store, a read that would fail after the delete of a team", () => {
  it.each([[0], [1]])(
    "RF-015 RF-085: deleting team number %s publishes from what was read before the write, so a failing read after it changes nothing: saved and published, as on a healthy device",
    (index) => {
      const squad = squadWith(["Alevín A", "Cadete B"], [["teams", "DELETE"]]);
      const id = listTeams(squad.raw)[index]?.id ?? 0;
      const { result, outcome } = judged(squad, (store) =>
        store.getState().deleteTeam(id),
      );
      expect(result).toEqual({ kind: "saved" });
      expect(outcome).toBe("published");
    },
  );
});
