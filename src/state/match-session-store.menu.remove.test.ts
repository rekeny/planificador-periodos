// T063: «Quitar» and closing the long-press menu (RF-045, RF-050, RF-052, RF-054, RF-057). «Quitar» on
// an X in a period with a sub turns the menu into the reminder of the same cell (`unchanged`, nothing
// written; confirmRemove() or cancelQuestion() finish it); on anything else it saves. The helpers
// repeat the ones of match-session-store.menu.test.ts on purpose: a shared one would go in
// tests/support/, which makes the full Stryker run necessary. Rows are positions of the call-up.
import { starterCount } from "@/domain/grid";
import type { CellMenuChoice } from "@/domain/cell-menu";
import {
  cellAt,
  fillColumn,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
} from "../../tests/support/match-session-questions";

const UNCHANGED = { kind: "unchanged" };
const SAVED = { kind: "saved" };
const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
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

describe("match session, «Quitar» in the long-press menu", () => {
  it("RF-052 RF-050: «Quitar» on an X in a period with a sub turns the menu into the reminder of the same cell and saves nothing", () => {
    const { store, db, matchId, cell, before } = menu(P3_WITH_SUB, 4, "P3");
    expect(choose(store, "remove")).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({
      kind: "confirmRemoveStarter",
      cell,
    });
    expect(savedMarks(db, matchId)).toEqual(before);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-052 RF-050: the reminder cancelled leaves Eva's X, no undo entry and nothing pending", () => {
    const { store, db, matchId, cell, before } = menu(P3_WITH_SUB, 4, "P3");
    choose(store, "remove");
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(store.getState().grid?.marks[`${cell.entryId}:P3`]).toBe("starter");
    expect(savedMarks(db, matchId)).toEqual(before);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-052 RF-054 RF-057: «Quitar» then «Quitar de todos modos» empties Eva's X and leaves the sub a circled X, P3 with 4 X, one undo entry", () => {
    const { store, db, matchId, cell, entryIds } = menu(P3_WITH_SUB, 4, "P3");
    choose(store, "remove");
    expect(store.getState().confirmRemove()).toEqual(SAVED);
    const { grid, history } = store.getState();
    expect(grid?.marks[`${cell.entryId}:P3`]).toBeUndefined();
    expect(grid?.marks[`${entryIds[5] ?? 0}:P3`]).toBe("sub");
    expect(
      starterCount(savedGrid(db, matchId), { kind: "period", number: 3 }),
    ).toBe(4);
    expect(history).toHaveLength(1);
  });

  it("RF-052 RF-054: «Quitar» on a circled X empties it, and no other circled X becomes an X", () => {
    const seeds: readonly SeedMark[] = [
      ...fillColumn("P3", [0, 1, 2, 3, 4]),
      ...fillColumn("P3", [5, 6], "sub"),
    ];
    const { store, db, matchId, cell, entryIds } = menu(seeds, 5, "P3");
    expect(choose(store, "remove")).toEqual(SAVED);
    expect(store.getState().grid?.marks[`${cell.entryId}:P3`]).toBeUndefined();
    expect(savedMarks(db, matchId)).toEqual(
      [
        ...[0, 1, 2, 3, 4].map((row) => `${entryIds[row]}:P3=starter`),
        `${entryIds[6]}:P3=sub`,
      ].sort(),
    );
  });
});

describe("match session, closing the long-press menu", () => {
  it("RF-052 RF-045: cancelQuestion() with the menu open changes no cell, pushes no undo entry, writes nothing and leaves saveFailed as it was", () => {
    const { store, db, matchId } = menu(CIRCLED_IN_4X);
    const before = snapshotOf(store, db, matchId);
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-052 RF-053 RF-045: cancelQuestion() while choosing the replaced X (opened from the menu) leaves the long-pressed cell as it was", () => {
    const { store, db, matchId, cell, before } = menu(CIRCLED_IN_5X);
    choose(store, "starter");
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(store.getState().view?.replaceableStarters).toEqual([]);
    expect(store.getState().grid?.marks[`${cell.entryId}:P2`]).toBe("sub");
    expect(savedMarks(db, matchId)).toEqual(before);
    expect(store.getState().history).toEqual([]);
  });
});
