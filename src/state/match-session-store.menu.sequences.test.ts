// T063: the long-press menu in sequences and when the app closes (RF-052, RF-053, RF-054, RF-057,
// RF-082). A menu change is one undo entry, whatever path led to it; closing the match drops the menu.
// Real in-memory SQLite and the real domain. The helpers repeat the ones of
// match-session-store.menu.odd-data.test.ts on purpose: a shared one would go in tests/support/, which
// makes the full Stryker run necessary. Rows are positions of the call-up.
import type { CellMenuChoice } from "@/domain/cell-menu";
import {
  cellAt,
  fillColumn,
  openedSession,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
  reopened,
} from "../../tests/support/match-session-questions";

const UNCHANGED = { kind: "unchanged" };
const SAVED = { kind: "saved" };
const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
const X_IN_4X: readonly SeedMark[] = fillColumn("P2", [0, 1, 2, 3]);
const CIRCLED_IN_5X: readonly SeedMark[] = [...FULL_P2, [0, "P2", "sub"]];

type Session = ReturnType<typeof openedSession>;
const choose = (session: Session, choice: CellMenuChoice) =>
  session.store.getState().chooseCellMenuOption(choice);

/** The seeds, with the menu open on the cell of `row` in `key`. */
function menu(seeds: readonly SeedMark[], row = 0, key: "P2" | "P3" = "P2") {
  const session = openedSession(8, seeds);
  const cell = cellAt(session.entryIds[row] ?? 0, key);
  session.store.getState().openCellMenu(cell);
  expect(session.store.getState().pending).toEqual({ kind: "cellMenu", cell });
  return { ...session, cell };
}

describe("match session, menu changes followed by «Deshacer»", () => {
  interface Path {
    readonly seeds: readonly SeedMark[];
    readonly row: number;
    readonly key: "P2" | "P3";
    readonly act: (s: Session) => void;
  }
  const PATHS: Record<string, Path> = {
    "«Titular» on a circled X in a period with 4 X": {
      seeds: CIRCLED_IN_4X,
      row: 0,
      key: "P2",
      act: (s) => void choose(s, "starter"),
    },
    "«Entró de cambio» on an X": {
      seeds: X_IN_4X,
      row: 0,
      key: "P2",
      act: (s) => void choose(s, "sub"),
    },
    "«Quitar» on an X": {
      seeds: X_IN_4X,
      row: 0,
      key: "P2",
      act: (s) => void choose(s, "remove"),
    },
    "«Quitar» and «Quitar de todos modos» on Eva's X": {
      seeds: P3_WITH_SUB,
      row: 4,
      key: "P3",
      act: (s) => {
        choose(s, "remove");
        s.store.getState().confirmRemove();
      },
    },
    "«Titular» on a circled X in a period with 5 X, replacing Eva": {
      seeds: CIRCLED_IN_5X,
      row: 0,
      key: "P2",
      act: (s) => {
        choose(s, "starter");
        s.store.getState().chooseReplaced(s.entryIds[4] ?? 0);
      },
    },
  };
  it.each(Object.keys(PATHS))(
    "RF-052 RF-053 RF-054 RF-057: %s, then «Deshacer» once gives back the cell, or both cells, as before, database included",
    (label) => {
      const { seeds, row, key, act } = PATHS[label] as Path;
      const session = menu(seeds, row, key);
      const { store, db, matchId } = session;
      const before = snapshotOf(store, db, matchId);
      act(session);
      expect(store.getState().history).toHaveLength(1);
      expect(savedMarks(db, matchId)).not.toEqual(before.marks);
      expect(store.getState().undo()).toEqual(SAVED);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );

  it("RF-052 RF-057: after «Entró de cambio» on an X the menu opens again on the new circled X, and «Titular» then «Deshacer» twice goes back step by step", () => {
    const session = menu(X_IN_4X);
    const { store, db, matchId, cell } = session;
    const start = savedMarks(db, matchId);
    choose(session, "sub");
    const circled = savedMarks(db, matchId);
    expect(store.getState().openCellMenu(cell)).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({ kind: "cellMenu", cell });
    expect(choose(session, "starter")).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toEqual(start);
    store.getState().undo();
    expect(savedMarks(db, matchId)).toEqual(circled);
    store.getState().undo();
    expect(savedMarks(db, matchId)).toEqual(start);
  });
});

describe("match session, the app closes with the menu open", () => {
  it.each<[string, (s: Session) => void]>([
    ["the menu", () => undefined],
    [
      "the choice of the replaced X opened from it",
      (s) => void choose(s, "starter"),
    ],
  ])(
    "RF-052 RF-053 RF-082: closeMatch() with %s open leaves nothing pending and nothing saved, and a new store reads the grid as before",
    (_label, step) => {
      const session = menu(CIRCLED_IN_5X);
      const { store, db, matchId } = session;
      const gridBefore = store.getState().grid;
      const before = savedMarks(db, matchId);
      step(session);
      store.getState().closeMatch();
      expect(store.getState().pending).toBeNull();
      expect(savedMarks(db, matchId)).toEqual(before);
      const fresh = reopened(db, matchId);
      expect(fresh.getState().pending).toBeNull();
      expect(fresh.getState().grid).toEqual(gridBefore);
      expect(fresh.getState().history).toEqual([]);
    },
  );

  it("RF-052 RF-050 RF-082: closeMatch() with the reminder opened from the menu leaves nothing pending, and opening the match again drops an open menu", () => {
    const session = menu(P3_WITH_SUB, 4, "P3");
    const { store, matchId } = session;
    choose(session, "remove");
    expect(store.getState().pending?.kind).toBe("confirmRemoveStarter");
    store.getState().closeMatch();
    expect(store.getState().pending).toBeNull();
    store.getState().openMatch(matchId);
    store.getState().openCellMenu(cellAt(session.entryIds[4] ?? 0, "P3"));
    expect(store.getState().pending?.kind).toBe("cellMenu");
    store.getState().openMatch(matchId);
    expect(store.getState().pending).toBeNull();
  });
});
