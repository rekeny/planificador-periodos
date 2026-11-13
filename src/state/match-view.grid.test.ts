// T050: columns, cells and counters of buildMatchView (RF-042, RF-043, RF-070, RF-071, E-014,
// E-020). It is pure. Colours, legend and warnings are T058: only the fields named here are read.
import { cellState, type Cell } from "@/domain/grid";
import { gridColumns } from "@/domain/column";
import { buildMatchView } from "@/state/match-view";
import { evaluateWarnings } from "@/domain/warnings";
import { gridWith, viewOf } from "../../tests/support/match-view-grid";

const keysOf = (view: ReturnType<typeof viewOf>) =>
  view.columns.map((column) => column.key);

describe("match view, columns", () => {
  it("RF-042: 6 periods and 1 overtime with 10 players give 10 rows and 7 columns, periods first and then the overtime", () => {
    const view = viewOf(gridWith({ players: 10, overtimeCount: 1 }));
    expect(view.rows).toHaveLength(10);
    expect(keysOf(view)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6", "OT1"]);
    expect(view.columns.map((c) => c.column)).toEqual(
      gridColumns(6, 1).map((c) => ({ kind: c.kind, number: c.number })),
    );
    expect(view.columns[6]?.column).toEqual({ kind: "overtime", number: 1 });
  });

  it("RF-042 RF-058: 4 periods give 4 columns, 8 periods and 3 overtimes give 11 (P1 to P8, then OT1 to OT3), 6 periods and no overtime give 6", () => {
    expect(keysOf(viewOf(gridWith({ format: 4 })))).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
    ]);
    expect(keysOf(viewOf(gridWith({ format: 8, overtimeCount: 3 })))).toEqual([
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "P6",
      "P7",
      "P8",
      "OT1",
      "OT2",
      "OT3",
    ]);
    expect(keysOf(viewOf(gridWith({ format: 6 })))).toHaveLength(6);
  });

  it("RF-042: the columns are there even with an empty call-up", () => {
    const view = viewOf(gridWith({ players: 0, format: 4, overtimeCount: 1 }));
    expect(view.rows).toEqual([]);
    expect(keysOf(view)).toEqual(["P1", "P2", "P3", "P4", "OT1"]);
  });
});

describe("match view, cells", () => {
  it("RF-042 RF-043: every row has one cell per column, in column order, with the key of its entry and column and the cell to tap", () => {
    const view = viewOf(gridWith({ players: 3, overtimeCount: 1 }));
    for (const row of view.rows) {
      expect(row.cells.map((c) => c.key)).toEqual(
        keysOf(view).map((column) => `${row.entryId}:${column}`),
      );
      expect(row.cells.map((c) => c.cell)).toEqual(
        view.columns.map((c) => ({ entryId: row.entryId, column: c.column })),
      );
    }
  });

  it("RF-043: each cell shows empty, X (starter) or circled X (sub) as the grid says, and a cell with no mark is empty", () => {
    const view = viewOf(
      gridWith({
        players: 2,
        overtimeCount: 1,
        marks: { "100:P1": "starter", "100:P3": "sub", "101:OT1": "starter" },
      }),
    );
    const states = (index: number) =>
      view.rows[index]?.cells.map((cell) => cell.state);
    expect(states(0)).toEqual([
      "starter",
      "empty",
      "sub",
      "empty",
      "empty",
      "empty",
      "empty",
    ]);
    expect(states(1)).toEqual([
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "starter",
    ]);
  });

  it("RF-043: every cell has exactly one of the three states and agrees with the grid, in a grid with every kind of mark", () => {
    const grid = gridWith({
      players: 6,
      format: 8,
      overtimeCount: 2,
      marks: {
        "100:P1": "starter",
        "101:P1": "sub",
        "102:P8": "sub",
        "103:OT2": "starter",
        "105:OT1": "sub",
      },
    });
    const view = viewOf(grid);
    expect(view.rows.flatMap((row) => row.cells)).toHaveLength(6 * 10);
    for (const cell of view.rows.flatMap((row) => row.cells)) {
      expect(["empty", "starter", "sub"]).toContain(cell.state);
      expect(cell.state).toBe(cellState(grid, cell.cell as Cell));
    }
  });

  it("RF-043 RF-070: a player with an X in every column still gets a counter, and every one of his cells is starter", () => {
    const marks = Object.fromEntries(
      ["P1", "P2", "P3", "P4", "P5", "P6", "OT1"].map((key) => [
        `100:${key}`,
        "starter" as const,
      ]),
    );
    const row = viewOf(gridWith({ players: 2, overtimeCount: 1, marks }))
      .rows[0];
    expect(row?.cells.map((cell) => cell.state)).toEqual(
      Array(7).fill("starter"),
    );
    expect(row?.counter).toEqual({ played: 7, rested: 0 });
  });
});

