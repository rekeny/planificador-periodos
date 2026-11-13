// T042: call-up actions that do nothing or fail to save (RF-032, RF-033, RF-035, RF-085). Writes
// fail through real SQLite triggers and the unique index; nothing is mocked. A failed save leaves
// the grid, warnings, view, history and database as they were and sets saveFailed.
import { createMatch } from "@/data/match-repository";
import {
  allowWrites,
  failWrites,
  savedCallUp,
  savedEntryIds,
  savedMarkKeys,
  savedTeam,
  sessionWithBench,
  undoEntryOf,
} from "../../tests/support/match-session-call-up";
import { writeMark } from "../../tests/support/match-session-fixtures";
import { entryOf, matchValues } from "../../tests/data/match-fixtures";

const CALLED_UP = [
  ["Eva", "10"],
  ["Ana", "3"],
  ["Bea", "7"],
] as const;
const BENCH = [["Carla", "5"]] as const;

function opened() {
  const session = sessionWithBench(CALLED_UP, BENCH);
  session.store.getState().openMatch(session.matchId);
  return session;
}

describe("match session, a call-up action with nothing to do", () => {
  it("RF-033 RF-085: removing an entry that is already gone is unchanged: nothing saved, no error, saveFailed as it was", () => {
    const { store, db, matchId, entryIds } = opened();
    const ana = entryIds[1] ?? 0;
    expect(store.getState().removeFromCallUp(ana)).toEqual({ kind: "saved" });
    const before = store.getState();
    expect(store.getState().removeFromCallUp(ana)).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().grid).toEqual(before.grid);
    expect(store.getState().view).toEqual(before.view);
    expect(store.getState().saveFailed).toBe(false);
    expect(savedCallUp(db, matchId)).toEqual(["10 Eva", "7 Bea"]);
  });

  it("RF-033 RF-085: unchanged does not clear a saveFailed that was already there", () => {
    const { store } = opened();
    store.setState({ saveFailed: true });
    expect(store.getState().removeFromCallUp(98765)).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-033: an entry of another match is not in this grid, so removing it is unchanged and the other match keeps it", () => {
    const { store, db, teamId, matchId, players } = opened();
    const other = createMatch(db, matchValues(teamId), players.map(entryOf));
    const otherEntries = savedEntryIds(db, other.id);
    expect(store.getState().removeFromCallUp(otherEntries[0] ?? 0)).toEqual({
      kind: "unchanged",
    });
    expect(savedEntryIds(db, other.id)).toEqual(otherEntries);
    expect(savedCallUp(db, matchId)).toHaveLength(3);
  });

  it("RF-032 RF-033 RF-035: with no match open, every call-up action is unchanged and writes nothing", () => {
    const { store, db, matchId, entryIds, benched, teamId } = sessionWithBench(
      CALLED_UP,
      BENCH,
    );
    expect(store.getState().addToCallUp(benched[0]?.id ?? 0)).toEqual({
      kind: "unchanged",
    });
    expect(store.getState().removeFromCallUp(entryIds[0] ?? 0)).toEqual({
      kind: "unchanged",
    });
    expect(
      store.getState().createPlayerInMatch({ name: "Nuria", number: "20" }),
    ).toEqual({ kind: "unchanged" });
    expect(savedCallUp(db, matchId)).toHaveLength(3);
    expect(savedTeam(db, teamId)).toHaveLength(4);
    expect(store.getState().saveFailed).toBe(false);
  });
});

describe("match session, a call-up save that fails", () => {
  it("RF-032 RF-085: adding the same player twice returns saveFailed the second time and the view stays as it was", () => {
    const { store, db, matchId, benched } = opened();
    const carla = benched[0]?.id ?? 0;
    expect(store.getState().addToCallUp(carla)).toEqual({ kind: "saved" });
    const before = store.getState();
    expect(store.getState().addToCallUp(carla)).toEqual({
      kind: "saveFailed",
    });
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().grid).toEqual(before.grid);
    expect(store.getState().view).toEqual(before.view);
    expect(store.getState().warnings).toEqual(before.warnings);
    expect(savedCallUp(db, matchId)).toHaveLength(4);
  });

  it("RF-032 RF-085: a failing write on add gives saveFailed, no new row and no entry, and the next good change clears the flag", () => {
    const { store, db, matchId, benched } = opened();
    const before = store.getState();
    failWrites(db, "call_up_entries", "INSERT");
    expect(store.getState().addToCallUp(benched[0]?.id ?? 0)).toEqual({
      kind: "saveFailed",
    });
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().grid).toEqual(before.grid);
    expect(store.getState().view).toEqual(before.view);
    expect(savedCallUp(db, matchId)).toHaveLength(3);
    allowWrites(db, "call_up_entries", "INSERT");
    expect(store.getState().addToCallUp(benched[0]?.id ?? 0)).toEqual({
      kind: "saved",
    });
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().view?.rows).toHaveLength(4);
  });

  it("RF-034 RF-085 RF-086: a failing write on remove keeps the row, its marks and the history, and sets saveFailed", () => {
    const { store, db, matchId, entryIds } = opened();
    const ana = entryIds[1] ?? 0;
    writeMark(db, ana, "P", 1, "starter");
    store.getState().openMatch(matchId);
    const history = [undoEntryOf(ana, 1)];
    store.setState({ history });
    const before = store.getState();
    failWrites(db, "call_up_entries", "DELETE");
    expect(store.getState().removeFromCallUp(ana)).toEqual({
      kind: "saveFailed",
    });
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().grid).toEqual(before.grid);
    expect(store.getState().view).toEqual(before.view);
    expect(store.getState().history).toEqual(history);
    expect(savedCallUp(db, matchId)).toHaveLength(3);
    expect(savedMarkKeys(db, matchId)).toEqual([`${ana}:P1`]);
    allowWrites(db, "call_up_entries", "DELETE");
    expect(store.getState().removeFromCallUp(ana)).toEqual({ kind: "saved" });
    expect(store.getState().saveFailed).toBe(false);
    expect(store.getState().history).toEqual([]);
  });

  it("RF-035 RF-085: a failing write of the entry when creating a player leaves no player, no entry and the view as it was", () => {
    const { store, db, matchId, teamId } = opened();
    const before = store.getState();
    failWrites(db, "call_up_entries", "INSERT");
    expect(
      store.getState().createPlayerInMatch({ name: "Nuria", number: "20" }),
    ).toEqual({ kind: "saveFailed" });
    expect(store.getState().saveFailed).toBe(true);
    expect(store.getState().view).toEqual(before.view);
    expect(store.getState().grid).toEqual(before.grid);
    expect(savedTeam(db, teamId)).toHaveLength(4);
    expect(savedCallUp(db, matchId)).toHaveLength(3);
  });

  it("RF-035 RF-085: a failing write of the player gives saveFailed and nothing is created", () => {
    const { store, db, matchId, teamId } = opened();
    failWrites(db, "players", "INSERT");
    expect(
      store.getState().createPlayerInMatch({ name: "Nuria", number: "20" }),
    ).toEqual({ kind: "saveFailed" });
    expect(store.getState().saveFailed).toBe(true);
    expect(savedTeam(db, teamId)).toHaveLength(4);
    expect(savedCallUp(db, matchId)).toHaveLength(3);
  });
});
