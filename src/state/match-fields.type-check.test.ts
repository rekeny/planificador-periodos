// T095, phase 4 review M-2: `tsc` confirms that the new-match draft and the details draft are both
// assignable to `MatchFieldsStore`, the read-only store type that the match form takes in T072
// (`Pick<StoreApi<MatchFieldsState>, "getState" | "getInitialState" | "subscribe">`). The check is
// in the assignments below, which `npm run typecheck` compiles; if it refuses either one, the task
// stops and the plain-props fallback of plan.md "Deviations" is chosen. The test also runs, to show
// that what the type promises is there at run time. The stores are the real ones.
import { createNewMatchDraft } from "@/state/new-match-draft";
import { createMatchDetailsDraft } from "@/state/match-details-draft";
import type { MatchFieldsState, MatchFieldsStore } from "@/state/match-fields";
import { addMatch, addTeam } from "../../tests/data/schema-fixtures";
import { createTestDatabase } from "../../tests/support/test-database";

const SHARED_SETTERS = [
  "setDate",
  "setTime",
  "clearTime",
  "setMyTeamAs",
  "setHomeName",
  "setAwayName",
  "setHomeScore",
  "setAwayScore",
  "setNotes",
] as const;

function stores(): readonly MatchFieldsStore[] {
  const db = createTestDatabase();
  const teamId = addTeam(db, { name: "Alevín A" });
  const matchId = addMatch(db, teamId, { homeName: "Local" });
  const newMatch: MatchFieldsStore = createNewMatchDraft(db, () => new Date());
  const details: MatchFieldsStore = createMatchDetailsDraft(db, matchId);
  return [newMatch, details];
}

describe("match fields, the read-only store type", () => {
  it("RF-025 RF-028: the new-match draft and the details draft are assignable to MatchFieldsStore, and both hold the shared fields and setters", () => {
    for (const store of stores()) {
      const state: MatchFieldsState = store.getState();
      expect(state).toMatchObject({
        date: expect.any(String),
        homeName: expect.any(String),
        awayName: expect.any(String),
        homeScore: expect.any(String),
        awayScore: expect.any(String),
        notes: expect.any(String),
      });
      expect(state.time === null || typeof state.time === "string").toBe(true);
      for (const setter of SHARED_SETTERS) {
        expect(state[setter]).toEqual(expect.any(Function));
      }
    }
  });

  it("RF-025 RF-028: the read-only part of each store works as the form needs it: getInitialState, and subscribe with an unsubscribe", () => {
    for (const store of stores()) {
      expect(store.getInitialState()).toBeDefined();
      const heard: string[] = [];
      const stop = store.subscribe((state) => heard.push(state.homeName));
      store.getState().setHomeName("Escrito");
      stop();
      store.getState().setHomeName("Después");
      expect(heard).toEqual(["Escrito"]);
    }
  });
});
