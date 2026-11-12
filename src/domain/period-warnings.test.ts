import { type Column, type ColumnKey } from "@/domain/column";
import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { periodWarning } from "@/domain/period-warnings";

type Marks = Partial<Record<CellKey, Mark>>;

function callUpOf(count: number): CallUpEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: index === 0 ? "Juan" : `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

function makeGrid(
  format: Format,
  marks: Marks,
  options: { players?: number; overtimeCount?: number } = {},
): MatchGrid {
  return {
    format,
    overtimeCount: options.overtimeCount ?? 0,
    callUp: callUpOf(options.players ?? 10),
    marks,
  };
}

function period(number: number): Column {
  return { kind: "period", number };
}

function overtime(number: number): Column {
  return { kind: "overtime", number };
}

// Puts a mark on each listed entry, in the column with the given key.
function mark(
  marks: Marks,
  column: ColumnKey,
  kind: Mark,
  entryIds: readonly number[],
): void {
  for (const id of entryIds) marks[`${id}:${column}`] = kind;
}

// E-007: 10 players, no subs, every player has 2 X in P1-P4 and P5 and P6 are empty.
function e007Marks(): Marks {
  const marks: Marks = {};
  mark(marks, "P1", "starter", [1, 2, 3, 4, 5]);
  mark(marks, "P2", "starter", [6, 7, 8, 9, 10]);
  mark(marks, "P3", "starter", [1, 2, 3, 4, 5]);
  mark(marks, "P4", "starter", [6, 7, 8, 9, 10]);
  return marks;
}

// A column with `starters` X (entries 1..starters) and `subs` circled X (the next entries).
function columnMarks(column: ColumnKey, starters: number, subs: number): Marks {
  const marks: Marks = {};
  const ids = Array.from({ length: starters + subs }, (_, i) => i + 1);
  mark(marks, column, "starter", ids.slice(0, starters));
  mark(marks, column, "sub", ids.slice(starters));
  return marks;
}

describe("periodWarning, spec examples", () => {
  it.each([
    [5, "incomplete"],
    [6, null],
  ] as const)(
    "RF-065 E-007: with P1-P4 full and P5 and P6 empty, P%i gives %s",
    (number, expected) => {
      const grid = makeGrid(6, e007Marks());
      expect(periodWarning(grid, period(number))).toBe(expected);
    },
  );

  it.each([1, 2, 3, 4])(
    "RF-065 E-007: P%i with 5 X shows no warning",
    (number) => {
      const grid = makeGrid(6, e007Marks());
      expect(periodWarning(grid, period(number))).toBeNull();
    },
  );

  it.each([
    [1, "incomplete"],
    [2, "incomplete"],
    [3, "inconsistent"],
    [4, "incomplete"],
    [5, "incomplete"],
    [6, null],
  ] as const)(
    "RF-065 RF-066 E-002: Juan with X in P1 and P2 and a sub in P3, P%i gives %s",
    (number, expected) => {
      const grid = makeGrid(6, {
        "1:P1": "starter",
        "1:P2": "starter",
        "1:P3": "sub",
      });
      expect(periodWarning(grid, period(number))).toBe(expected);
    },
  );

  it.each([
    [1, "incomplete"],
    [2, "inconsistent"],
    [3, "incomplete"],
    [4, null],
  ] as const)(
    "RF-065 RF-066 E-010: in 4 periods, Juan with an X in P1 and a sub in P2, P%i gives %s",
    (number, expected) => {
      const grid = makeGrid(4, { "1:P1": "starter", "1:P2": "sub" });
      expect(periodWarning(grid, period(number))).toBe(expected);
    },
  );

  it("RF-066 E-013: after removing Eva's X from P3 (5 X and a sub), P3 is inconsistent and not incomplete", () => {
    const grid = makeGrid(6, columnMarks("P3", 4, 1)); // Eva's X is gone: 4 X and the sub stay
    expect(periodWarning(grid, period(3))).toBe("inconsistent");
  });

  it("RF-066 E-013: before removing Eva's X, P3 with 5 X and a sub shows no warning", () => {
    const grid = makeGrid(6, columnMarks("P3", 5, 1));
    expect(periodWarning(grid, period(3))).toBeNull();
  });
});

describe("periodWarning, boundaries and outside the rules", () => {
  it.each([
    [0, "incomplete"],
    [1, "incomplete"],
    [4, "incomplete"],
    [5, null],
  ] as const)(
    "RF-065: a window period with %i X and no sub gives %s",
    (starters, expected) => {
      const grid = makeGrid(6, columnMarks("P2", starters, 0));
      expect(periodWarning(grid, period(2))).toBe(expected);
    },
  );

  it.each([0, 1, 4, 5])(
    "RF-065: a free period with %i X and no sub never gives a warning",
    (starters) => {
      const grid = makeGrid(6, columnMarks("P6", starters, 0));
      expect(periodWarning(grid, period(6))).toBeNull();
    },
  );

  it.each([
    [4, 3, "incomplete"],
    [4, 4, null],
    [6, 5, "incomplete"],
    [6, 6, null],
    [8, 6, "incomplete"],
    [8, 7, null],
  ] as const)(
    "RF-065: in %i periods an empty P%i gives %s (window edge)",
    (format, number, expected) => {
      const grid = makeGrid(format, {});
      expect(periodWarning(grid, period(number))).toBe(expected);
    },
  );

  it("RF-065: an empty overtime gives no warning", () => {
    const grid = makeGrid(6, {}, { overtimeCount: 2 });
    expect(periodWarning(grid, overtime(1))).toBeNull();
    expect(periodWarning(grid, overtime(2))).toBeNull();
  });

  it("RF-065: an overtime with 4 X and no sub gives no warning", () => {
    const grid = makeGrid(6, columnMarks("OT1", 4, 0), { overtimeCount: 1 });
    expect(periodWarning(grid, overtime(1))).toBeNull();
  });

  it("RF-066: P6 (free period) with 4 X and a sub is inconsistent", () => {
    const grid = makeGrid(6, columnMarks("P6", 4, 1));
    expect(periodWarning(grid, period(6))).toBe("inconsistent");
  });

  it("RF-066: an overtime with 4 X and a sub is inconsistent", () => {
    const grid = makeGrid(6, columnMarks("OT1", 4, 1), { overtimeCount: 1 });
    expect(periodWarning(grid, overtime(1))).toBe("inconsistent");
  });

  it.each([
    [0, 1],
    [0, 3],
    [2, 2],
    [4, 1],
  ] as const)(
    "RF-066: a window period with %i X and %i subs is inconsistent, not incomplete",
    (starters, subs) => {
      const grid = makeGrid(6, columnMarks("P4", starters, subs));
      expect(periodWarning(grid, period(4))).toBe("inconsistent");
    },
  );

  it.each(["P", "OT"] as const)(
    "RF-066: 5 X and a sub in %s gives no warning",
    (key) => {
      const column = key === "P" ? period(6) : overtime(1);
      const grid = makeGrid(6, columnMarks(key === "P" ? "P6" : "OT1", 5, 1), {
        overtimeCount: 1,
      });
      expect(periodWarning(grid, column)).toBeNull();
    },
  );

  it("RF-066: only the column with the sub is inconsistent; the other columns are unaffected", () => {
    const grid = makeGrid(6, columnMarks("P3", 4, 1));
    expect(periodWarning(grid, period(2))).toBe("incomplete");
    expect(periodWarning(grid, period(6))).toBeNull();
  });
});