describe("match view, counters", () => {
  it("RF-070 RF-071 E-014: 6 periods and 1 overtime, X in P1, P3 and P6, a sub in P5, P2, P4 and the overtime empty: 3 played and 3 rested", () => {
    const view = viewOf(
      gridWith({
        players: 2,
        overtimeCount: 1,
        marks: {
          "100:P1": "starter",
          "100:P3": "starter",
          "100:P6": "starter",
          "100:P5": "sub",
        },
      }),
    );
    expect(view.rows[0]?.counter).toEqual({ played: 3, rested: 3 });
    expect(view.rows[1]?.counter).toEqual({ played: 0, rested: 7 });
  });

  it("RF-071: one circled X in 6 periods with no overtime gives played plus rested equal to 5", () => {
    const counter = viewOf(gridWith({ players: 1, marks: { "100:P4": "sub" } }))
      .rows[0]?.counter;
    expect(counter).toEqual({ played: 0, rested: 5 });
  });

  it("RF-070: an X in an overtime counts as played and an empty overtime as rested", () => {
    const view = viewOf(
      gridWith({
        players: 1,
        format: 4,
        overtimeCount: 2,
        marks: { "100:OT2": "starter" },
      }),
    );
    expect(view.rows[0]?.counter).toEqual({ played: 1, rested: 5 });
  });

  it("RF-070: the counter changes when a cell changes, and only in its own row", () => {
    const before = viewOf(
      gridWith({ players: 2, marks: { "100:P1": "starter" } }),
    );
    const after = viewOf(
      gridWith({
        players: 2,
        marks: { "100:P1": "starter", "100:P2": "starter" },
      }),
    );
    expect(before.rows.map((r) => r.counter)).toEqual([
      { played: 1, rested: 5 },
      { played: 0, rested: 6 },
    ]);
    expect(after.rows.map((r) => r.counter)).toEqual([
      { played: 2, rested: 4 },
      { played: 0, rested: 6 },
    ]);
  });

  it("RF-042 E-020: Luis 00, Ana 0, Eva 10, Bea 7 and Carla 0, in the order of the grid, each row with its own counter and cells", () => {
    // The session sorts the call-up (E-020); the builder keeps that order and must not look the
    // counter up by position: the ids here are not the order of the rows.
    const callUp = [
      { id: 7, playerId: 2, name: "Ana", number: "0" },
      { id: 3, playerId: 5, name: "Carla", number: "0" },
      { id: 9, playerId: 1, name: "Luis", number: "00" },
      { id: 4, playerId: 4, name: "Bea", number: "7" },
      { id: 1, playerId: 3, name: "Eva", number: "10" },
    ];
    const view = viewOf(
      gridWith({ callUp, marks: { "9:P1": "starter", "9:P2": "starter" } }),
    );
    expect(view.rows.map((r) => `${r.number} ${r.name}`)).toEqual([
      "0 Ana",
      "0 Carla",
      "00 Luis",
      "7 Bea",
      "10 Eva",
    ]);
    expect(view.rows.map((r) => r.counter.played)).toEqual([0, 0, 2, 0, 0]);
    expect(view.rows.map((r) => r.cells[0]?.key)).toEqual([
      "7:P1",
      "3:P1",
      "9:P1",
      "4:P1",
      "1:P1",
    ]);
    expect(view.rows[2]?.cells.map((c) => c.state).slice(0, 3)).toEqual([
      "starter",
      "starter",
      "empty",
    ]);
  });

  it("RF-042: 13 players give 13 rows, each with its cells and a counter", () => {
    const view = viewOf(gridWith({ players: 13, format: 8 }));
    expect(view.rows).toHaveLength(13);
    expect(view.rows.every((r) => r.cells.length === 8)).toBe(true);
    expect(view.rows.every((r) => r.counter.rested === 8)).toBe(true);
  });
});

describe("match view, purity", () => {
  it("RF-042 RF-070: building the view twice from the same source gives equal views and leaves the source as it was", () => {
    const grid = gridWith({
      players: 4,
      overtimeCount: 1,
      marks: { "100:P1": "starter", "101:OT1": "sub" },
    });
    const source = {
      matchId: 50,
      grid,
      warnings: evaluateWarnings(grid),
      history: [],
      teamPlayers: [],
    };
    const copy = JSON.stringify(grid);
    const first = buildMatchView(source);
    expect(first.columns).toHaveLength(7);
    expect(first).toEqual(buildMatchView(source));
    expect(JSON.stringify(grid)).toBe(copy);
  });
});
