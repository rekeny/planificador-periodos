import {
  array,
  assert,
  constantFrom,
  integer,
  property,
  tuple,
} from "fast-check";
import { ruleWindowColumns } from "@/domain/column";
import { FORMAT_RULES, type Format } from "@/domain/format";
import {
  cellKey,
  starterCount,
  type CellKey,
  type Mark,
  type MatchGrid,
} from "@/domain/grid";
import { isRuleImpossible } from "@/domain/rule-feasibility";
import { isRuleWindowComplete, playersInRed } from "@/domain/rule-window";

const MAX_PLAYERS = 13;
const MAX_WINDOW = 6;

type Choice = Mark | undefined;
type Draft = readonly [Format, number, readonly Choice[]];

const draftArbitrary = tuple(
  constantFrom<Format>(4, 6, 8),
  integer({ min: 0, max: MAX_PLAYERS }),
  array(constantFrom<Choice>("starter", "starter", "sub", undefined), {
    minLength: MAX_PLAYERS * MAX_WINDOW,
    maxLength: MAX_PLAYERS * MAX_WINDOW,
  }),
);

// Random marks in the rule window only, never a sixth X in a period (the only hard limit).
function buildGrid([format, players, choices]: Draft): MatchGrid {
  const callUp = Array.from({ length: players }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
  const columns = ruleWindowColumns(format);
  const marks: Partial<Record<CellKey, Mark>> = {};
  const empty: MatchGrid = { format, overtimeCount: 0, callUp, marks };
  callUp.forEach((entry, row) => {
    columns.forEach((column, col) => {
      const choice = choices[row * MAX_WINDOW + col];
      const cell = { entryId: entry.id, column };
      if (choice === "starter" && starterCount(empty, column) >= 5) return;
      if (choice !== undefined) marks[cellKey(cell)] = choice;
    });
  });
  return empty;
}

describe("isRuleImpossible, properties", () => {
  it("RF-063 RF-064 RF-067: a player in red always comes with the rule impossible warning", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        if (playersInRed(grid).length > 0) {
          expect(isRuleImpossible(grid)).toBe(true);
        }
      }),
    );
  });

  it("RF-003 RF-067: a complete window with a player below the played minimum is impossible", () => {
    assert(
      property(draftArbitrary, (draft) => {
        const grid = buildGrid(draft);
        const { minPlayed } = FORMAT_RULES[grid.format].ruleWindow;
        const short = grid.callUp.some(
          (entry) =>
            ruleWindowColumns(grid.format).filter(
              (column) =>
                grid.marks[cellKey({ entryId: entry.id, column })] ===
                "starter",
            ).length < minPlayed,
        );
        if (isRuleWindowComplete(grid) && short) {
          expect(isRuleImpossible(grid)).toBe(true);
        }
      }),
    );
  });

  it("RF-010 RF-067: any call-up below 5 players is impossible whatever is marked", () => {
    assert(
      property(
        draftArbitrary.filter(([, players]) => players < 5),
        (draft) => {
          expect(isRuleImpossible(buildGrid(draft))).toBe(true);
        },
      ),
    );
  });
});
