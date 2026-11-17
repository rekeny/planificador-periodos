// Squad store side of the "read fails after a committed write" tests (Codex F3, RF-085). This file
// holds no test calls. Expected API as in squad-fixtures.ts: createSquadStore(db) with loadTeams(),
// openTeam(id), createTeam(input), updateTeam(id, input) and addPlayer(input).
import type { AppDatabase } from "@/data/database-types";
import { listPlayers } from "@/data/player-repository";
import { listTeams } from "@/data/team-repository";
import { createSquadStore } from "@/state/squad-store";
import type { SaveResult } from "@/state/save-result";
import {
  answerOf,
  guardReadsAfterWrites,
  outcomeOf,
  type Picture,
  type Write,
} from "./read-after-write";
import { createTestDatabase } from "./test-database";
import { ALEVIN, type SquadStore } from "./squad-fixtures";

/** The published state and the rows of the database, which must always tell the same story. */
export function squadPicture(
  store: SquadStore,
  raw: AppDatabase,
  saveFailed = false,
): Picture {
  const { teams, team, players, duplicateNumbers, status } = store.getState();
  return {
    state: {
      teams,
      team,
      players,
      duplicateNumbers,
      status,
      savedTeams: listTeams(raw),
      savedPlayers: listTeams(raw).map((t) => listPlayers(raw, t.id)),
    },
    saveFailed,
  };
}

function built(names: readonly string[], guarded: boolean, writes: Write[]) {
  const raw = createTestDatabase();
  const seed = createSquadStore(raw);
  names.forEach((name) => seed.getState().createTeam({ ...ALEVIN, name }));
  const guard = guardReadsAfterWrites(raw, guarded ? writes : []);
  const store = createSquadStore(guard.db);
  store.getState().loadTeams();
  const first = listTeams(raw)[0];
  if (first !== undefined) {
    store.getState().openTeam(first.id);
  }
  return { raw, store, guard };
}

/**
 * A squad with the named teams saved and published, the first one open, and a store whose reads
 * fail right after one of the watched writes. `twin` is the same squad on a healthy device.
 */
export function squadWith(names: readonly string[], writes: Write[]) {
  return {
    ...built(names, true, writes),
    twin: built(names, false, writes),
  };
}

type Squad = ReturnType<typeof squadWith>;

/** Does the action on the failing squad and on its healthy twin, and says what RF-085 sees. */
export function judged(
  squad: Squad,
  action: (store: SquadStore) => SaveResult,
) {
  const before = squadPicture(squad.store, squad.raw);
  action(squad.twin.store);
  const result = answerOf(() => action(squad.store));
  const after = squadPicture(
    squad.store,
    squad.raw,
    result.kind === "saveFailed",
  );
  const healthy = squadPicture(squad.twin.store, squad.twin.raw);
  return { result, outcome: outcomeOf(result, before, after, healthy) };
}
