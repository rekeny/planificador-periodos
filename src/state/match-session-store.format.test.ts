// T070: the format change of the open match on the session store (RF-038, RF-039, RF-040, RF-041,
// RF-056, RF-082, RF-085, RF-086, E-016). Real in-memory SQLite and the real domain. `changeFormat`
// is synchronous and returns a SaveResult. The confirmation itself belongs to the interface (T096).
import type { Format } from "@/domain/format";
import { loadGridRecords } from "@/data/grid-repository";
import type { AppDatabase } from "@/data/database-types";
import { evaluateWarnings } from "@/domain/warnings";
import {
  breakReads,
  rowLabels,
} from "../../tests/support/match-session-fixtures";
import {
  failMarkWrites,
  failOvertimeWrites,
  openedSession,
  savedGrid,
  savedMarks,
  snapshotOf,
  type SeedMark,
} from "../../tests/support/match-session-marks";
import { reopened } from "../../tests/support/match-session-questions";

const SAVED = { kind: "saved" } as const;
const UNCHANGED = { kind: "unchanged" } as const;

const savedFormat = (db: AppDatabase, matchId: number) =>
  loadGridRecords(db, matchId)?.match.format;

/** One X in every period of the format, on rotating rows, plus a circled X in overtime 1. */
function marksFor(format: Format): SeedMark[] {
  const periods = Array.from({ length: format }, (_, i): SeedMark => {
    return [i % 8, `P${i + 1}`, "starter"];
  });
  return [...periods, [7, "OT1", "sub"]];
}

/** The marks the database must hold after the change: the periods that exist, and the overtime. */
function keptAfter(
  entryIds: readonly number[],
  from: Format,
  to: Format,
): string[] {
  return marksFor(from)
    .filter(([, key]) => key.startsWith("OT") || Number(key.slice(1)) <= to)
    .map(([row, key, mark]) => `${entryIds[row] ?? 0}:${key}=${mark}`)
    .sort();
}

const CHANGES: [from: Format, to: Format][] = [
  [8, 4],
  [8, 6],
  [6, 4],
  [4, 6],
  [6, 8],
  [4, 8],
];

function withMarks(format: Format) {
  return openedSession(8, marksFor(format), { format, overtimeCount: 1 });
}

describe("match session, changing the format", () => {
  it("RF-038 RF-039 RF-040 E-016: 8 to 4 confirmed deletes the marks of P5 to P8, keeps P1 to P4 and the overtime, and the database holds the same", () => {
    const { store, db, matchId, entryIds } = withMarks(8);
    expect(store.getState().changeFormat(4)).toEqual(SAVED);
    const { grid, view } = store.getState();
    expect(grid?.format).toBe(4);
    expect(view?.format).toBe(4);
    expect(savedMarks(db, matchId)).toEqual(keptAfter(entryIds, 8, 4));
    expect(savedMarks(db, matchId).some((m) => /:P[5-8]=/.test(m))).toBe(false);
    expect(savedMarks(db, matchId)).toContain(`${entryIds[7]}:OT1=sub`);
    expect(savedFormat(db, matchId)).toBe(4);
    expect(store.getState().saveFailed).toBe(false);
  });

  it("RF-040 RF-041 RF-082 RF-085 E-016: after 8 to 4 a new store on the same database reads the same grid, warnings and view as the published ones", () => {
    const { store, db, matchId } = withMarks(8);
    store.getState().changeFormat(4);
    const fresh = reopened(db, matchId).getState();
    expect(fresh.grid).toEqual(store.getState().grid);
    expect(fresh.grid).toEqual(savedGrid(db, matchId));
    expect(fresh.warnings).toEqual(store.getState().warnings);
    expect(fresh.view).toEqual(store.getState().view);
  });

  it.each(CHANGES)(
    "RF-038 RF-040 RF-041: %i to %i periods keeps the marks of the periods that remain and the overtime marks, in the grid and in the database",
    (from, to) => {
      const { store, db, matchId, entryIds } = withMarks(from);
      expect(store.getState().changeFormat(to)).toEqual(SAVED);
      expect(store.getState().grid?.format).toBe(to);
      expect(savedMarks(db, matchId)).toEqual(keptAfter(entryIds, from, to));
      expect(savedGrid(db, matchId)).toEqual(store.getState().grid);
      expect(store.getState().grid?.overtimeCount).toBe(1);
      expect(
        store.getState().view?.columns.map((column) => column.key),
      ).toEqual([...Array.from({ length: to }, (_, i) => `P${i + 1}`), "OT1"]);
    },
  );

  it("RF-041: a 6-period match with 1 overtime changed to 4 periods shows P1 to P4 followed by the overtime with its mark", () => {
    const { store } = withMarks(6);
    store.getState().changeFormat(4);
    const row = store.getState().view?.rows[7];
    expect(row?.cells.map((cell) => cell.state)).toEqual([
      "empty",
      "empty",
      "empty",
      "empty",
      "sub",
    ]);
  });

  it("RF-038 RF-082: a format change with no marks to lose is still saved at once, and the warnings and view are recomputed", () => {
    const { store, db, matchId } = openedSession(8, [], { format: 6 });
    expect(store.getState().changeFormat(8)).toEqual(SAVED);
    const { grid, warnings, view } = store.getState();
    expect(savedFormat(db, matchId)).toBe(8);
    expect(warnings).toEqual(grid && evaluateWarnings(grid));
    expect(view?.format).toBe(8);
    expect(rowLabels(store)).toHaveLength(8);
  });
});

