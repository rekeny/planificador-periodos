// T100: while a question is pending nothing else acts on the grid (D3-7, RF-057, RF-085). undo,
// addOvertime, removeLastOvertime, addToCallUp, removeFromCallUp and createPlayerInMatch answer
// `unchanged`, read and write nothing, push and drop no undo entry, leave saveFailed as it was and
// leave the question open. Real in-memory SQLite and the real domain; the "reads and writes nothing"
// claim is checked by making every read and write fail, so an action that tries one shows it.
import { createPlayer } from "@/data/player-repository";
import {
  failWrites,
  savedCallUp,
  savedTeam,
  undoEntryOf,
} from "../../tests/support/match-session-call-up";
import { breakReads } from "../../tests/support/match-session-fixtures";
import {
  allowMarkWrites,
  cellAt,
  failMarkWrites,
  failOvertimeWrites,
  fillColumn,
  openedSession,
  savedMarks,
  savedOvertimes,
  snapshotOf,
} from "../../tests/support/match-session-marks";
import {
  FULL_P2,
  P3_WITH_SUB,
  reopened,
} from "../../tests/support/match-session-questions";

type Kind = "question" | "reminder";
const SETUPS = {
  question: { seeds: FULL_P2, row: 0, key: "P2", answer: "answerSub" },
  reminder: { seeds: P3_WITH_SUB, row: 4, key: "P3", answer: "confirmRemove" },
} as const;

/**
 * 8 players, one overtime with Ana's X, one team player outside the call-up, one undo entry (a tap on
 * row 6's P1) and then a tap that leaves the question or the reminder pending. With `failedBefore`
 * the tap on row 7's P1 before the question fails to save, so saveFailed is true when it is asked.
 */
function asked(kind: Kind, failedBefore = false) {
  const { seeds, row, key } = SETUPS[kind];
  const session = openedSession(8, [...seeds, ...fillColumn("OT1", [0])], {
    overtimeCount: 1,
  });
  const { store, db, teamId, entryIds } = session;
  const bench = createPlayer(db, { teamId, name: "Reserva", number: "20" });
  expect(store.getState().tapCell(cellAt(entryIds[6] ?? 0, "P1")).kind).toBe(
    "saved",
  );
  if (failedBefore) {
    failMarkWrites(db, "INSERT");
    store.getState().tapCell(cellAt(entryIds[7] ?? 0, "P1"));
    allowMarkWrites(db, "INSERT");
  }
  store.getState().tapCell(cellAt(entryIds[row] ?? 0, key));
  // The precondition of every test below: the tap left that kind of question open.
  expect(store.getState().pending?.cell).toEqual(
    cellAt(entryIds[row] ?? 0, key),
  );
  expect(store.getState().history).toHaveLength(1);
  expect(store.getState().saveFailed).toBe(failedBefore);
  return { ...session, bench, kind };
}
type Asked = ReturnType<typeof asked>;

/** Everything a refused action must leave alone: the state, the call-up, the team and the database. */
function stateOf({ store, db, matchId, teamId }: Asked) {
  const { pending, saveFailed } = store.getState();
  return {
    ...snapshotOf(store, db, matchId),
    pending,
    saveFailed,
    callUp: savedCallUp(db, matchId),
    team: savedTeam(db, teamId),
  };
}

function answer({ store, kind }: Asked) {
  return store.getState()[SETUPS[kind].answer]();
}

