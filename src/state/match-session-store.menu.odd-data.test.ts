// T063: the long-press menu with odd data (RF-045, RF-050, RF-052). A long press on an empty cell, on
// a cell that is not in the grid or while another question is open opens no menu; a menu choice or
// an answer acts only with its own question pending. Real in-memory SQLite and the real domain.
// Sequences and interruptions are in match-session-store.menu.sequences.test.ts. The helpers repeat
// the ones of match-session-store.menu.test.ts on purpose: a shared one would go in tests/support/,
// which makes the full Stryker run necessary. Rows are positions of the call-up.
import type { CellMenuChoice } from "@/domain/cell-menu";
import type { Cell } from "@/domain/grid";
import { createMatchSessionStore } from "@/state/match-session-store";
import {
  cellAt,
  fillColumn,
  openedSession,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
} from "../../tests/support/match-session-questions";
import { createTestDatabase } from "../../tests/support/test-database";

const UNCHANGED = { kind: "unchanged" };
const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
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

describe("match session, a long press that opens no menu", () => {
  it.each<[string, (s: Session) => Cell]>([
    ["an empty cell", (s) => cellAt(s.entryIds[7] ?? 0, "P2")],
    ["an entry that is not in the call-up", () => cellAt(9999, "P2")],
    ["a period beyond the format", (s) => cellAt(s.entryIds[0] ?? 0, "P9")],
    [
      "an overtime that does not exist",
      (s) => cellAt(s.entryIds[0] ?? 0, "OT1"),
    ],
  ])(
    "RF-052: openCellMenu on %s is unchanged: no menu, no mark, nothing written",
    (_label, cellOf) => {
      const session = openedSession(8, CIRCLED_IN_4X);
      const { store, db, matchId } = session;
      const before = snapshotOf(store, db, matchId);
      expect(store.getState().openCellMenu(cellOf(session))).toEqual(UNCHANGED);
      expect(store.getState().pending).toBeNull();
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().saveFailed).toBe(false);
    },
  );

  it("RF-052: openCellMenu with no match open is unchanged and nothing is pending", () => {
    const store = createMatchSessionStore(createTestDatabase());
    expect(store.getState().openCellMenu(cellAt(1, "P2"))).toEqual(UNCHANGED);
    expect(store.getState().pending).toBeNull();
  });

  it.each<[string, (s: Session) => void]>([
    [
      "the question",
      (s) => void s.store.getState().tapCell(cellAt(s.entryIds[0] ?? 0, "P2")),
    ],
    [
      "the choice of the replaced X",
      (s) => {
        s.store.getState().tapCell(cellAt(s.entryIds[0] ?? 0, "P2"));
        s.store.getState().answerStarter();
      },
    ],
    [
      "the menu",
      (s) =>
        void s.store.getState().openCellMenu(cellAt(s.entryIds[1] ?? 0, "P2")),
    ],
  ])(
    "RF-052 RF-057: openCellMenu with %s already pending is unchanged and keeps that question",
    (_label, ask) => {
      const session = openedSession(8, FULL_P2);
      const { store, db, matchId, entryIds } = session;
      ask(session);
      const pending = store.getState().pending;
      expect(pending).not.toBeNull();
      const before = snapshotOf(store, db, matchId);
      const other = cellAt(entryIds[2] ?? 0, "P2");
      expect(store.getState().openCellMenu(other)).toEqual(UNCHANGED);
      expect(store.getState().pending).toEqual(pending);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );

  it("RF-052 RF-050 RF-057: openCellMenu with the reminder already pending is unchanged and keeps the reminder", () => {
    const { store, entryIds } = openedSession(8, P3_WITH_SUB);
    store.getState().tapCell(cellAt(entryIds[4] ?? 0, "P3"));
    const pending = store.getState().pending;
    expect(pending?.kind).toBe("confirmRemoveStarter");
    expect(
      store.getState().openCellMenu(cellAt(entryIds[0] ?? 0, "P3")),
    ).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual(pending);
  });
});

describe("match session, a menu choice with no menu open", () => {
  it.each<CellMenuChoice>(["starter", "sub", "remove"])(
    "RF-052: chooseCellMenuOption(%s) with nothing pending is unchanged and changes nothing",
    (choice) => {
      const session = openedSession(8, CIRCLED_IN_4X);
      const { store, db, matchId } = session;
      const before = snapshotOf(store, db, matchId);
      expect(choose(session, choice)).toEqual(UNCHANGED);
      expect(store.getState().pending).toBeNull();
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );

  it.each<[string, (s: Session) => unknown]>([
    [
      "the question",
      (s) => s.store.getState().tapCell(cellAt(s.entryIds[0] ?? 0, "P2")),
    ],
    [
      "the choice of the replaced X",
      (s) => {
        s.store.getState().tapCell(cellAt(s.entryIds[0] ?? 0, "P2"));
        s.store.getState().answerStarter();
      },
    ],
  ])(
    "RF-052 RF-045: chooseCellMenuOption with %s pending is unchanged, changes nothing and keeps it",
    (_label, open) => {
      const session = openedSession(8, FULL_P2);
      const { store, db, matchId } = session;
      open(session);
      const pending = store.getState().pending;
      const before = snapshotOf(store, db, matchId);
      expect(choose(session, "remove")).toEqual(UNCHANGED);
      expect(store.getState().pending).toEqual(pending);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );

  it("RF-052 RF-050: chooseCellMenuOption with the reminder pending is unchanged and keeps the reminder", () => {
    const session = openedSession(8, P3_WITH_SUB);
    session.store.getState().tapCell(cellAt(session.entryIds[4] ?? 0, "P3"));
    const pending = session.store.getState().pending;
    expect(choose(session, "starter")).toEqual(UNCHANGED);
    expect(session.store.getState().pending).toEqual(pending);
  });

  it.each<[string, (s: Session) => unknown]>([
    ["answerSub", (s) => s.store.getState().answerSub()],
    ["answerStarter", (s) => s.store.getState().answerStarter()],
    [
      "chooseReplaced",
      (s) => s.store.getState().chooseReplaced(s.entryIds[1] ?? 0),
    ],
    ["confirmRemove", (s) => s.store.getState().confirmRemove()],
  ])(
    "RF-052 RF-045 RF-050: %s with the menu pending is unchanged and keeps the menu",
    (_label, answer) => {
      const session = menu(CIRCLED_IN_5X);
      const { store, db, matchId, cell } = session;
      const before = snapshotOf(store, db, matchId);
      expect(answer(session)).toEqual(UNCHANGED);
      expect(store.getState().pending).toEqual({ kind: "cellMenu", cell });
      expect(snapshotOf(store, db, matchId)).toEqual(before);
    },
  );
});
