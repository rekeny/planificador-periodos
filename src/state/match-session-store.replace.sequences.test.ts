// T097: the starter in place of another with undo, call-up changes, interruptions, cancelling and
// failing saves (RF-045, RF-047, RF-055, RF-057, RF-085, RF-086, E-026, D3 rule 2, D3-4). Writes fail
// through real SQLite triggers and reads through a renamed table, so no repository is mocked. A
// failed choice closes the question, leaves everything as it was before the tap and sets saveFailed.
// The helpers repeat the ones of match-session-store.replace.test.ts on purpose: a shared one would
// go in tests/support/, which makes the full Stryker run necessary.
import { starterCount } from "@/domain/grid";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  mostStarters,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import { FULL_P2, reopened } from "../../tests/support/match-session-questions";
import { placed } from "../../tests/support/match-session-undo";

const P2 = { kind: "period", number: 2 } as const;
const UNCHANGED = { kind: "unchanged" };
const SAVED = { kind: "saved" };

/** Ana's empty P2 tapped and «Titular en lugar de otro» answered: the choice of the replaced X is open. */
function choosing() {
  const session = openedSession(8, FULL_P2);
  const [ana, eva] = [session.entryIds[0] ?? 0, session.entryIds[4] ?? 0];
  const cell = cellAt(ana, "P2");
  session.store.getState().tapCell(cell);
  expect(session.store.getState().pending?.kind).toBe("subOrStarter");
  const before = snapshotOf(session.store, session.db, session.matchId);
  session.store.getState().answerStarter();
  expect(session.store.getState().pending).toEqual({
    kind: "chooseReplaced",
    cell,
  });
  return { ...session, ana, eva, cell, before };
}

describe("match session, undoing and removing after a replacement", () => {
  it("RF-047 RF-057: a replacement and then «Deshacer» once gives Eva's X back and leaves Ana's cell empty, in one press", () => {
    const { store, db, matchId, ana, eva } = choosing();
    const first = placed(store, db, matchId);
    expect(store.getState().chooseReplaced(eva)).toEqual(SAVED);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(placed(store, db, matchId)).toEqual(first);
    expect(savedMarks(db, matchId)).toContain(`${eva}:P2=starter`);
    expect(savedMarks(db, matchId).join()).not.toContain(`${ana}:P2`);
    expect(store.getState().history).toEqual([]);
    expect(store.getState().view?.canUndo).toBe(false);
  });

  it("RF-047 RF-055 RF-057: two replacements in a row keep P2 at 5 X and each «Deshacer» reverts one whole replacement", () => {
    const { store, db, matchId, ana, eva, entryIds } = choosing();
    const [second, replaced] = [entryIds[6] ?? 0, entryIds[1] ?? 0];
    store.getState().chooseReplaced(eva);
    const afterFirst = placed(store, db, matchId);
    store.getState().tapCell(cellAt(second, "P2"));
    store.getState().answerStarter();
    expect(store.getState().chooseReplaced(replaced)).toEqual(SAVED);
    expect(mostStarters(savedGrid(db, matchId))).toBe(5);
    expect(store.getState().history).toHaveLength(2);
    store.getState().undo();
    expect(placed(store, db, matchId)).toEqual(afterFirst);
    expect(store.getState().undo()).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toContain(`${eva}:P2=starter`);
    expect(savedMarks(db, matchId).join()).not.toContain(`${ana}:P2`);
    expect(starterCount(savedGrid(db, matchId), P2)).toBe(5);
  });

  it("E-026 RF-057 RF-086: replace Eva by Ana in P2, remove Eva from the call-up, «Deshacer»: Ana's P2 is empty, P2 has 4 X and Eva does not come back", () => {
    const { store, db, matchId, ana, eva } = choosing();
    store.getState().chooseReplaced(eva);
    expect(store.getState().removeFromCallUp(eva)).toEqual(SAVED);
    expect(store.getState().undo()).toEqual(SAVED);
    const grid = savedGrid(db, matchId);
    expect(grid.marks[`${ana}:P2`]).toBeUndefined();
    expect(starterCount(grid, P2)).toBe(4);
    expect(grid.callUp.map((entry) => entry.id)).not.toContain(eva);
    expect(store.getState().grid).toEqual(grid);
    expect(savedMarks(db, matchId).join()).not.toContain(`${eva}:`);
    expect(store.getState().history).toEqual([]);
  });
});