const ACTIONS: [string, (s: Asked) => unknown][] = [
  ["undo", ({ store }) => store.getState().undo()],
  ["addOvertime", ({ store }) => store.getState().addOvertime()],
  ["removeLastOvertime", ({ store }) => store.getState().removeLastOvertime()],
  ["addToCallUp", ({ store, bench }) => store.getState().addToCallUp(bench.id)],
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
const KINDS: Kind[] = ["question", "reminder"];
const ROWS = ACTIONS.flatMap(([name, act]) =>
  KINDS.map((kind): [string, Kind, (s: Asked) => unknown] => [
    `${name} with the ${kind} pending`,
    kind,
    act,
  ]),
);

describe("match session, the other actions while a question is open", () => {
  it.each(ROWS)(
    "RF-057 RF-085 E-011 E-013: %s is unchanged, changes and writes nothing, and the question can still be answered",
    (_label, kind, act) => {
      const session = asked(kind);
      const before = stateOf(session);
      expect(act(session)).toEqual(UNCHANGED);
      expect(stateOf(session)).toEqual(before);
      // A new store on the same database reads the same grid, call-up and team.
      const fresh = reopened(session.db, session.matchId);
      expect(fresh.getState().grid).toEqual(before.grid);
      expect(answer(session)).toEqual({ kind: "saved" });
      expect(session.store.getState().pending).toBeNull();
    },
  );

  it.each(ROWS)(
    "RF-085 RF-057: %s reads and writes nothing: with every read and write failing it is unchanged and saveFailed stays false",
    (_label, kind, act) => {
      const session = asked(kind);
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
    "RF-085 RF-057: %s leaves saveFailed true when a failed save came before the question",
    (_name, act) => {
      const session = asked("question", true);
      expect(act(session)).toEqual(UNCHANGED);
      expect(session.store.getState().saveFailed).toBe(true);
      expect(session.store.getState().pending?.kind).toBe("subOrStarter");
    },
  );
});

describe("match session, a question open and the actions that stay refused", () => {
  it("RF-057 E-011: question pending on Ana's P2, «Deshacer» is refused and the last mark stays; after cancelling, it reverts the last mark", () => {
    const { store, db, matchId, entryIds } = openedSession(8, FULL_P2);
    const [ana, row6] = [entryIds[0] ?? 0, entryIds[6] ?? 0];
    store.getState().tapCell(cellAt(row6, "P1"));
    store.getState().tapCell(cellAt(ana, "P2"));
    expect(store.getState().undo()).toEqual(UNCHANGED);
    expect(savedMarks(db, matchId)).toContain(`${row6}:P1=starter`);
    expect(store.getState().history).toEqual([undoEntryOf(row6, 1)]);
    expect(store.getState().pending?.kind).toBe("subOrStarter");
    store.getState().cancelQuestion();
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).not.toContain(`${row6}:P1=starter`);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-059 RF-050 E-013: with the reminder pending, removing the last overtime that has marks is refused: the overtime and its marks stay", () => {
    const seeds = [...P3_WITH_SUB, ...fillColumn("OT1", [0, 1])];
    const { store, db, matchId, entryIds } = openedSession(8, seeds, {
      overtimeCount: 1,
    });
    store.getState().tapCell(cellAt(entryIds[4] ?? 0, "P3"));
    expect(store.getState().pending?.kind).toBe("confirmRemoveStarter");
    expect(store.getState().removeLastOvertime()).toEqual(UNCHANGED);
    expect(savedOvertimes(db, matchId)).toBe(1);
    expect(savedMarks(db, matchId)).toContain(`${entryIds[0]}:OT1=starter`);
    expect(store.getState().grid?.overtimeCount).toBe(1);
  });

  it("RF-057 RF-032 RF-046: question, addToCallUp refused, answer «Entra de cambio», addToCallUp adds her, and «Deshacer» still takes the circled X back", () => {
    const { store, db, matchId, teamId, entryIds } = openedSession(8, FULL_P2);
    const [ana, eva] = [
      entryIds[0] ?? 0,
      createPlayer(db, { teamId, name: "Eva", number: "20" }),
    ];
    store.getState().tapCell(cellAt(ana, "P2"));
    expect(store.getState().addToCallUp(eva.id)).toEqual(UNCHANGED);
    expect(savedCallUp(db, matchId)).not.toContain("20 Eva");
    expect(store.getState().answerSub()).toEqual({ kind: "saved" });
    expect(store.getState().addToCallUp(eva.id)).toEqual({ kind: "saved" });
    expect(savedCallUp(db, matchId)).toContain("20 Eva");
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(savedMarks(db, matchId)).not.toContain(`${ana}:P2=sub`);
  });

  it("RF-057 RF-085: closing the match with a question pending and actions refused leaves a new openMatch with nothing pending and every action working", () => {
    const { store, db, matchId, teamId, entryIds } = openedSession(8, FULL_P2);
    const reserva = createPlayer(db, { teamId, name: "Reserva", number: "20" });
    store.getState().tapCell(cellAt(entryIds[0] ?? 0, "P2"));
    expect(store.getState().addOvertime()).toEqual(UNCHANGED);
    store.getState().closeMatch();
    store.getState().openMatch(matchId);
    expect(store.getState().pending).toBeNull();
    expect(store.getState().addOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().removeLastOvertime()).toEqual({ kind: "saved" });
    expect(store.getState().addToCallUp(reserva.id)).toEqual({ kind: "saved" });
    expect(store.getState().removeFromCallUp(entryIds[7] ?? 0)).toEqual({
      kind: "saved",
    });
    expect(
      store.getState().createPlayerInMatch({ name: "Marta", number: "5" }),
    ).toEqual({ kind: "saved" });
    expect(store.getState().tapCell(cellAt(entryIds[6] ?? 0, "P1")).kind).toBe(
      "saved",
    );
    expect(store.getState().undo()).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
  });

  it.each(KINDS)(
    "RF-057 RF-035 RF-085: createPlayerInMatch with invalid input and the %s pending is unchanged, not invalid, and creates nobody",
    (kind) => {
      const session = asked(kind);
      const before = stateOf(session);
      const { store } = session;
      expect(
        store.getState().createPlayerInMatch({ name: "", number: "" }),
      ).toEqual(UNCHANGED);
      expect(stateOf(session)).toEqual(before);
    },
  );
});
