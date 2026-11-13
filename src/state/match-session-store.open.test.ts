// T041: the match session, opening and closing (RF-042, RF-068, RF-019, E-020). The grid is built
// from what the database holds: the call-up snapshot, the saved marks and the overtime count.
// Read failures come from a real SQLite table that is renamed away, never from a mocked repository.
import { sql } from "drizzle-orm";
import { evaluateWarnings } from "@/domain/warnings";
import {
  rowLabels,
  sessionWith,
  squadSpecs,
  writeMark,
} from "../../tests/support/match-session-fixtures";

describe("match session, a new store", () => {
  it("RF-042: a store nobody opened is closed, with no grid, no warnings, no view and no history", () => {
    const { store } = sessionWith(squadSpecs(9));
    expect(store.getState()).toMatchObject({
      status: "closed",
      grid: null,
      warnings: null,
      view: null,
      history: [],
      saveFailed: false,
    });
  });
});

describe("match session, open a match", () => {
  it("RF-042 E-020: a match with 12 players opens with 12 rows, sorted by number as a number, and the view has the match id and format", () => {
    const { store, matchId } = sessionWith(squadSpecs(12));
    store.getState().openMatch(matchId);
    const state = store.getState();
    expect(state.status).toBe("open");
    expect(rowLabels(store)).toEqual(
      Array.from({ length: 12 }, (_, i) => `${i + 1} Jugador ${i + 1}`),
    );
    expect(state.view).toMatchObject({ matchId, format: 6, callUpRange: null });
    expect(state.grid?.callUp).toHaveLength(12);
    expect(state.saveFailed).toBe(false);
  });

  it("RF-042 E-020: 10, 9, 4 and 7 open as 4, 7, 9, 10, and 0, 00, 0 sort as 0, 0, 00 by length then name", () => {
    const { store, matchId } = sessionWith([
      ["Eva", "10"],
      ["Iván", "9"],
      ["Dani", "4"],
      ["Sara", "7"],
      ["Luis", "00"],
      ["Carla", "0"],
      ["Ana", "0"],
    ]);
    store.getState().openMatch(matchId);
    expect(rowLabels(store)).toEqual([
      "0 Ana",
      "0 Carla",
      "00 Luis",
      "4 Dani",
      "7 Sara",
      "9 Iván",
      "10 Eva",
    ]);
    expect(store.getState().grid?.callUp.map((e) => e.number)).toEqual([
      "0",
      "0",
      "00",
      "4",
      "7",
      "9",
      "10",
    ]);
  });

  it("RF-042 E-020: players with the same number are sorted by name", () => {
    const { store, matchId } = sessionWith([
      ["Zoe", "5"],
      ["Álvaro", "5"],
      ["Marta", "5"],
    ]);
    store.getState().openMatch(matchId);
    expect(rowLabels(store)).toEqual(["5 Álvaro", "5 Marta", "5 Zoe"]);
  });

  it("RF-042: a player without marks has hasMarks false, and one with a mark has it true", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(9));
    writeMark(db, entryIds[1] ?? 0, "P", 3, "starter");
    store.getState().openMatch(matchId);
    const rows = store.getState().view?.rows ?? [];
    expect(rows.map((r) => r.hasMarks)).toEqual([
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(rows[1]?.entryId).toBe(entryIds[1]);
  });

  it.each([
    [4, 8],
    [6, 9],
    [8, 8],
  ] as const)(
    "RF-042 RF-068: a match of format %i opens with that format and %i players, no range warning",
    (format, count) => {
      const { store, matchId } = sessionWith(squadSpecs(count), { format });
      store.getState().openMatch(matchId);
      expect(store.getState().grid?.format).toBe(format);
      expect(store.getState().view?.format).toBe(format);
      expect(store.getState().view?.callUpRange).toBeNull();
      expect(store.getState().warnings?.callUpRange).toBeNull();
    },
  );

  it("RF-068: a match with 0 players opens with no rows and the range warning", () => {
    const { store, matchId } = sessionWith([]);
    store.getState().openMatch(matchId);
    expect(store.getState().status).toBe("open");
    expect(store.getState().view?.rows).toEqual([]);
    expect(store.getState().view?.callUpRange).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 0,
    });
  });

  it("RF-068: 13 players in the call-up open with the range warning in the view and in the warnings", () => {
    const { store, matchId } = sessionWith(squadSpecs(13));
    store.getState().openMatch(matchId);
    const expected = { format: 6, min: 9, max: 12, count: 13 };
    expect(store.getState().view?.rows).toHaveLength(13);
    expect(store.getState().view?.callUpRange).toEqual(expected);
    expect(store.getState().warnings?.callUpRange).toEqual(expected);
  });

  it("RF-042: the warnings are the domain's evaluation of the grid that was built", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(9));
    entryIds.slice(0, 3).forEach((id) => writeMark(db, id, "P", 1, "starter"));
    writeMark(db, entryIds[3] ?? 0, "P", 1, "sub");
    store.getState().openMatch(matchId);
    const { grid, warnings } = store.getState();
    expect(grid).not.toBeNull();
    expect(warnings).toEqual(grid && evaluateWarnings(grid));
    expect(warnings?.periodWarnings).toMatchObject({ P1: "inconsistent" });
  });
});

describe("match session, what the database holds", () => {
  it("RF-042: a match with 2 overtimes and marks in P2 and OT2 opens with both marks and 2 overtimes", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(9), {
      overtimeCount: 2,
    });
    const [first = 0, second = 0] = entryIds;
    writeMark(db, first, "P", 2, "starter");
    writeMark(db, second, "OT", 2, "sub");
    store.getState().openMatch(matchId);
    const grid = store.getState().grid;
    expect(grid?.overtimeCount).toBe(2);
    expect(grid?.marks).toEqual({
      [`${first}:P2`]: "starter",
      [`${second}:OT2`]: "sub",
    });
  });

  it("RF-042: a match with no overtimes opens with 0 overtimes and no marks", () => {
    const { store, matchId } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    expect(store.getState().grid?.overtimeCount).toBe(0);
    expect(store.getState().grid?.marks).toEqual({});
  });

  it("RF-019 E-020: the rows hold the name and number saved in the call-up, not the player's current ones", () => {
    const { store, db, matchId, players } = sessionWith([
      ["Ana", "7"],
      ["Bea", "3"],
    ]);
    db.run(
      sql`UPDATE players SET name = 'Norma', number = '1' WHERE id = ${players[0]?.id}`,
    );
    store.getState().openMatch(matchId);
    expect(rowLabels(store)).toEqual(["3 Bea", "7 Ana"]);
    expect(store.getState().grid?.callUp.map((e) => e.name)).toEqual([
      "Bea",
      "Ana",
    ]);
  });
});
