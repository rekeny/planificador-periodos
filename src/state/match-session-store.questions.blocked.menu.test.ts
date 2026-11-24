// T063, the long-press menu joins the blocked-actions tests of T100 and T097 (RF-052, RF-057, RF-085,
// D3-7): while the menu is open, tapCell, openCellMenu, undo, addOvertime, removeLastOvertime,
// addToCallUp, removeFromCallUp and createPlayerInMatch answer `unchanged`, read and write nothing,
// push and drop no undo entry, leave saveFailed as it was and leave the menu open. The setup repeats
// the one of match-session-store.questions.blocked.replace.test.ts on purpose: the other blocked
// files are at the 250-line limit, and a shared helper would go in tests/support/.
import { createPlayer } from "@/data/player-repository";
import {
  failWrites,
  savedCallUp,
  savedTeam,
} from "../../tests/support/match-session-call-up";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  failOvertimeWrites,
  fillColumn,
  openedSession,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import { FULL_P2, reopened } from "../../tests/support/match-session-questions";

/**
 * 8 players, one overtime with Ana's X, one team player outside the call-up, one undo entry (a tap on
 * row 6's P1), then the long-press menu opened on Eva's X in P2. With `failedBefore` the tap on row
 * 7's P1 before the menu fails to save, so saveFailed is true when it is opened.
 */
function menuOpen(failedBefore = false) {
  const session = openedSession(8, [...FULL_P2, ...fillColumn("OT1", [0])], {
    overtimeCount: 1,
  });
  const { store, db, teamId, entryIds } = session;
  const bench = createPlayer(db, { teamId, name: "Reserva", number: "20" });
  store.getState().tapCell(cellAt(entryIds[6] ?? 0, "P1"));
  if (failedBefore) {
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[7] ?? 0, "P1"));
    allowMarkWrites(db, "INSERT");
  }
  const cell = cellAt(entryIds[4] ?? 0, "P2");
  store.getState().openCellMenu(cell);
  // The precondition of every test below: the menu is open on that cell.
  expect(store.getState().pending).toEqual({ kind: "cellMenu", cell });
  expect(store.getState().history).toHaveLength(1);
  expect(store.getState().saveFailed).toBe(failedBefore);
  return { ...session, bench, cell };
}
type MenuOpen = ReturnType<typeof menuOpen>;

/** Everything a refused action must leave alone: the state, the call-up, the team and the database. */
function stateOf({ store, db, matchId, teamId }: MenuOpen) {
  const { pending, saveFailed } = store.getState();
  return {
    ...snapshotOf(store, db, matchId),
    pending,
    saveFailed,
    callUp: savedCallUp(db, matchId),
    team: savedTeam(db, teamId),
  };
}

const ACTIONS: [string, (s: MenuOpen) => unknown][] = [
  [
    "tapCell",
    ({ store, entryIds }) =>
      store.getState().tapCell(cellAt(entryIds[7] ?? 0, "P2")),
  ],
  ["undo", ({ store }) => store.getState().undo()],
  ["addOvertime", ({ store }) => store.getState().addOvertime()],
  ["removeLastOvertime", ({ store }) => store.getState().removeLastOvertime()],
  ["addToCallUp", ({ store, bench }) => store.getState().addToCallUp(bench.id)],
  [
    "openCellMenu",
    ({ store, entryIds }) =>
      store.getState().openCellMenu(cellAt(entryIds[2] ?? 0, "P2")),
  ],
  [
    "removeFromCallUp",
    ({ store, entryIds }) =>
      store.getState().removeFromCallUp(entryIds[7] ?? 0),
  ],
  [
    "createPlayerInMatch",
    ({ store }) =>
      store.getState().createPlayerInMatch({ name: "Marta", number: "5" }),
  ],
];
const UNCHANGED = { kind: "unchanged" };

describe("match session, the other actions while the long-press menu is open", () => {
  it.each(ACTIONS)(
    "RF-057 RF-085 RF-052: %s with the menu pending is unchanged, changes and writes nothing, and the menu choice can still be made",
    (_name, act) => {
      const session = menuOpen();
      const before = stateOf(session);
      expect(act(session)).toEqual(UNCHANGED);
      expect(stateOf(session)).toEqual(before);
      const fresh = reopened(session.db, session.matchId);
      expect(fresh.getState().grid).toEqual(before.grid);
      const choice = session.store.getState().chooseCellMenuOption("sub");
      expect(choice).toEqual({ kind: "saved" });
      expect(
        session.store.getState().grid?.marks[`${session.cell.entryId}:P2`],
      ).toBe("sub");
      expect(session.store.getState().pending).toBeNull();
    },
  );

  it.each(ACTIONS)(
    "RF-085 RF-057: %s reads and writes nothing: with every read and write failing it is unchanged and saveFailed stays false",
    (_name, act) => {
      const session = menuOpen();
      const { db } = session;
      failMarkWrites(db, "INSERT");
      failMarkWrites(db, "DELETE");
      failOvertimeWrites(db);
      failWrites(db, "call_up_entries", "INSERT");
      failWrites(db, "call_up_entries", "DELETE");
      failWrites(db, "players", "INSERT");
      breakReads(db, "players");
      const asking = session.store.getState().pending;
      expect(act(session)).toEqual(UNCHANGED);
      expect(session.store.getState().saveFailed).toBe(false);
      expect(session.store.getState().pending).toEqual(asking);
      expect(session.store.getState().history).toHaveLength(1);
    },
  );

  it.each(ACTIONS)(
    "RF-085 RF-057: %s leaves saveFailed true when a failed save came before the menu",
    (_name, act) => {
      const session = menuOpen(true);
      expect(act(session)).toEqual(UNCHANGED);
      expect(session.store.getState().saveFailed).toBe(true);
      expect(session.store.getState().pending?.kind).toBe("cellMenu");
    },
  );

  it("RF-057 RF-035 RF-085: createPlayerInMatch with invalid input while the menu is pending is unchanged, not invalid, and creates nobody", () => {
    const session = menuOpen();
    const before = stateOf(session);
    expect(
      session.store.getState().createPlayerInMatch({ name: "", number: "" }),
    ).toEqual(UNCHANGED);
    expect(stateOf(session)).toEqual(before);
  });
});
