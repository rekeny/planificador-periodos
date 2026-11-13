// T050: canUndo, canRemoveOvertime and lastOvertimeHasMarks of the view (RF-055, RF-059), and the
// grid part of the view as the real session store publishes it, from the database (RF-042, E-020).
import type { UndoEntry } from "@/domain/undo";
import { loadGridRecords } from "@/data/grid-repository";
import {
  sessionWith,
  writeMark,
} from "../../tests/support/match-session-fixtures";
import { gridWith, viewOf } from "../../tests/support/match-view-grid";

const ONE_ENTRY: UndoEntry = [
  {
    cell: { entryId: 100, column: { kind: "period", number: 1 } },
    state: "empty",
  },
];

describe("match view, canUndo", () => {
  it("RF-055: canUndo is false with an empty history and true with one entry or more", () => {
    const grid = gridWith({ players: 2 });
    expect(viewOf(grid, []).canUndo).toBe(false);
    expect(viewOf(grid, [ONE_ENTRY]).canUndo).toBe(true);
    expect(viewOf(grid, [ONE_ENTRY, ONE_ENTRY, ONE_ENTRY]).canUndo).toBe(true);
  });
});

describe("match view, overtime flags", () => {
  it("RF-059: with no overtime canRemoveOvertime and lastOvertimeHasMarks are false, whatever the periods hold", () => {
    const view = viewOf(
      gridWith({ players: 2, marks: { "100:P6": "starter" } }),
    );
    expect(view.canRemoveOvertime).toBe(false);
    expect(view.lastOvertimeHasMarks).toBe(false);
  });

  it("RF-059: one empty overtime can be removed and has no marks", () => {
    const view = viewOf(gridWith({ players: 2, overtimeCount: 1 }));
    expect(view.canRemoveOvertime).toBe(true);
    expect(view.lastOvertimeHasMarks).toBe(false);
  });

  it("RF-059: an overtime with an X or a circled X has marks, and each kind of mark counts", () => {
    for (const mark of ["starter", "sub"] as const) {
      const view = viewOf(
        gridWith({ players: 2, overtimeCount: 1, marks: { "101:OT1": mark } }),
      );
      expect(view.canRemoveOvertime).toBe(true);
      expect(view.lastOvertimeHasMarks).toBe(true);
    }
  });

  it("RF-059: with two overtimes only the last counts, so marks in the first one do not make the last one marked", () => {
    const first = viewOf(
      gridWith({
        players: 2,
        overtimeCount: 2,
        marks: { "100:OT1": "starter" },
      }),
    );
    expect(first.canRemoveOvertime).toBe(true);
    expect(first.lastOvertimeHasMarks).toBe(false);
    const last = viewOf(
      gridWith({ players: 2, overtimeCount: 2, marks: { "100:OT2": "sub" } }),
    );
    expect(last.lastOvertimeHasMarks).toBe(true);
  });

  it("RF-059: marks in the periods never make the overtime marked", () => {
    const view = viewOf(
      gridWith({
        players: 2,
        overtimeCount: 1,
        marks: { "100:P1": "starter", "101:P6": "sub" },
      }),
    );
    expect(view.lastOvertimeHasMarks).toBe(false);
  });
});

describe("match view, published by the session", () => {
  it("RF-042 RF-043 RF-070 RF-071 E-014 E-020: openMatch publishes the columns, rows, cells and counters read from the database", () => {
    const { db, store, matchId } = sessionWith(
      [
        ["Luis", "00"],
        ["Ana", "0"],
        ["Eva", "10"],
        ["Bea", "7"],
        ["Carla", "0"],
      ],
      { overtimeCount: 1 },
    );
    const idOf = (name: string) =>
      loadGridRecords(db, matchId)?.entries.find((e) => e.playerName === name)
        ?.id ?? -1;
    for (const [column, n, mark] of [
      ["P", 1, "starter"],
      ["P", 3, "starter"],
      ["P", 6, "starter"],
      ["P", 5, "sub"],
    ] as const) {
      writeMark(db, idOf("Luis"), column, n, mark);
    }
    store.getState().openMatch(matchId);
    const view = store.getState().view;
    expect(view?.columns.map((c) => c.key)).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "OT1",
    ]);
    expect(view?.rows.map((r) => r.name)).toEqual([
      "Ana",
      "Carla",
      "Luis",
      "Bea",
      "Eva",
    ]);
    expect(view?.rows.map((r) => r.counter)).toEqual([
      { played: 0, rested: 7 },
      { played: 0, rested: 7 },
      { played: 3, rested: 3 },
      { played: 0, rested: 7 },
      { played: 0, rested: 7 },
    ]);
    const luis = view?.rows[2];
    expect(luis?.cells.map((c) => c.state)).toEqual([
      "starter",
      "empty",
      "starter",
      "empty",
      "sub",
      "starter",
      "empty",
    ]);
    expect(view?.canUndo).toBe(false);
    expect(view?.canRemoveOvertime).toBe(true);
    expect(view?.lastOvertimeHasMarks).toBe(false);
  });

  it("RF-042: a match with no marks and no overtimes opens with its columns and empty cells, and a closed store has no view", () => {
    const { store, matchId } = sessionWith([["Ana", "1"]], { format: 4 });
    expect(store.getState().view).toBeNull();
    store.getState().openMatch(matchId);
    const view = store.getState().view;
    expect(view?.columns.map((c) => c.key)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(view?.rows[0]?.cells.map((c) => c.state)).toEqual(
      Array(4).fill("empty"),
    );
    expect(view?.canRemoveOvertime).toBe(false);
  });
});
