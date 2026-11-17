// T080: the three big support files are split into smaller ones, but each keeps its old path as
// the entry point, so the tests in src/domain/ import them unchanged. Types are checked by
// `tsc --noEmit`; this test checks the values (functions and constants) that exist at run time.
import * as actionInterpreter from "./action-interpreter";
import * as feasibilityOracle from "./feasibility-oracle";
import * as gridArbitraries from "./grid-arbitraries";

const EXPORTED_VALUES: (readonly [string, object, string[]])[] = [
  [
    "grid-arbitraries",
    gridArbitraries,
    [
      "MAX_OVERTIMES",
      "MAX_PLAYERS",
      "actionArbitrary",
      "actionsArbitrary",
      "balancedWindowGridArbitrary",
      "callUpOf",
      "fullColumnsGridArbitrary",
      "gridArbitrary",
      "markingActionArbitrary",
      "marksAndUndosArbitrary",
      "minimumsGridArbitrary",
      "randomGridArbitrary",
      "recreationActionsArbitrary",
      "undoActionArbitrary",
    ],
  ],
  [
    "action-interpreter",
    actionInterpreter,
    [
      "applyAction",
      "cellOfKey",
      "changedKeys",
      "isLive",
      "liveEntries",
      "mostStarters",
      "runActions",
      "startSession",
      "startersByColumn",
    ],
  ],
  [
    "feasibility-oracle",
    feasibilityOracle,
    [
      "MAX_FILLINGS",
      "MAX_MISSING_X",
      "MAX_ORACLE_PLAYERS",
      "countFillings",
      "cyclicWindowGrid",
      "isPossibleByBruteForce",
      "mixedFeasibilityGridArbitrary",
      "possibleFeasibilityGridArbitrary",
      "someFilling",
      "withCircled",
      "withoutX",
    ],
  ],
];

describe("entry points of tests/support/", () => {
  it.each(EXPORTED_VALUES)(
    "T080: tests/support/%s.ts keeps exporting the same names",
    (_file, moduleExports, names) => {
      expect(Object.keys(moduleExports).sort()).toEqual([...names].sort());
    },
  );
});
