// T063: the long-press menu in the session store (RF-052, RF-053, RF-054, RF-057). openCellMenu(cell)
// sets `pending` to { kind: "cellMenu", cell } on a marked cell and returns `unchanged` (a question is
// not a write); chooseCellMenuOption(choice), "starter" | "sub" | "remove", saves a change through the
// domain (`saved`, one undo entry), turns the choice into the choice of the replaced X or the reminder
// (`unchanged`, nothing written) or, when it matches the cell, closes the menu (`unchanged`). Real
// in-memory SQLite and the real domain. «Quitar» and closing the menu are in
// match-session-store.menu.remove.test.ts, odd data in .menu.odd-data.test.ts, sequences and
// interruptions in .menu.sequences.test.ts and failures in .menu.failures.test.ts.
// Rows are positions of the call-up: 0 is Ana, 4 is Eva.
import { starterCount } from "@/domain/grid";
import type { CellMenuChoice } from "@/domain/cell-menu";
import {
  cellAt,
  fillColumn,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import { FULL_P2, reopened } from "../../tests/support/match-session-questions";

const P2 = { kind: "period", number: 2 } as const;
const UNCHANGED = { kind: "unchanged" };
const SAVED = { kind: "saved" };
/** P2 with 4 X (rows 1 to 4) and Ana's circled X. */
const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
/** P2 with 4 X, Ana's among them, and no sub. */
const X_IN_4X: readonly SeedMark[] = fillColumn("P2", [0, 1, 2, 3]);
/** P2 with 5 X (rows 1 to 5) and Ana's circled X. */
const CIRCLED_IN_5X: readonly SeedMark[] = [...FULL_P2, [0, "P2", "sub"]];

/** 8 players, the seeds, and the long-press menu opened on the cell of `row` in `key`. */
function menu(seeds: readonly SeedMark[], row = 0, key: "P2" | "P3" = "P2") {
  const session = openedSession(8, seeds);
  const cell = cellAt(session.entryIds[row] ?? 0, key);
  expect(session.store.getState().openCellMenu(cell)).toEqual(UNCHANGED);
  // The precondition of every test below: the menu is open on that cell and nothing is saved.
  expect(session.store.getState().pending).toEqual({ kind: "cellMenu", cell });
  expect(session.store.getState().history).toEqual([]);
  return { ...session, cell, before: savedMarks(session.db, session.matchId) };
}
const choose = (
  store: ReturnType<typeof menu>["store"],
  choice: CellMenuChoice,
) => store.getState().chooseCellMenuOption(choice);

describe("match session, the long-press menu changes a marked cell", () => {
  it.each<
    [string, readonly SeedMark[], CellMenuChoice, "starter" | "sub" | null]
  >([
    [
      "«Titular» on a circled X in a period with 4 X",
      CIRCLED_IN_4X,
      "starter",
      "starter",
    ],
    ["«Entró de cambio» on an X", X_IN_4X, "sub", "sub"],
    ["«Quitar» on an X in a period with no sub", X_IN_4X, "remove", null],
    ["«Quitar» on a circled X", CIRCLED_IN_4X, "remove", null],
  ])(
    "RF-052 RF-057: %s leaves the new state, saved, with one undo entry, and nothing pending",
    (_label, seeds, choice, expected) => {
      const { store, db, matchId, cell } = menu(seeds);
      expect(choose(store, choice)).toEqual(SAVED);
      const { grid, history, pending, saveFailed, view } = store.getState();
      expect(grid?.marks[`${cell.entryId}:P2`]).toBe(expected ?? undefined);
      const onDisk = savedMarks(db, matchId).filter((m) =>
        m.startsWith(`${cell.entryId}:P2`),
      );
      expect(onDisk).toEqual(
        expected === null ? [] : [`${cell.entryId}:P2=${expected}`],
      );
      expect(reopened(db, matchId).getState().grid).toEqual(grid);
      expect(history).toHaveLength(1);
      expect(history[0]).toHaveLength(1);
      expect(pending).toBeNull();
      expect(saveFailed).toBe(false);
      expect(view?.canUndo).toBe(true);
      expect(view?.replaceableStarters).toEqual([]);
    },
  );

  it("RF-052 RF-055: the choice changes only the long-pressed cell, the rest of the grid stays", () => {
    const { store, cell } = menu(CIRCLED_IN_4X);
    const others = () =>
      Object.entries(store.getState().grid?.marks ?? {}).filter(
        ([key]) => key !== `${cell.entryId}:P2`,
      );
    const before = others();
    choose(store, "starter");
    expect(others()).toEqual(before);
  });

  it("RF-052: opening the menu changes nothing: no cell, no undo entry, nothing written and the rest of the view stays", () => {
    const session = openedSession(8, CIRCLED_IN_4X);
    const { store, db, matchId, entryIds } = session;
    const before = snapshotOf(store, db, matchId);
    expect(
      store.getState().openCellMenu(cellAt(entryIds[0] ?? 0, "P2")),
    ).toEqual(UNCHANGED);
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(false);
  });
});

describe("match session, a menu choice that matches the cell", () => {
  it.each<[string, readonly SeedMark[], number, CellMenuChoice]>([
    ["«Entró de cambio» on a circled X", CIRCLED_IN_4X, 0, "sub"],
    ["«Titular» on an X", X_IN_4X, 0, "starter"],
    ["«Titular» on an X in a period with 5 X", FULL_P2, 1, "starter"],
  ])(
    "RF-052 RF-057: %s changes nothing: no cell, no undo entry, nothing written, and the menu closes",
    (_label, seeds, row, choice) => {
      const { store, db, matchId } = menu(seeds, row);
      const before = snapshotOf(store, db, matchId);
      expect(choose(store, choice)).toEqual(UNCHANGED);
      expect(store.getState().pending).toBeNull();
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().saveFailed).toBe(false);
    },
  );
});

