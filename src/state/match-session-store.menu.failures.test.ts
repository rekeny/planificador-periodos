// T063: the long-press menu when saving fails (RF-052, RF-053, RF-050, RF-085, D3 rule 2, D3-4).
// Writes fail through real SQLite triggers and reads through a renamed table, so no repository is
// mocked. A failed menu choice closes the menu (or the choice or reminder it turned into), leaves
// everything as it was before the long press and sets saveFailed. Opening the menu, and a choice
// that only turns into a question or matches the cell, read and write nothing. The helpers repeat
// the ones of match-session-store.menu.test.ts on purpose: a shared one would go in tests/support/.
import type { CellMenuChoice } from "@/domain/cell-menu";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  fillColumn,
  openedSession,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
} from "../../tests/support/match-session-questions";

const UNCHANGED = { kind: "unchanged" };
const FAILED = { kind: "saveFailed" };
const CIRCLED_IN_4X: readonly SeedMark[] = [
  ...fillColumn("P2", [1, 2, 3, 4]),
  [0, "P2", "sub"],
];
const X_IN_4X: readonly SeedMark[] = fillColumn("P2", [0, 1, 2, 3]);
const CIRCLED_IN_5X: readonly SeedMark[] = [...FULL_P2, [0, "P2", "sub"]];

/** What the menu is opened on, what is chosen, and which write the choice makes. */
interface Choice {
  readonly seeds: readonly SeedMark[];
  readonly row: number;
  readonly key: "P2" | "P3";
  readonly choice: CellMenuChoice;
  readonly write: "INSERT" | "DELETE";
}
const CHOICES: Record<string, Choice> = {
  "«Titular» on a circled X": {
    seeds: CIRCLED_IN_4X,
    row: 0,
    key: "P2",
    choice: "starter",
    write: "INSERT",
  },
  "«Entró de cambio» on an X": {
    seeds: X_IN_4X,
    row: 0,
    key: "P2",
    choice: "sub",
    write: "INSERT",
  },
  "«Quitar» on a circled X": {
    seeds: CIRCLED_IN_4X,
    row: 0,
    key: "P2",
    choice: "remove",
    write: "DELETE",
  },
  "«Quitar» and «Quitar de todos modos»": {
    seeds: P3_WITH_SUB,
    row: 4,
    key: "P3",
    choice: "remove",
    write: "DELETE",
  },
  "«Titular» with 5 X and the replaced X": {
    seeds: CIRCLED_IN_5X,
    row: 0,
    key: "P2",
    choice: "starter",
    write: "INSERT",
  },
};
const LABELS = Object.keys(CHOICES);

/** The menu opened; `finish` makes the choice and, when it opens the replaced-X choice or the reminder, answers that too. */
function opened(label: string) {
  const { seeds, row, key, choice } = CHOICES[label] as Choice;
  const session = openedSession(8, seeds);
  const cell = cellAt(session.entryIds[row] ?? 0, key);
  session.store.getState().openCellMenu(cell);
  expect(session.store.getState().pending).toEqual({ kind: "cellMenu", cell });
  const finish = () => {
    const { store, entryIds } = session;
    const first = store.getState().chooseCellMenuOption(choice);
    const pending = store.getState().pending;
    if (pending?.kind === "chooseReplaced") {
      return store.getState().chooseReplaced(entryIds[4] ?? 0);
    }
    if (pending?.kind === "confirmRemoveStarter") {
      return store.getState().confirmRemove();
    }
    return first;
  };
  return { ...session, cell, finish };
}

