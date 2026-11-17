// Codex F3 (BLOCKING), call-up side: a call-up action must not leave a committed write behind when
// the read that follows it fails (the team's players are read again to publish the view). RF-085:
// the change either fully succeeds and is published, or it fails and nothing changed (database,
// grid, view, history), with saveFailed set; one retry then saves exactly one record. The reads fail
// through a real SQLite trigger plus a guard on `select` (tests/support/read-after-write.ts).
import { listPlayers } from "@/data/player-repository";
import {
  savedCallUp,
  savedTeam,
  sessionWithBench,
} from "../../tests/support/match-session-call-up";
import { CONSISTENT } from "../../tests/support/read-after-write";
import {
  judgedSession,
  type Session,
} from "../../tests/support/read-after-write-session";

const make = () =>
  sessionWithBench(
    [
      ["Eva", "10"],
      ["Ana", "3"],
    ],
    [["Carla", "5"]],
  );
const INSERT_ENTRY: ["call_up_entries", "INSERT"][] = [
  ["call_up_entries", "INSERT"],
];
const DELETE_ENTRY: ["call_up_entries", "DELETE"][] = [
  ["call_up_entries", "DELETE"],
];
const addCarla = ({ store, db, teamId }: Session) => {
  const carla = listPlayers(db, teamId).find((p) => p.name === "Carla");
  return store.getState().addToCallUp(carla?.id ?? 0);
};
const removeAna = ({ store, entryIds }: Session) =>
  store.getState().removeFromCallUp(entryIds[1] ?? 0);
const createDani = ({ store }: Session) =>
  store.getState().createPlayerInMatch({ name: "Dani", number: "9" });
const countOf = (rows: string[], text: string) =>
  rows.filter((row) => row === text).length;

describe("match session call-up, a read that fails after the write", () => {
  it("RF-032 RF-085: addToCallUp is either saved and published or saveFailed with Carla not in the call-up", () => {
    const { outcome } = judgedSession(make, INSERT_ENTRY, { act: addCarla });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-032 RF-085: after a saveFailed addToCallUp the retry leaves Carla once in the call-up", () => {
    const { session, retry } = judgedSession(make, INSERT_ENTRY, {
      act: addCarla,
    });
    expect(retry()).toEqual({ kind: "saved" });
    expect(countOf(savedCallUp(session.db, session.matchId), "5 Carla")).toBe(
      1,
    );
    expect(session.store.getState().view?.rows.map((r) => r.name)).toContain(
      "Carla",
    );
    expect(session.store.getState().saveFailed).toBe(false);
  });

  it("RF-033 RF-085: removeFromCallUp is either saved and published or saveFailed with Ana still called up", () => {
    const { outcome } = judgedSession(make, DELETE_ENTRY, { act: removeAna });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-033 RF-085: after a saveFailed removeFromCallUp the retry leaves Ana out of the call-up and the grid", () => {
    const { session, retry } = judgedSession(make, DELETE_ENTRY, {
      act: removeAna,
    });
    expect(retry()).toEqual({ kind: "saved" });
    expect(savedCallUp(session.db, session.matchId)).toEqual(["10 Eva"]);
    expect(session.store.getState().view?.rows.map((r) => r.name)).toEqual([
      "Eva",
    ]);
  });

  it("RF-035 RF-085: createPlayerInMatch is either saved and published or saveFailed with Dani in neither the team nor the call-up", () => {
    const { outcome } = judgedSession(make, INSERT_ENTRY, { act: createDani });
    expect(CONSISTENT).toContain(outcome);
  });

  it("RF-035 RF-085: after a saveFailed createPlayerInMatch the retry leaves exactly one Dani in the team and in the call-up", () => {
    const { session, retry } = judgedSession(make, INSERT_ENTRY, {
      act: createDani,
    });
    expect(retry()).toEqual({ kind: "saved" });
    const team = savedTeam(session.db, session.teamId);
    expect(countOf(team, "9 Dani")).toBe(1);
    expect(countOf(savedCallUp(session.db, session.matchId), "9 Dani")).toBe(1);
  });
});
