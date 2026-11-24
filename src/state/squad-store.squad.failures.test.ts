// T075: updatePlayer and setPlayerActive when saving fails (RF-018, RF-022, RF-082, RF-085, D3
// rule 2: read first, write last). A throwing write, a throwing read before it and a read that
// would throw after it each change nothing, publish nothing and answer saveFailed (the last one
// never happens, because nothing is read after the commit). The failures are real SQLite triggers
// and a guard on `select` (tests/support/read-after-write.ts); nothing is mocked.
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/data/database-types";
import { createPlayer, listPlayers } from "@/data/player-repository";
import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import type { SaveResult } from "@/state/save-result";
import {
  openWithTwoTeams,
  rowsOfTeam,
} from "../../tests/data/team-delete-fixtures";
import {
  guardReadsAfterWrites,
  type Write,
} from "../../tests/support/read-after-write";
import { judged, squadWith } from "../../tests/support/read-after-write-squad";
import {
  allowWrites,
  failWrites,
  type SquadStore,
} from "../../tests/support/squad-fixtures";

type Action = (store: SquadStore, playerId: number) => SaveResult;

const ACTIONS: readonly (readonly [string, Action])[] = [
  [
    "updatePlayer",
    (store, id) =>
      store.getState().updatePlayer(id, { name: "Juan Pérez", number: "9" }),
  ],
  [
    "setPlayerActive",
    (store, id) => store.getState().setPlayerActive(id, false),
  ],
];

/** Alevín A (Juan 7, Ana 8, inactive Eva 00) open in a store on `db`, and Cadete B. */
function openedOn(db: AppDatabase, teamId: number): SquadStore {
  const store = createSquadStore(db);
  store.getState().loadTeams();
  store.getState().openTeam(teamId);
  return store;
}

function everything(db: AppDatabase) {
  return listTeams(db).map((team) => rowsOfTeam(db, team.id));
}

describe("squad store, a player action whose write fails", () => {
  it.each(ACTIONS)(
    "RF-018 RF-022 RF-085: when the write of %s throws it answers saveFailed and changes nothing, in the database or in what is published",
    (_name, act) => {
      const { db, first } = openWithTwoTeams();
      const store = openedOn(db, first.teamId);
      const rows = everything(db);
      const before = store.getState();
      failWrites(db, "players", "UPDATE");
      expect(act(store, first.playerIds[0] ?? 0)).toEqual({
        kind: "saveFailed",
      });
      expect(everything(db)).toEqual(rows);
      expect(store.getState()).toBe(before);
    },
  );

  it.each(ACTIONS)(
    "RF-018 RF-022 RF-085: after a failed write of %s the next try, with space again, saves and publishes once",
    (_name, act) => {
      const { db, first } = openWithTwoTeams();
      const store = openedOn(db, first.teamId);
      const juan = first.playerIds[0] ?? 0;
      failWrites(db, "players", "UPDATE");
      act(store, juan);
      allowWrites(db, "players", "UPDATE");
      expect(act(store, juan)).toEqual({ kind: "saved" });
      const saved = listPlayers(db, first.teamId).find((p) => p.id === juan);
      expect(store.getState().players.find((p) => p.id === juan)).toEqual(
        saved,
      );
      expect(saved).not.toEqual({
        id: juan,
        teamId: first.teamId,
        name: "Juan",
        number: "7",
        isActive: true,
      });
    },
  );

  it("RF-018 RF-085: a failed updatePlayer leaves the duplicate warning as it was", () => {
    const { db, first } = openWithTwoTeams();
    createPlayer(db, { teamId: first.teamId, name: "Bea", number: "7" });
    const store = openedOn(db, first.teamId);
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
    failWrites(db, "players", "UPDATE");
    store
      .getState()
      .updatePlayer(first.playerIds[0] ?? 0, { name: "Juan", number: "9" });
    expect(store.getState().duplicateNumbers).toEqual(["7"]);
  });
});

describe("squad store, a player action whose read before the write fails", () => {
  /** The reads throw once the test writes the watched table itself, before the action. */
  function readsBroken() {
    const { db, first } = openWithTwoTeams();
    const watched: Write[] = [["teams", "UPDATE"]];
    const guard = guardReadsAfterWrites(db, watched);
    const store = openedOn(guard.db, first.teamId);
    const rows = everything(db);
    const before = store.getState();
    db.run(sql`UPDATE teams SET name = name`);
    return { db, first, guard, store, rows, before };
  }

  it.each(ACTIONS)(
    "RF-018 RF-022 RF-085: when the read before the write of %s throws it answers saveFailed, writes nothing and publishes nothing",
    (_name, act) => {
      const { db, first, store, rows, before } = readsBroken();
      expect(act(store, first.playerIds[0] ?? 0)).toEqual({
        kind: "saveFailed",
      });
      expect(everything(db)).toEqual(rows);
      expect(store.getState()).toBe(before);
    },
  );

  it.each(ACTIONS)(
    "RF-018 RF-022 RF-085: once the reads work again, %s saves and publishes what it was asked",
    (_name, act) => {
      const { first, guard, store } = readsBroken();
      const juan = first.playerIds[0] ?? 0;
      act(store, juan);
      guard.heal();
      expect(act(store, juan)).toEqual({ kind: "saved" });
      expect(store.getState().players.find((p) => p.id === juan)).not.toEqual(
        expect.objectContaining({ name: "Juan", number: "7", isActive: true }),
      );
    },
  );
});

describe("squad store, a read that would fail after the write of a player action", () => {
  /** Alevín A with Juan 7 and Ana 8 in both the guarded squad and its healthy twin. */
  function twoPlayers() {
    const squad = squadWith(["Alevín A"], [["players", "UPDATE"]]);
    for (const side of [squad, squad.twin]) {
      const teamId = listTeams(side.raw)[0]?.id ?? 0;
      createPlayer(side.raw, { teamId, name: "Juan", number: "7" });
      createPlayer(side.raw, { teamId, name: "Ana", number: "8" });
      side.store.getState().openTeam(teamId);
    }
    const teamId = listTeams(squad.raw)[0]?.id ?? 0;
    return { squad, juan: listPlayers(squad.raw, teamId)[0]?.id ?? 0 };
  }

  it.each(ACTIONS)(
    "RF-018 RF-022 RF-085: %s publishes from what it read before the write, so a failing read after it changes nothing: saved and published, as on a healthy device",
    (_name, act) => {
      const { squad, juan } = twoPlayers();
      const { result, outcome } = judged(squad, (store) => act(store, juan));
      expect(result).toEqual({ kind: "saved" });
      expect(outcome).toBe("published");
    },
  );
});