describe("match session, a choice left open when the app closes", () => {
  it("RF-045 RF-047 RF-082: closing the match with the choice open leaves nothing pending and nothing saved, and a new store reads the grid as before the tap", () => {
    const { store, db, matchId, before } = choosing();
    store.getState().closeMatch();
    expect(store.getState().pending).toBeNull();
    expect(savedMarks(db, matchId)).toEqual(before.marks);
    const fresh = reopened(db, matchId);
    expect(fresh.getState().pending).toBeNull();
    expect(fresh.getState().grid).toEqual(before.grid);
    expect(fresh.getState().view?.replaceableStarters).toEqual([]);
    expect(fresh.getState().history).toEqual([]);
  });

  it("RF-045 RF-047: opening the match again with the choice open drops it and empties replaceableStarters", () => {
    const { store, matchId } = choosing();
    store.getState().openMatch(matchId);
    expect(store.getState().pending).toBeNull();
    expect(store.getState().view?.replaceableStarters).toEqual([]);
  });
});

describe("match session, cancelling the choice of the replaced X", () => {
  it("RF-045 RF-047: cancelQuestion() while choosing leaves the tapped cell empty, changes no cell, pushes no undo entry, writes nothing and empties replaceableStarters", () => {
    const { store, db, matchId, ana, eva, before } = choosing();
    store.getState().cancelQuestion();
    expect(store.getState().pending).toBeNull();
    expect(snapshotOf(store, db, matchId)).toEqual(before);
    expect(store.getState().view?.replaceableStarters).toEqual([]);
    expect(store.getState().grid?.marks[`${ana}:P2`]).toBeUndefined();
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().chooseReplaced(eva)).toEqual(UNCHANGED);
    expect(snapshotOf(store, db, matchId)).toEqual(before);
  });
});

type Write = "INSERT" | "DELETE";
const WRITES: Write[] = ["INSERT", "DELETE"];

/** What a failed choice must leave: as before the tap, nothing pending, saveFailed, nothing new to undo. */
function expectFailedAndUntouched(s: ReturnType<typeof choosing>): void {
  const { store, db, matchId, before } = s;
  expect(snapshotOf(store, db, matchId)).toEqual(before);
  expect(store.getState().history).toEqual([]);
  expect(store.getState().view?.canUndo).toBe(false);
  expect(store.getState().view?.replaceableStarters).toEqual([]);
  expect(store.getState().saveFailed).toBe(true);
  expect(store.getState().pending).toBeNull();
}

describe("match session, a choice that cannot be saved", () => {
  it.each(WRITES)(
    "RF-085 RF-047: chooseReplaced with a throwing %s of marks changes neither cell, pushes no undo entry, sets saveFailed and closes the choice",
    (write) => {
      const session = choosing();
      failMarkWrites(session.db, write);
      expect(session.store.getState().chooseReplaced(session.eva)).toEqual({
        kind: "saveFailed",
      });
      expectFailedAndUntouched(session);
    },
  );

  it("RF-085 RF-047: chooseReplaced with the read before the write throwing writes nothing, sets saveFailed and closes the choice", () => {
    const session = choosing();
    breakReads(session.db, "players");
    expect(session.store.getState().chooseReplaced(session.eva)).toEqual({
      kind: "saveFailed",
    });
    expectFailedAndUntouched(session);
  });

  it("RF-085 RF-047: after a failed choice the coach taps the same cell again and, with space on the device, the replacement is saved and saveFailed clears", () => {
    const session = choosing();
    failMarkWrites(session.db, "INSERT");
    session.store.getState().chooseReplaced(session.eva);
    allowMarkWrites(session.db, "INSERT");
    const { store, cell, eva, ana, db, matchId } = session;
    expect(store.getState().tapCell(cell).kind).toBe("unchanged");
    expect(store.getState().pending?.kind).toBe("subOrStarter");
    store.getState().answerStarter();
    expect(store.getState().chooseReplaced(eva)).toEqual(SAVED);
    expect(savedMarks(db, matchId)).toContain(`${ana}:P2=starter`);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-047 RF-085: answerStarter() reads and writes nothing: with every read of players and every write of marks failing it still opens the choice and saveFailed stays false", () => {
    const { store, db, entryIds } = openedSession(8, FULL_P2);
    const cell = cellAt(entryIds[0] ?? 0, "P2");
    store.getState().tapCell(cell);
    failMarkWrites(db, "INSERT");
    failMarkWrites(db, "DELETE");
    breakReads(db, "players");
    expect(store.getState().answerStarter()).toEqual(UNCHANGED);
    expect(store.getState().pending).toEqual({ kind: "chooseReplaced", cell });
    expect(store.getState().view?.replaceableStarters).toHaveLength(5);
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().history).toEqual([]);
  });
});
