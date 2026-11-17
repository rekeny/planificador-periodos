// T042: call-up actions of the open match, addToCallUp and removeFromCallUp (RF-032, RF-033, RF-034,
// RF-060, RF-068, RF-085, RF-086, E-017). Every change is saved, then the warnings and the view are
// recomputed; none of them touches the undo history. The database is the real in-memory one.
import { sql } from "drizzle-orm";
import { evaluateWarnings } from "@/domain/warnings";
import { createMatchSessionStore } from "@/state/match-session-store";
import {
  savedCallUp,
  savedEntryIds,
  savedMarkKeys,
  sessionWithBench,
  undoEntryOf,
} from "../../tests/support/match-session-call-up";
import {
  rowLabels,
  squadSpecs,
  writeMark,
} from "../../tests/support/match-session-fixtures";

const CALLED_UP = [
  ["Eva", "10"],
  ["Ana", "3"],
  ["Bea", "7"],
] as const;
const BENCH = [
  ["Carla", "5"],
  ["Dani", "1"],
] as const;

function opened() {
  const session = sessionWithBench(CALLED_UP, BENCH);
  session.store.getState().openMatch(session.matchId);
  return session;
}

describe("match session, add to the call-up", () => {
  it("RF-032 RF-042: adding two players gives two new empty rows in call-up order and saves both", () => {
    const { store, db, matchId, benched } = opened();
    const [carla, dani] = benched;
    expect(store.getState().addToCallUp(carla?.id ?? 0)).toEqual({
      kind: "saved",
    });
    expect(store.getState().addToCallUp(dani?.id ?? 0)).toEqual({
      kind: "saved",
    });
    expect(rowLabels(store)).toEqual([
      "1 Dani",
      "3 Ana",
      "5 Carla",
      "7 Bea",
      "10 Eva",
    ]);
    const rows = store.getState().view?.rows ?? [];
    expect(rows.map((r) => r.hasMarks)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(store.getState().grid?.marks).toEqual({});
    expect(new Set(rows.map((r) => r.entryId))).toEqual(
      new Set(savedEntryIds(db, matchId)),
    );
    expect(savedCallUp(db, matchId)).toHaveLength(5);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-032 RF-019: the new row has the name and number the player has now, saved in the call-up", () => {
    const { store, db, matchId, benched } = sessionWithBench(CALLED_UP, BENCH);
    const carla = benched[0];
    db.run(
      sql`UPDATE players SET name = 'Carlota', number = '11' WHERE id = ${carla?.id}`,
    );
    store.getState().openMatch(matchId);
    store.getState().addToCallUp(carla?.id ?? 0);
    expect(rowLabels(store)).toContain("11 Carlota");
    expect(savedCallUp(db, matchId)).toContain("11 Carlota");
  });

  it("RF-032 RF-060 RF-068: the warnings and the view are recomputed from the new grid after an add", () => {
    const { store, benched } = opened();
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    const { grid, warnings, view } = store.getState();
    expect(warnings).toEqual(grid && evaluateWarnings(grid));
    expect(view?.rows).toHaveLength(4);
    expect(view?.callUpRange).toEqual({ format: 6, min: 9, max: 12, count: 4 });
  });

  it("RF-010 RF-068: adding the 13th player is saved and warned, never blocked", () => {
    const { store, db, matchId, benched } = sessionWithBench(squadSpecs(12), [
      ["Extra", "50"],
    ]);
    store.getState().openMatch(matchId);
    expect(store.getState().view?.callUpRange).toBeNull();
    expect(store.getState().addToCallUp(benched[0]?.id ?? 0)).toEqual({
      kind: "saved",
    });
    const expected = { format: 6, min: 9, max: 12, count: 13 };
    expect(store.getState().view?.rows).toHaveLength(13);
    expect(store.getState().view?.callUpRange).toEqual(expected);
    expect(store.getState().warnings?.callUpRange).toEqual(expected);
    expect(savedCallUp(db, matchId)).toHaveLength(13);
  });

  it("RF-068 RF-060: adding the 9th player to a call-up of 8 in a 6-period match removes the range warning", () => {
    const { store, matchId, benched } = sessionWithBench(squadSpecs(8), [
      ["Novena", "40"],
    ]);
    store.getState().openMatch(matchId);
    expect(store.getState().view?.callUpRange?.count).toBe(8);
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    expect(store.getState().view?.callUpRange).toBeNull();
    expect(store.getState().warnings?.callUpRange).toBeNull();
  });
});

describe("match session, remove from the call-up", () => {
  it("RF-033 RF-068: removing the only player leaves no rows, saves it and shows the range warning", () => {
    const { store, db, matchId, entryIds } = sessionWithBench(
      [["Ana", "3"]],
      [],
    );
    store.getState().openMatch(matchId);
    expect(store.getState().removeFromCallUp(entryIds[0] ?? 0)).toEqual({
      kind: "saved",
    });
    expect(store.getState().view?.rows).toEqual([]);
    expect(store.getState().grid?.callUp).toEqual([]);
    expect(store.getState().view?.callUpRange).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 0,
    });
    expect(savedCallUp(db, matchId)).toEqual([]);
  });

  it("RF-034 RF-060 E-017: removing a player with marks recomputes the warnings, so his light red cells are gone", () => {
    const { store, db, matchId, entryIds } = sessionWithBench(
      [["Juan", "1"], ...squadSpecs(10).slice(1)],
      [],
    );
    const juan = entryIds[0] ?? 0;
    [1, 2, 3].forEach((n) => writeMark(db, juan, "P", n, "starter"));
    store.getState().openMatch(matchId);
    expect(store.getState().warnings?.lightRedCells).toEqual(
      new Set([`${juan}:P4`, `${juan}:P5`]),
    );
    store.getState().removeFromCallUp(juan);
    const { grid, warnings } = store.getState();
    expect(warnings?.lightRedCells.size).toBe(0);
    expect(warnings?.playersInRed.has(juan)).toBe(false);
    expect(warnings).toEqual(grid && evaluateWarnings(grid));
    expect(rowLabels(store)).not.toContain("1 Juan");
  });

  it("RF-034 E-017: removing Ana, who has marks, deletes only her entry and her marks, in the grid and in the database", () => {
    const { store, db, matchId, entryIds } = sessionWithBench(CALLED_UP, []);
    const bea = entryIds[2] ?? 0;
    const ana = entryIds[1] ?? 0;
    writeMark(db, ana, "P", 1, "starter");
    writeMark(db, ana, "OT", 1, "sub");
    writeMark(db, bea, "P", 1, "starter");
    store.getState().openMatch(matchId);
    expect(store.getState().removeFromCallUp(ana)).toEqual({ kind: "saved" });
    expect(rowLabels(store)).toEqual(["7 Bea", "10 Eva"]);
    expect(store.getState().grid?.marks).toEqual({ [`${bea}:P1`]: "starter" });
    expect(savedMarkKeys(db, matchId)).toEqual([`${bea}:P1`]);
    expect(savedCallUp(db, matchId)).toEqual(["10 Eva", "7 Bea"]);
  });

  it("RF-032 RF-034 E-017: Ana removed with marks and added again is a new empty row with no old marks", () => {
    const { store, db, matchId, entryIds, players } = sessionWithBench(
      CALLED_UP,
      [],
    );
    const ana = entryIds[1] ?? 0;
    writeMark(db, ana, "P", 2, "starter");
    store.getState().openMatch(matchId);
    store.getState().removeFromCallUp(ana);
    expect(store.getState().view?.playersToAdd.map((p) => p.name)).toEqual([
      "Ana",
    ]);
    expect(store.getState().addToCallUp(players[1]?.id ?? 0)).toEqual({
      kind: "saved",
    });
    expect(rowLabels(store)).toEqual(["3 Ana", "7 Bea", "10 Eva"]);
    const row = store.getState().view?.rows[0];
    expect(row?.hasMarks).toBe(false);
    expect(row?.entryId).not.toBe(ana);
    expect(store.getState().grid?.marks).toEqual({});
    expect(savedMarkKeys(db, matchId)).toEqual([]);
  });

  it("RF-033 RF-085: a new store on the same database shows the changed call-up", () => {
    const { store, db, matchId, entryIds, benched } = opened();
    store.getState().removeFromCallUp(entryIds[0] ?? 0);
    store.getState().addToCallUp(benched[1]?.id ?? 0);
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(rowLabels(reopened)).toEqual(["1 Dani", "3 Ana", "7 Bea"]);
  });
});

