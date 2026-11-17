// T042: createPlayerInMatch, a new player created from the open match (RF-016, RF-035, RF-060, RF-068,
// RF-085, E-021). The input is validated first; the valid value is saved to the team and to the
// call-up in one step, and the entry joins the grid like addToCallUp does.
import { listPlayers } from "@/data/player-repository";
import { createMatchSessionStore } from "@/state/match-session-store";
import {
  savedCallUp,
  savedTeam,
  sessionWithBench,
  undoEntryOf,
} from "../../tests/support/match-session-call-up";
import {
  rowLabels,
  squadSpecs,
} from "../../tests/support/match-session-fixtures";

const CALLED_UP = [
  ["Eva", "10"],
  ["Ana", "3"],
  ["Bea", "7"],
] as const;

function opened() {
  const session = sessionWithBench(CALLED_UP, []);
  session.store.getState().openMatch(session.matchId);
  return session;
}

describe("match session, create a player from the match", () => {
  it("RF-035: a valid name and number create the player in the team and in the call-up, in order", () => {
    const { store, db, matchId, teamId } = opened();
    expect(
      store.getState().createPlayerInMatch({ name: "Marta", number: "5" }),
    ).toEqual({ kind: "saved" });
    expect(rowLabels(store)).toEqual(["3 Ana", "5 Marta", "7 Bea", "10 Eva"]);
    expect(savedTeam(db, teamId)).toEqual([
      "10 Eva",
      "3 Ana",
      "5 Marta",
      "7 Bea",
    ]);
    expect(savedCallUp(db, matchId)).toContain("5 Marta");
    expect(store.getState().grid?.marks).toEqual({});
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-035 RF-016: the name is saved trimmed, in the team and in the call-up snapshot", () => {
    const { store, db, matchId, teamId } = opened();
    store.getState().createPlayerInMatch({ name: "  Marta  ", number: "5" });
    expect(rowLabels(store)).toContain("5 Marta");
    expect(savedTeam(db, teamId)).toContain("5 Marta");
    expect(savedCallUp(db, matchId)).toContain("5 Marta");
  });

  it("RF-035 RF-032: the new player is active, belongs to the match's team, is the one the entry points to and is not offered to add again", () => {
    const { store, db, teamId } = opened();
    store.getState().createPlayerInMatch({ name: "Marta", number: "5" });
    const entry = store.getState().grid?.callUp.find((e) => e.name === "Marta");
    const created = listPlayers(db, teamId).find((p) => p.name === "Marta");
    expect(created).toMatchObject({ teamId, number: "5", isActive: true });
    expect(entry?.playerId).toBe(created?.id);
    expect(store.getState().view?.playersToAdd).toEqual([]);
  });

  it.each([
    ["0", "Cero"],
    ["00", "Doble cero"],
    ["7", "Otra siete"],
  ] as const)(
    "RF-016 E-021: the number «%s» is accepted, also when another player has it, and the row appears",
    (number, name) => {
      const { store, db, matchId } = opened();
      expect(store.getState().createPlayerInMatch({ name, number })).toEqual({
        kind: "saved",
      });
      expect(rowLabels(store)).toContain(`${number} ${name}`);
      expect(savedCallUp(db, matchId)).toContain(`${number} ${name}`);
    },
  );

  it("RF-035 RF-068: creating the 13th player of the call-up is saved and warned, never blocked", () => {
    const { store, matchId } = sessionWithBench(squadSpecs(12), []);
    store.getState().openMatch(matchId);
    expect(
      store.getState().createPlayerInMatch({ name: "Extra", number: "50" }),
    ).toEqual({ kind: "saved" });
    const expected = { format: 6, min: 9, max: 12, count: 13 };
    expect(store.getState().view?.callUpRange).toEqual(expected);
    expect(store.getState().warnings?.callUpRange).toEqual(expected);
  });

  it("RF-035 RF-085 RF-086: it pushes nothing to the history and clears an earlier saveFailed", () => {
    const { store, entryIds } = opened();
    const history = [undoEntryOf(entryIds[0] ?? 0, 1)];
    store.setState({ history, saveFailed: true });
    store.getState().createPlayerInMatch({ name: "Marta", number: "5" });
    expect(store.getState().history).toEqual(history);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-035 RF-085: a new store on the same database shows the player in the team and the call-up", () => {
    const { store, db, matchId } = opened();
    store.getState().createPlayerInMatch({ name: "Marta", number: "5" });
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(rowLabels(reopened)).toEqual([
      "3 Ana",
      "5 Marta",
      "7 Bea",
      "10 Eva",
    ]);
  });
});

describe("match session, create a player with invalid input", () => {
  it.each([
    ["   ", "5", ["nameRequired"]],
    ["", "5", ["nameRequired"]],
    ["Marta", "07", ["numberInvalid"]],
    ["Marta", "", ["numberInvalid"]],
    ["Marta", "100", ["numberInvalid"]],
    ["  ", "07", ["nameRequired", "numberInvalid"]],
  ] as const)(
    "RF-016 RF-035 E-021: name «%s» with number «%s» is invalid, nothing is created and the view stays",
    (name, number, errors) => {
      const { store, db, matchId, teamId } = opened();
      store.setState({ saveFailed: true });
      const before = store.getState();
      const result = store.getState().createPlayerInMatch({ name, number });
      expect(result).toEqual({ kind: "invalid", errors });
      expect(store.getState().grid).toEqual(before.grid);
      expect(store.getState().view).toEqual(before.view);
      expect(store.getState().saveFailed).toBe(true);
      expect(savedTeam(db, teamId)).toHaveLength(3);
      expect(savedCallUp(db, matchId)).toHaveLength(3);
    },
  );
});