describe("match session, a menu choice that cannot be saved", () => {
  it.each(LABELS)(
    "RF-085 RF-052 RF-053: %s with a throwing write: nothing changes, «Deshacer» has nothing new, saveFailed is set and nothing is pending",
    (label) => {
      const { store, db, matchId, finish } = opened(label);
      const before = snapshotOf(store, db, matchId);
      failMarkWrites(db, (CHOICES[label] as Choice).write);
      expect(finish()).toEqual(FAILED);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().history).toEqual([]);
      expect(store.getState().saveFailed).toBe(true);
      expect(store.getState().pending).toBeNull();
      expect(store.getState().view?.replaceableStarters).toEqual([]);
    },
  );

  it.each(LABELS)(
    "RF-085 RF-052 RF-053: %s with the read before the write throwing: nothing is written, saveFailed is set and nothing is pending",
    (label) => {
      const { store, db, matchId, finish } = opened(label);
      const before = snapshotOf(store, db, matchId);
      breakReads(db, "players");
      expect(finish()).toEqual(FAILED);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().history).toEqual([]);
      expect(store.getState().saveFailed).toBe(true);
      expect(store.getState().pending).toBeNull();
    },
  );

  it("RF-085 RF-052: after a failed choice the coach can long-press the same cell again and, with space on the device, the change is saved and saveFailed clears", () => {
    const { store, db, matchId, cell } = opened("«Titular» on a circled X");
    failMarkWrites(db, "INSERT");
    store.getState().chooseCellMenuOption("starter");
    allowMarkWrites(db, "INSERT");
    expect(store.getState().openCellMenu(cell)).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({ kind: "cellMenu", cell });
    expect(store.getState().chooseCellMenuOption("starter")).toEqual({
      kind: "saved",
    });
    expect(savedMarks(db, matchId)).toContain(`${cell.entryId}:P2=starter`);
    expect(store.getState().saveFailed).toBe(false);
  });
});

describe("match session, what the menu does without reading or writing", () => {
  function everythingFails(session: ReturnType<typeof openedSession>) {
    failMarkWrites(session.db, "INSERT");
    failMarkWrites(session.db, "DELETE");
    breakReads(session.db, "players");
  }

  it("RF-052 RF-085: openCellMenu reads and writes nothing: with every read and write failing it still opens the menu and saveFailed stays false", () => {
    const session = openedSession(8, CIRCLED_IN_4X);
    everythingFails(session);
    const cell = cellAt(session.entryIds[0] ?? 0, "P2");
    expect(session.store.getState().openCellMenu(cell)).toEqual(UNCHANGED);
    expect(session.store.getState().pending).toEqual({
      kind: "cellMenu",
      cell,
    });
    expect(session.store.getState().saveFailed).toBe(false);
  });

  it("RF-052 RF-085: openCellMenu leaves saveFailed true when a failed save came before it", () => {
    const { store, db, entryIds } = openedSession(8, CIRCLED_IN_4X);
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[6] ?? 0, "P1"));
    allowMarkWrites(db, "INSERT");
    expect(store.getState().saveFailed).toBe(true);
    store.getState().openCellMenu(cellAt(entryIds[0] ?? 0, "P2"));
    expect(store.getState().pending?.kind).toBe("cellMenu");
    expect(store.getState().saveFailed).toBe(true);
  });

  interface Silent {
    readonly seeds: readonly SeedMark[];
    readonly row: number;
    readonly key: "P2" | "P3";
    readonly choice: CellMenuChoice;
    readonly kind: string;
  }
  const SILENT: Record<string, Silent> = {
    "a choice that matches the cell": {
      seeds: X_IN_4X,
      row: 0,
      key: "P2",
      choice: "starter",
      kind: "none",
    },
    "«Titular» with 5 X, which only opens the choice": {
      seeds: CIRCLED_IN_5X,
      row: 0,
      key: "P2",
      choice: "starter",
      kind: "chooseReplaced",
    },
    "«Quitar» with a sub, which only opens the reminder": {
      seeds: P3_WITH_SUB,
      row: 4,
      key: "P3",
      choice: "remove",
      kind: "confirmRemoveStarter",
    },
  };
  it.each(Object.keys(SILENT))(
    "RF-052 RF-053 RF-050 RF-085: %s reads and writes nothing: with every read and write failing it is unchanged and saveFailed stays false",
    (label) => {
      const { seeds, row, key, choice, kind } = SILENT[label] as Silent;
      const session = openedSession(8, seeds);
      const cell = cellAt(session.entryIds[row] ?? 0, key);
      session.store.getState().openCellMenu(cell);
      everythingFails(session);
      expect(session.store.getState().chooseCellMenuOption(choice)).toEqual(
        UNCHANGED,
      );
      expect(session.store.getState().pending?.kind ?? "none").toBe(kind);
      expect(session.store.getState().saveFailed).toBe(false);
      expect(session.store.getState().history).toEqual([]);
    },
  );
});
