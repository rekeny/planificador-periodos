// Entry point of the grid and action generators (T020, T021). The code lives in grid-builders.ts,
// grid-shapes.ts and action-arbitraries.ts (T080, 250-line limit); this file keeps the old path and the
// exported names, so the property tests of src/domain/ import it unchanged. They live in tests/ because
// files in src/domain/ that are not tests may not import fast-check.
export { MAX_OVERTIMES, MAX_PLAYERS, callUpOf } from "./grid-builders";
export {
  balancedWindowGridArbitrary,
  fullColumnsGridArbitrary,
  gridArbitrary,
  minimumsGridArbitrary,
  randomGridArbitrary,
} from "./grid-shapes";
export {
  actionArbitrary,
  actionsArbitrary,
  markingActionArbitrary,
  marksAndUndosArbitrary,
  recreationActionsArbitrary,
  undoActionArbitrary,
} from "./action-arbitraries";
export type {
  Action,
  MarkingAction,
  MenuChoice,
  Reply,
  Target,
  TargetMode,
} from "./action-arbitraries";
