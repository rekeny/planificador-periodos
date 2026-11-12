import {
  array,
  assert,
  constantFrom,
  integer,
  property,
  tuple,
} from "fast-check";
import {
  columnKey,
  gridColumns,
  isRuleWindowColumn,
  type Column,
} from "@/domain/column";
import type { Format } from "@/domain/format";
import type { CellKey, Mark, MatchGrid } from "@/domain/grid";
import { periodWarning, type PeriodWarning } from "@/domain/period-warnings";

type Marks = Partial<Record<CellKey, Mark>>;

type Choice = Mark | undefined;
type Draft = readonly [Format, number, number, readonly Choice[]];

const MAX_PLAYERS = 13;
const MAX_COLUMNS = 8 + 3;

const draftArbitrary = tuple(
  constantFrom<Format>(4, 6, 8),
  integer({ min: 0, max: 3 }),
  integer({ min: 0, max: MAX_PLAYERS }),
  array(constantFrom<Choice>("starter", "sub", undefined, undefined), {
    minLength: MAX_PLAYERS * MAX_COLUMNS,
    maxLength: MAX_PLAYERS * MAX_COLUMNS,
  }),
);

// Random marks, never putting a sixth X in a period (the only hard limit).
function buildGrid(draft: Draft): MatchGrid {
  const [format, overtimeCount, players, choices] = draft;
  const callUp = Array.from({ length: players }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
  const marks: Marks = {};
  gridColumns(format, overtimeCount).forEach((column, columnIndex) => {
    let starters = 0;
    for (let row = 0; row < players; row += 1) {
      const choice = choices[columnIndex * MAX_PLAYERS + row];
      if (choice === undefined) continue;
      if (choice === "starter" && starters === 5) continue;
      if (choice === "starter") starters += 1;
      marks[`${row + 1}:${columnKey(column)}`] = choice;
    }
  });
  return { format, overtimeCount, callUp, marks };
}

function starterTotal(grid: MatchGrid, column: Column): number {
  const key = columnKey(column);
  return grid.callUp.filter(
    (entry) => grid.marks[`${entry.id}:${key}`] === "starter",
  ).length;
}

function expectedWarning(
  grid: MatchGrid,
  column: Column,
): PeriodWarning | null {
  const key = columnKey(column);
  const states = grid.callUp.map((entry) => grid.marks[`${entry.id}:${key}`]);
  const starters = states.filter((state) => state === "starter").length;
  if (starters >= 5) return null;
  if (states.includes("sub")) return "inconsistent";
  return isRuleWindowColumn(grid.format, column) ? "incomplete" : null;
}

describe("periodWarning, properties", () => {
  it("RF-065 RF-066: a column with 5 X gives no warning, whatever else it holds", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        return gridColumns(grid.format, grid.overtimeCount)
          .filter((column) => starterTotal(grid, column) === 5)
          .every((column) => periodWarning(grid, column) === null);
      }),
    );
  });

  it("RF-065 RF-066: every column follows the rule, inconsistent first, incomplete only in the window", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        return gridColumns(grid.format, grid.overtimeCount).every(
          (column) =>
            periodWarning(grid, column) === expectedWarning(grid, column),
        );
      }),
    );
  });

  it("RF-065: a free period or an overtime is never incomplete", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        return gridColumns(grid.format, grid.overtimeCount)
          .filter((column) => !isRuleWindowColumn(grid.format, column))
          .every((column) => periodWarning(grid, column) !== "incomplete");
      }),
    );
  });

  it("RF-065 RF-066: evaluating the same grid twice gives the same result and leaves the grid unchanged", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        const before = JSON.stringify(grid);
        const column: Column = { kind: "period", number: 1 };
        const first = periodWarning(grid, column);
        return (
          first === periodWarning(grid, column) &&
          JSON.stringify(grid) === before
        );
      }),
    );
  });
});