describe("match session, choosing the format the match already has", () => {
  it.each([4, 6, 8] as Format[])(
    "RF-039: choosing the current format, %i, is unchanged: with every read and write failing nothing is read, nothing is written and saveFailed stays false",
    (format) => {
      const { store, db, matchId } = openedSession(8, marksFor(format), {
        format,
        overtimeCount: 1,
      });
      const before = snapshotOf(store, db, matchId);
      breakReads(db, "players");
      failOvertimeWrites(db);
      failMarkWrites(db, "DELETE");
      expect(store.getState().changeFormat(format)).toEqual(UNCHANGED);
      expect(snapshotOf(store, db, matchId)).toEqual(before);
      expect(store.getState().saveFailed).toBe(false);
    },
  );

  it("RF-039 RF-085: choosing the current format does not clear a saveFailed that was already there", () => {
    const { store } = openedSession(8, [], { format: 6 });
    store.setState({ saveFailed: true });
    expect(store.getState().changeFormat(6)).toEqual(UNCHANGED);
    expect(store.getState().saveFailed).toBe(true);
  });

  it("RF-039: after a change, choosing the new format again is unchanged and a different one saves", () => {
    const { store } = openedSession(8, [], { format: 6 });
    expect(store.getState().changeFormat(8)).toEqual(SAVED);
    expect(store.getState().changeFormat(8)).toEqual(UNCHANGED);
    expect(store.getState().changeFormat(6)).toEqual(SAVED);
    expect(store.getState().grid?.format).toBe(6);
  });

  it("RF-038: with no match open, changeFormat is unchanged and writes nothing", () => {
    const { store, db, matchId } = openedSession(8, [], { format: 6 });
    store.getState().closeMatch();
    expect(store.getState().changeFormat(8)).toEqual(UNCHANGED);
    expect(savedFormat(db, matchId)).toBe(6);
    expect(store.getState().grid).toBeNull();
  });
});

describe("match session, the format options of the view", () => {
  it.each([4, 6, 8] as Format[])(
    "RF-038: a %i-period match lists 4, 6 and 8 with isCurrent only on its own format",
    (format) => {
      const { store } = openedSession(8, [], { format });
      expect(store.getState().view?.formatOptions).toEqual(
        ([4, 6, 8] as Format[]).map((option) => ({
          format: option,
          isCurrent: option === format,
        })),
      );
    },
  );

  it("RF-038 RF-039: after a change from 6 to 8 the current option is 8, and after a failed change it stays on the old one", () => {
    const { store, db } = openedSession(8, [], { format: 6 });
    const current = () =>
      store
        .getState()
        .view?.formatOptions.filter((option) => option.isCurrent)
        .map((option) => option.format);
    store.getState().changeFormat(8);
    expect(current()).toEqual([8]);
    failOvertimeWrites(db);
    expect(store.getState().changeFormat(4)).toEqual({ kind: "saveFailed" });
    expect(current()).toEqual([8]);
  });
});
