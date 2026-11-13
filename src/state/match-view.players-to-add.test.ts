// T042: the view's playersToAdd, the active team players who are not in the call-up (RF-023,
// RF-032), sorted like the grid (E-020). The session test goes through the real store and database;
// the builder test calls buildMatchView with a source made by hand.
import type { MatchGrid } from "@/domain/grid";
import type { Player } from "@/domain/squad";
import { evaluateWarnings } from "@/domain/warnings";
import { buildMatchView } from "@/state/match-view";
import {
  deactivatePlayer,
  failWrites,
  sessionWithBench,
} from "../../tests/support/match-session-call-up";
import { squadSpecs } from "../../tests/support/match-session-fixtures";

function offered(store: ReturnType<typeof sessionWithBench>["store"]) {
  return (store.getState().view?.playersToAdd ?? []).map(
    (p) => `${p.number} ${p.name}`,
  );
}

describe("match session, playersToAdd in the view", () => {
  it("RF-023 RF-032 E-020: it offers only the active players who are not in the call-up, sorted by number and name", () => {
    const { store, matchId, teamId } = sessionWithBench(
      [
        ["Ana", "3"],
        ["Bea", "7"],
      ],
      [
        ["Luis", "00"],
        ["Eva", "10"],
        ["Dani", "0"],
        ["Carla", "0"],
      ],
    );
    store.getState().openMatch(matchId);
    expect(offered(store)).toEqual(["0 Carla", "0 Dani", "00 Luis", "10 Eva"]);
    expect(store.getState().view?.playersToAdd[0]).toEqual({
      id: expect.any(Number),
      teamId,
      name: "Carla",
      number: "0",
      isActive: true,
    });
  });

  it("RF-023 RF-032: it is empty when every active player of the team is in the call-up", () => {
    const { store, matchId } = sessionWithBench(squadSpecs(10), []);
    store.getState().openMatch(matchId);
    expect(store.getState().view?.playersToAdd).toEqual([]);
  });

  it("RF-017 RF-032: a deactivated player is never offered, whether or not he is in the call-up", () => {
    const { store, db, matchId, players, benched } = sessionWithBench(
      [
        ["Ana", "3"],
        ["Bea", "7"],
      ],
      [
        ["Carla", "5"],
        ["Dani", "1"],
      ],
    );
    deactivatePlayer(db, benched[0]?.id ?? 0);
    deactivatePlayer(db, players[1]?.id ?? 0);
    store.getState().openMatch(matchId);
    expect(offered(store)).toEqual(["1 Dani"]);
  });

  it("RF-032 RF-060: the player leaves the offer when she is added and comes back when her entry is removed", () => {
    const { store, matchId, benched, entryIds } = sessionWithBench(
      [["Ana", "3"]],
      [["Carla", "5"]],
    );
    store.getState().openMatch(matchId);
    expect(offered(store)).toEqual(["5 Carla"]);
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    expect(offered(store)).toEqual([]);
    store.getState().removeFromCallUp(entryIds[0] ?? 0);
    expect(offered(store)).toEqual(["3 Ana"]);
  });

  it("RF-017 RF-032: a player deactivated after being called up is not offered once her entry is removed", () => {
    const { store, db, matchId, players, entryIds } = sessionWithBench(
      [
        ["Ana", "3"],
        ["Bea", "7"],
      ],
      [],
    );
    store.getState().openMatch(matchId);
    deactivatePlayer(db, players[0]?.id ?? 0);
    store.getState().removeFromCallUp(entryIds[0] ?? 0);
    expect(offered(store)).toEqual([]);
  });

  it("RF-032 RF-085: a failed add leaves the offer as it was", () => {
    const { store, db, matchId, benched } = sessionWithBench(
      [["Ana", "3"]],
      [["Carla", "5"]],
    );
    store.getState().openMatch(matchId);
    failWrites(db, "call_up_entries", "INSERT");
    expect(store.getState().addToCallUp(benched[0]?.id ?? 0).kind).toBe(
      "saveFailed",
    );
    expect(offered(store)).toEqual(["5 Carla"]);
  });
});

describe("buildMatchView, playersToAdd", () => {
  const player = (id: number, number: string, isActive: boolean): Player => ({
    id,
    teamId: 1,
    name: `P${id}`,
    number,
    isActive,
  });
  const grid: MatchGrid = {
    format: 6,
    overtimeCount: 0,
    callUp: [{ id: 1, playerId: 1, name: "P1", number: "1" }],
    marks: {},
  };

  it("RF-023 RF-032: from the team's players it keeps the active ones that no call-up entry points to", () => {
    const view = buildMatchView({
      matchId: 9,
      grid,
      warnings: evaluateWarnings(grid),
      history: [],
      teamPlayers: [
        player(1, "1", true),
        player(2, "2", true),
        player(3, "3", false),
        player(4, "4", true),
      ],
    });
    expect(view.playersToAdd.map((p) => p.id)).toEqual([2, 4]);
  });
});
