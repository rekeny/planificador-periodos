import type { Format } from "@/domain/format";
import type { CallUpEntry, CellKey, Mark, MatchGrid } from "@/domain/grid";
import { legendItems, type LegendItem } from "@/domain/legend";
import { evaluateWarnings, type Warnings } from "@/domain/warnings";

type Marks = Partial<Record<CellKey, Mark>>;

const NOTHING: Warnings = {
  lightRedCells: new Set<CellKey>(),
  playersInRed: new Set<number>(),
  periodWarnings: {},
  ruleImpossible: false,
  callUpRange: null,
};

function callUpOf(count: number): CallUpEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    playerId: index + 1,
    name: `Player ${index + 1}`,
    number: String(index + 1),
  }));
}

function makeGrid(format: Format, players: number, marks: Marks): MatchGrid {
  return { format, overtimeCount: 0, callUp: callUpOf(players), marks };
}

// Juan is entry 1.
function juanMarks(
  starterPeriods: readonly number[],
  subPeriods: readonly number[] = [],
): Marks {
  const marks: Marks = {};
  for (const n of starterPeriods) marks[`1:P${n}`] = "starter";
  for (const n of subPeriods) marks[`1:P${n}`] = "sub";
  return marks;
}

const LIGHT_RED: Partial<Warnings> = {
  lightRedCells: new Set<CellKey>(["1:P4"]),
};
const IN_RED: Partial<Warnings> = { playersInRed: new Set<number>([1]) };
const INCOMPLETE: Partial<Warnings> = { periodWarnings: { P1: "incomplete" } };
const INCONSISTENT: Partial<Warnings> = {
  periodWarnings: { P3: "inconsistent" },
};

describe("legendItems, which items are shown", () => {
  it.each<[string, Partial<Warnings>, LegendItem[]]>([
    ["nothing present", {}, []],
    ["a light red cell", LIGHT_RED, ["lightRedCell"]],
    ["a player in red", IN_RED, ["playerInRed"]],
    ["an incomplete period", INCOMPLETE, ["incompletePeriod"]],
    ["an inconsistent period", INCONSISTENT, ["inconsistentPeriod"]],
    [
      "a light red cell and an inconsistent period",
      { ...LIGHT_RED, ...INCONSISTENT },
      ["lightRedCell", "inconsistentPeriod"],
    ],
    [
      "a player in red and an incomplete period",
      { ...IN_RED, ...INCOMPLETE },
      ["playerInRed", "incompletePeriod"],
    ],
  ])("RF-087: %s gives exactly its items", (_label, partial, expected) => {
    expect(legendItems({ ...NOTHING, ...partial })).toEqual(expected);
  });

  it("RF-087: with all four marks present the items come in the fixed order", () => {
    const warnings: Warnings = {
      ...NOTHING,
      lightRedCells: new Set<CellKey>(["1:P4"]),
      playersInRed: new Set<number>([1]),
      periodWarnings: { P1: "inconsistent", P2: "incomplete" },
    };
    expect(legendItems(warnings)).toEqual([
      "lightRedCell",
      "playerInRed",
      "incompletePeriod",
      "inconsistentPeriod",
    ]);
  });

  it("RF-087: many marks of one kind give a single item, never a repeated one", () => {
    const warnings: Warnings = {
      ...NOTHING,
      lightRedCells: new Set<CellKey>(["1:P4", "1:P5", "2:P4"]),
      playersInRed: new Set<number>([1, 2]),
      periodWarnings: { P1: "incomplete", P2: "incomplete", P3: "incomplete" },
    };
    expect(legendItems(warnings)).toEqual([
      "lightRedCell",
      "playerInRed",
      "incompletePeriod",
    ]);
  });

  it("RF-087: the general warnings (rule impossible, call-up range) are not legend items", () => {
    const warnings: Warnings = {
      ...NOTHING,
      ruleImpossible: true,
      callUpRange: { format: 6, min: 9, max: 12, count: 13 },
    };
    expect(legendItems(warnings)).toEqual([]);
  });

  it("RF-087: the same warnings always give the same legend", () => {
    const warnings = { ...NOTHING, ...LIGHT_RED, ...INCOMPLETE };
    expect(legendItems(warnings)).toEqual(legendItems(warnings));
  });
});

describe("legendItems, from real grids", () => {
  it("RF-087 E-027: in the situation of E-002 the legend has the light red cell, «!» and «≠», and not the player in red", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2], [3])));
    const items = legendItems(warnings);
    expect(items).toEqual([
      "lightRedCell",
      "incompletePeriod",
      "inconsistentPeriod",
    ]);
    expect(items).not.toContain("playerInRed");
  });

  it("RF-087 RF-063: with a player in red the legend explains the red player too", () => {
    const warnings = evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3, 4])));
    expect(legendItems(warnings)).toEqual([
      "lightRedCell",
      "playerInRed",
      "incompletePeriod",
    ]);
  });

  it.each<[string, Format, number]>([
    ["E-015: 8 players in 6 periods", 6, 8],
    ["E-030: 13 players in 6 periods", 6, 13],
  ])(
    "RF-087 RF-061 %s with no marks: only «!» is explained, the general warnings add nothing",
    (_label, format, players) => {
      const warnings = evaluateWarnings(makeGrid(format, players, {}));
      expect(legendItems(warnings)).toEqual(["incompletePeriod"]);
    },
  );

  it("RF-061 RF-087: a grid with no warning has no legend", () => {
    // 8 periods, 12 players: six with 3 X and six with 2 X in the window.
    const marks: Marks = {};
    for (let period = 0; period < 6; period += 1) {
      for (let slot = 0; slot < 5; slot += 1) {
        marks[`${((period * 5 + slot) % 12) + 1}:P${period + 1}`] = "starter";
      }
    }
    const warnings = evaluateWarnings(makeGrid(8, 12, marks));
    expect(legendItems(warnings)).toEqual([]);
  });

  it("RF-087: after the last light red cell disappears its meaning leaves the legend", () => {
    const before = legendItems(
      evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3]))),
    );
    const after = legendItems(
      evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2]))),
    );
    expect(before).toContain("lightRedCell");
    expect(after).not.toContain("lightRedCell");
    expect(after).toEqual(["incompletePeriod"]);
  });

  it("RF-087: removing the only inconsistent period removes «≠» from the legend", () => {
    const withSub = legendItems(
      evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2], [3]))),
    );
    const withoutSub = legendItems(
      evaluateWarnings(makeGrid(6, 10, juanMarks([1, 2, 3]))),
    );
    expect(withSub).toContain("inconsistentPeriod");
    expect(withoutSub).not.toContain("inconsistentPeriod");
  });
});