describe("match session, undo history and the call-up", () => {
  it("RF-086: removing Ana drops the undo changes of her cells, keeps the others and drops an entry left empty", () => {
    const { store, matchId, entryIds } = sessionWithBench(CALLED_UP, []);
    const [eva = 0, ana = 0, bea = 0] = entryIds;
    store.getState().openMatch(matchId);
    const history = [
      undoEntryOf(ana, 1),
      undoEntryOf(bea, 2),
      [...undoEntryOf(ana, 3), ...undoEntryOf(eva, 3)],
    ];
    store.setState({ history });
    store.getState().removeFromCallUp(ana);
    expect(store.getState().history).toEqual([
      undoEntryOf(bea, 2),
      undoEntryOf(eva, 3),
    ]);
  });

  it("RF-086 RF-057: adding, creating and removing a player with no marks pushes nothing and keeps the history as it was", () => {
    const { store, matchId, entryIds, benched } = sessionWithBench(
      CALLED_UP,
      BENCH,
    );
    store.getState().openMatch(matchId);
    const history = [undoEntryOf(entryIds[2] ?? 0, 1)];
    store.setState({ history });
    store.getState().addToCallUp(benched[0]?.id ?? 0);
    store.getState().createPlayerInMatch({ name: "Nuria", number: "20" });
    store.getState().removeFromCallUp(entryIds[0] ?? 0);
    expect(store.getState().history).toEqual(history);
  });
});