describe("match session, «Titular» in a period that already has 5 X", () => {
  it("RF-053 RF-047: «Titular» on a circled X in a period with 5 X turns the menu into the choice of the replaced X: nothing is saved, and the view lists the five X, not the circled one", () => {
    const { store, db, matchId, cell, entryIds } = menu(CIRCLED_IN_5X);
    const before = snapshotOf(store, db, matchId);
    expect(choose(store, "starter")).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({ kind: "chooseReplaced", cell });
    expect(
      store.getState().view?.replaceableStarters.map((row) => row.entryId),
    ).toEqual(entryIds.slice(1, 6));
    expect({ ...snapshotOf(store, db, matchId), view: null }).toEqual({
      ...before,
      view: null,
    });
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-053 RF-055 RF-057: choosing Eva as the replaced X gives Ana the X, empties Eva's cell (not a circled X), keeps the 5 X, saves both cells and pushes one entry with both", () => {
    const { store, db, matchId, cell, entryIds } = menu(CIRCLED_IN_5X);
    const eva = entryIds[4] ?? 0;
    choose(store, "starter");
    expect(store.getState().chooseReplaced(eva)).toEqual(SAVED);
    const { grid, history, pending, view } = store.getState();
    expect(grid?.marks[`${cell.entryId}:P2`]).toBe("starter");
    expect(grid?.marks[`${eva}:P2`]).toBeUndefined();
    expect(reopened(db, matchId).getState().grid).toEqual(grid);
    expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
    expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    expect(history).toHaveLength(1);
    expect(history[0]).toHaveLength(2);
    expect(pending).toBeNull();
    expect(view?.replaceableStarters).toEqual([]);
  });

  it("RF-053 RF-047: in that choice an entry with the circled X, or with no mark, in P2 is unchanged and the choice stays open", () => {
    const { store, db, matchId, cell, entryIds } = menu([
      ...CIRCLED_IN_5X,
      ...fillColumn("P2", [6], "sub"),
    ]);
    choose(store, "starter");
    const before = snapshotOf(store, db, matchId);
    // Ana's own circled X, row 6's circled X and row 7, who has no mark.
    for (const entryId of [cell.entryId, entryIds[6] ?? 0, entryIds[7] ?? 0]) {
      expect(store.getState().chooseReplaced(entryId)).toEqual(UNCHANGED);
    }
    expect(store.getState().pending).toEqual({ kind: "chooseReplaced", cell });
    expect(snapshotOf(store, db, matchId).marks).toEqual(before.marks);
  });
});
