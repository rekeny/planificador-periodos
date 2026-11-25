// F-D3-04 (Codex review of PR 25, finding 2, RF-023, RF-032): a player deactivated AFTER the
// session was opened is no longer added to the call-up. The session keeps a cached `playersToAdd`
// that still offers him, so the add revalidates his current activity: it returns `unchanged` and
// writes nothing. The squad store and the session share one real in-memory database, as the app
// shares one file; nothing is mocked.
import { createSquadStore } from "@/state/squad-store";
import {
  savedCallUp,
  savedEntryIds,
  sessionWithBench,
} from "../../tests/support/match-session-call-up";
import { rowLabels } from "../../tests/support/match-session-fixtures";

const CALLED_UP = [
  ["Eva", "10"],
  ["Ana", "3"],
] as const;
const BENCH = [
  ["Carla", "5"],
  ["Dani", "1"],
] as const;

/** A session opened while Carla and Dani are active and outside the call-up, and a squad store on the same database. */
function openedWithBench() {
  const session = sessionWithBench(CALLED_UP, BENCH);
  session.store.getState().openMatch(session.matchId);
  const squad = createSquadStore(session.db);
  squad.getState().openTeam(session.teamId);
  const [carla, dani] = session.benched;
  return { ...session, squad, carla: carla?.id ?? 0, dani: dani?.id ?? 0 };
}

describe("match session, a player deactivated after the session was opened (F-D3-04)", () => {
  it("F-D3-04 RF-023 RF-032: adding the player who was deactivated since the session opened returns unchanged and writes no entry", () => {
    const { store, squad, db, matchId, carla } = openedWithBench();
    const entriesBefore = savedEntryIds(db, matchId);
    expect(squad.getState().setPlayerActive(carla, false)).toEqual({
      kind: "saved",
    });
    expect(store.getState().addToCallUp(carla)).toEqual({ kind: "unchanged" });
    expect(savedEntryIds(db, matchId)).toEqual(entriesBefore);
    expect(savedCallUp(db, matchId)).toEqual(["10 Eva", "3 Ana"]);
    expect(rowLabels(store)).toEqual(["3 Ana", "10 Eva"]);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("F-D3-04 RF-023 RF-032: after the refused add, another player who is still active is added as usual", () => {
    const { store, squad, db, matchId, carla, dani } = openedWithBench();
    squad.getState().setPlayerActive(carla, false);
    store.getState().addToCallUp(carla);
    expect(store.getState().addToCallUp(dani)).toEqual({ kind: "saved" });
    expect(savedCallUp(db, matchId)).toEqual(["1 Dani", "10 Eva", "3 Ana"]);
    expect(rowLabels(store)).toEqual(["1 Dani", "3 Ana", "10 Eva"]);
  });

  it("F-D3-04 RF-023 RF-024: a player deactivated and reactivated after the session opened is added as usual", () => {
    const { store, squad, db, matchId, carla } = openedWithBench();
    squad.getState().setPlayerActive(carla, false);
    squad.getState().setPlayerActive(carla, true);
    expect(store.getState().addToCallUp(carla)).toEqual({ kind: "saved" });
    expect(savedCallUp(db, matchId)).toEqual(["10 Eva", "3 Ana", "5 Carla"]);
  });
});
