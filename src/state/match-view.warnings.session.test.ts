// T058: the warnings of the match view as the real session store publishes them after each tap, undo
// and reopening (RF-060, RF-062, RF-063, RF-067, RF-087, E-001, E-003). Real in-memory SQLite and
// real domain. Juan is the first entry of the call-up: row 0, "Jugador 1".
import { createMatchSessionStore } from "@/state/match-session-store";
import type { MatchSessionStore } from "../../tests/support/match-session-fixtures";
import { openedSession } from "../../tests/support/match-session-marks";
import { tapAt } from "../../tests/support/match-session-undo";
import {
  incompleteUpTo,
  readWarnings,
} from "../../tests/support/match-view-warnings";

function reading(store: MatchSessionStore) {
  const view = store.getState().view;
  if (view === null) throw new Error("The match is not open");
  return readWarnings(view);
}

describe("match session, warnings after each tap", () => {
  it("RF-060 RF-062 E-001: Juan's third X in P1-P3 turns P4 and P5 light red and shows «!» on P1-P5, and his second X does not", () => {
    const session = openedSession(10);
    const juan = session.entryIds[0] ?? 0;
    expect(reading(session.store).lightRed).toEqual([]);
    for (const period of ["P1", "P2"] as const) {
      expect(tapAt(session, 0, period)).toEqual({ kind: "saved" });
    }
    expect(reading(session.store).lightRed).toEqual([]);
    tapAt(session, 0, "P3");
    expect(reading(session.store)).toEqual({
      lightRed: [`${juan}:P4`, `${juan}:P5`],
      inRed: [],
      headerMarks: incompleteUpTo(5),
      ruleImpossible: false,
      legend: ["lightRedCell", "incompletePeriod"],
    });
  });

  it("RF-060 RF-063 RF-067 E-003: the fourth X is not blocked and puts Juan in red, P5 light red and the general warning on at once", () => {
    const session = openedSession(10);
    const juan = session.entryIds[0] ?? 0;
    for (const period of ["P1", "P2", "P3", "P4"] as const) {
      expect(tapAt(session, 0, period)).toEqual({ kind: "saved" });
    }
    const now = reading(session.store);
    expect(now.inRed).toEqual([juan]);
    expect(now.lightRed).toEqual([`${juan}:P5`]);
    expect(now.ruleImpossible).toBe(true);
    expect(now.legend).toEqual([
      "lightRedCell",
      "playerInRed",
      "incompletePeriod",
    ]);
  });

  it("RF-060 RF-087 E-001: tapping Juan's X in P3 again removes the colour and the legend line of the light red cell", () => {
    const session = openedSession(10);
    for (const period of ["P1", "P2", "P3"] as const) {
      tapAt(session, 0, period);
    }
    expect(reading(session.store).legend).toContain("lightRedCell");
    tapAt(session, 0, "P3");
    const now = reading(session.store);
    expect(now.lightRed).toEqual([]);
    expect(now.legend).toEqual(["incompletePeriod"]);
  });

  it("RF-062 RF-087 E-001: filling Juan's P4 and P5 makes the last light red cell go, and the legend swaps its line for the player in red", () => {
    const session = openedSession(10);
    const juan = session.entryIds[0] ?? 0;
    for (const period of ["P1", "P2", "P3", "P4"] as const) {
      tapAt(session, 0, period);
    }
    expect(reading(session.store).lightRed).toEqual([`${juan}:P5`]);
    tapAt(session, 0, "P5");
    const now = reading(session.store);
    expect(now.lightRed).toEqual([]);
    expect(now.legend).toEqual(["playerInRed", "incompletePeriod"]);
  });

  it("RF-060 RF-087 E-001: undoing the third X takes the colour and the legend line away again", () => {
    const session = openedSession(10);
    for (const period of ["P1", "P2", "P3"] as const) {
      tapAt(session, 0, period);
    }
    expect(session.store.getState().undo()).toEqual({ kind: "saved" });
    const now = reading(session.store);
    expect(now.lightRed).toEqual([]);
    expect(now.legend).toEqual(["incompletePeriod"]);
  });
});

describe("match session, warnings after reopening", () => {
  it("RF-060 RF-087 E-001 E-003: a new store that opens the saved match publishes the same colours, marks, general warning and legend", () => {
    const session = openedSession(10);
    for (const period of ["P1", "P2", "P3", "P4"] as const) {
      tapAt(session, 0, period);
    }
    const reopened = createMatchSessionStore(session.db);
    reopened.getState().openMatch(session.matchId);
    expect(reading(reopened)).toEqual(reading(session.store));
    expect(reading(reopened).inRed).toHaveLength(1);
    expect(reopened.getState().view?.columns).toEqual(
      session.store.getState().view?.columns,
    );
  });
});
