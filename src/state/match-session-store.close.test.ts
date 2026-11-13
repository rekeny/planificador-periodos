// T041: closing, replacing and reopening the match session, and a read that fails (RF-042, RF-019).
// The failure is a real SQLite table renamed away, so the store meets a genuine "no such table".
import { createMatch } from "@/data/match-repository";
import type { UndoEntry } from "@/domain/undo";
import { createMatchSessionStore } from "@/state/match-session-store";
import { entryOf, matchValues } from "../../tests/data/match-fixtures";
import {
  breakReads,
  rowLabels,
  sessionWith,
  squadSpecs,
  writeMark,
} from "../../tests/support/match-session-fixtures";

const CLOSED = {
  status: "closed",
  grid: null,
  warnings: null,
  view: null,
  history: [],
  saveFailed: false,
};

describe("match session, close", () => {
  it("RF-042: closeMatch empties the grid, the warnings, the view and the history and sets closed", () => {
    const { store, matchId } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    store.getState().closeMatch();
    expect(store.getState()).toMatchObject(CLOSED);
  });

  it("RF-042: closeMatch twice leaves the same state as closing once", () => {
    const { store, matchId } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    store.getState().closeMatch();
    const afterFirst = store.getState();
    store.getState().closeMatch();
    expect(store.getState()).toEqual(afterFirst);
  });

  it("RF-042: closeMatch with no match ever open changes nothing", () => {
    const { store } = sessionWith(squadSpecs(9));
    const before = store.getState();
    store.getState().closeMatch();
    expect(store.getState()).toEqual(before);
    expect(store.getState()).toMatchObject(CLOSED);
  });

  it("RF-042: closeMatch after a match that was not found sets closed with nothing published", () => {
    const { store } = sessionWith(squadSpecs(9));
    store.getState().openMatch(9999);
    store.getState().closeMatch();
    expect(store.getState()).toMatchObject(CLOSED);
  });
});

describe("match session, replace and reopen", () => {
  it("RF-042: opening match A and then match B shows only B's rows, grid and format", () => {
    const { store, db, teamId, matchId, players } = sessionWith(squadSpecs(12));
    const other = createMatch(
      db,
      matchValues(teamId, { format: 8 }),
      players.slice(0, 3).map(entryOf),
    );
    store.getState().openMatch(matchId);
    store.getState().openMatch(other.id);
    expect(rowLabels(store)).toEqual([
      "1 Jugador 1",
      "2 Jugador 2",
      "3 Jugador 3",
    ]);
    expect(store.getState().view).toMatchObject({
      matchId: other.id,
      format: 8,
    });
    expect(store.getState().grid?.callUp).toHaveLength(3);
    expect(store.getState().grid?.format).toBe(8);
  });

  it("RF-042: opening match B does not keep the marks of match A", () => {
    const { store, db, teamId, matchId, players, entryIds } = sessionWith(
      squadSpecs(9),
    );
    writeMark(db, entryIds[0] ?? 0, "P", 1, "starter");
    const other = createMatch(db, matchValues(teamId), players.map(entryOf));
    store.getState().openMatch(matchId);
    store.getState().openMatch(other.id);
    expect(store.getState().grid?.marks).toEqual({});
    expect(store.getState().view?.rows.some((row) => row.hasMarks)).toBe(false);
  });

  it("RF-042: openMatch for the same match twice gives the same grid, warnings and view", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(9));
    writeMark(db, entryIds[2] ?? 0, "P", 4, "starter");
    store.getState().openMatch(matchId);
    const first = store.getState();
    store.getState().openMatch(matchId);
    const second = store.getState();
    expect(second.view).toEqual(first.view);
    expect(second.grid).toEqual(first.grid);
    expect(second.warnings).toEqual(first.warnings);
    expect(second.status).toBe("open");
  });

  it("RF-042: a second openMatch empties the history and clears saveFailed", () => {
    const { store, matchId, entryIds } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    const cell = {
      entryId: entryIds[0] ?? 0,
      column: { kind: "period", number: 1 },
    } as const;
    const entry: UndoEntry = [{ cell, state: "empty" }];
    store.setState({ history: [entry], saveFailed: true });
    store.getState().openMatch(matchId);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-042: a match opened, closed and opened again shows the same view", () => {
    const { store, matchId } = sessionWith(squadSpecs(10));
    store.getState().openMatch(matchId);
    const first = store.getState().view;
    store.getState().closeMatch();
    store.getState().openMatch(matchId);
    expect(store.getState().view).toEqual(first);
  });
});

describe("match session, a new store on the same database", () => {
  it("RF-042 RF-019: shows the same call-up, marks (overtime included) and overtime count", () => {
    const { store, db, matchId, entryIds } = sessionWith(squadSpecs(9), {
      overtimeCount: 1,
    });
    writeMark(db, entryIds[0] ?? 0, "P", 2, "starter");
    writeMark(db, entryIds[1] ?? 0, "OT", 1, "sub");
    store.getState().openMatch(matchId);
    const reopened = createMatchSessionStore(db);
    reopened.getState().openMatch(matchId);
    expect(reopened.getState().grid).toEqual(store.getState().grid);
    expect(reopened.getState().grid?.overtimeCount).toBe(1);
    expect(reopened.getState().grid?.marks).toEqual({
      [`${entryIds[0]}:P2`]: "starter",
      [`${entryIds[1]}:OT1`]: "sub",
    });
    expect(reopened.getState().view).toEqual(store.getState().view);
    expect(reopened.getState().history).toEqual([]);
  });
});

describe("match session, not found and failed reads", () => {
  it("RF-042: an unknown id gives notFound with no grid, warnings, view or history", () => {
    const { store } = sessionWith(squadSpecs(9));
    store.getState().openMatch(9999);
    expect(store.getState()).toMatchObject({ ...CLOSED, status: "notFound" });
  });

  it("RF-042: an unknown id after a match was open replaces the whole session with notFound", () => {
    const { store, matchId } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    store.getState().openMatch(9999);
    expect(store.getState()).toMatchObject({ ...CLOSED, status: "notFound" });
  });

  it.each(["matches", "call_up_entries", "marks", "players"] as const)(
    "RF-042: a failed read with the %s table gone gives notFound, never throws and leaves no half-filled view",
    (table) => {
      const { store, db, matchId } = sessionWith(squadSpecs(9));
      breakReads(db, table);
      expect(() => store.getState().openMatch(matchId)).not.toThrow();
      expect(store.getState()).toMatchObject({ ...CLOSED, status: "notFound" });
    },
  );

  it("RF-042: a failed read after a match was open leaves notFound, not the old view", () => {
    const { store, db, matchId } = sessionWith(squadSpecs(9));
    store.getState().openMatch(matchId);
    breakReads(db, "call_up_entries");
    store.getState().openMatch(matchId);
    expect(store.getState()).toMatchObject({ ...CLOSED, status: "notFound" });
  });
});
