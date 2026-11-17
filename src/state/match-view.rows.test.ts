// T041: the first version of buildMatchView, its rows (RF-042, RF-068, RF-019, E-020). The builder
// only puts domain results together: it takes the grid as it comes, already sorted by the session.
import type { Format } from "@/domain/format";
import type { MatchGrid } from "@/domain/grid";
import { evaluateWarnings } from "@/domain/warnings";
import { buildMatchView } from "@/state/match-view";

function viewOf(grid: MatchGrid, matchId = 41) {
  return buildMatchView({
    matchId,
    grid,
    warnings: evaluateWarnings(grid),
    history: [],
    teamPlayers: [],
  });
}

function gridOf(
  names: readonly (readonly [string, string])[],
  marks: MatchGrid["marks"] = {},
  format: Format = 6,
): MatchGrid {
  return {
    format,
    overtimeCount: 0,
    callUp: names.map(([name, number], row) => ({
      id: 100 + row,
      playerId: row + 1,
      name,
      number,
    })),
    marks,
  };
}

describe("match view, rows", () => {
  it("RF-042 E-020: the rows keep the order of the grid and carry the entry id, number and name of each entry", () => {
    const view = viewOf(
      gridOf([
        ["Ana", "0"],
        ["Luis", "00"],
        ["Bea", "7"],
      ]),
    );
    expect(
      view.rows.map(({ entryId, number, name }) => ({ entryId, number, name })),
    ).toEqual([
      { entryId: 100, number: "0", name: "Ana" },
      { entryId: 101, number: "00", name: "Luis" },
      { entryId: 102, number: "7", name: "Bea" },
    ]);
  });

  it("RF-042: the view carries the match id and the format of the grid", () => {
    const view = viewOf(gridOf([["Ana", "1"]], {}, 8), 7);
    expect(view.matchId).toBe(7);
    expect(view.format).toBe(8);
  });

  it("RF-042: hasMarks is true for a row with an X, a circled X or an overtime mark, and false for a row with none", () => {
    const view = viewOf(
      gridOf(
        [
          ["Ana", "1"],
          ["Bea", "2"],
          ["Carla", "3"],
          ["Dani", "4"],
        ],
        {
          "100:P2": "starter",
          "101:P5": "sub",
          "102:OT1": "starter",
        },
      ),
    );
    expect(view.rows.map((row) => row.hasMarks)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("RF-042: a grid with no players gives no rows", () => {
    expect(viewOf(gridOf([])).rows).toEqual([]);
  });

  it("RF-068: callUpRange comes from the warnings: none for 9 players in 6 periods, the warning for 13 and for 0", () => {
    const names = (count: number) =>
      Array.from({ length: count }, (_, i) => [`J${i}`, String(i)] as const);
    expect(viewOf(gridOf(names(9))).callUpRange).toBeNull();
    expect(viewOf(gridOf(names(13))).callUpRange).toEqual({
      format: 6,
      min: 9,
      max: 12,
      count: 13,
    });
    expect(viewOf(gridOf([])).callUpRange).toMatchObject({ count: 0 });
  });

  it("RF-019: the rows show the name and number of the call-up entry, whoever the team players are today", () => {
    const grid = gridOf([["Ana", "7"]]);
    const view = buildMatchView({
      matchId: 1,
      grid,
      warnings: evaluateWarnings(grid),
      history: [],
      teamPlayers: [
        { id: 1, teamId: 1, name: "Norma", number: "1", isActive: true },
      ],
    });
    expect(view.rows.map((r) => `${r.number} ${r.name}`)).toEqual(["7 Ana"]);
  });
});
