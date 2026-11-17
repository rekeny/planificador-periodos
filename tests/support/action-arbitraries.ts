// fast-check generators of actions on a match grid (T021, T080). An action is plain data; the interpreter
// in tests/support/action-interpreter.ts resolves it against the grid as it is when it runs.
import {
  array,
  boolean,
  constant,
  constantFrom,
  integer,
  oneof,
  record,
  tuple,
  type Arbitrary,
} from "fast-check";
import type { Format } from "@/domain/format";
import { formatArbitrary } from "./grid-builders";

// An action is plain data. It names its target by rolls that the interpreter (tests/support/action-
// interpreter.ts) resolves against the grid as it is when the action runs, so every generated sequence is
// applicable whatever the earlier actions did.

export type TargetMode = "any" | "marked" | "last" | "missing";

export interface Target {
  readonly mode: TargetMode;
  readonly row: number;
  readonly col: number;
}

// How the coach answers the questions of the domain (RF-045 to RF-047, RF-050, RF-053).
export interface Reply {
  readonly answer: "sub" | "starter" | "cancel";
  readonly pick: number; // which of the replaceable X is chosen
  readonly confirm: boolean; // "remove anyway" or cancel
}

export type MenuChoice = "starter" | "sub" | "remove";

export type MarkingAction =
  | { readonly type: "tap"; readonly target: Target; readonly reply: Reply }
  | {
      readonly type: "menu";
      readonly target: Target;
      readonly choice: MenuChoice;
      readonly reply: Reply;
    };

export type Action =
  | MarkingAction
  | { readonly type: "undo" }
  | { readonly type: "addOvertime" }
  | { readonly type: "removeOvertime" }
  | { readonly type: "changeFormat"; readonly format: Format }
  | { readonly type: "removePlayer"; readonly row: number }
  | { readonly type: "addPlayer" };

const roll = integer({ min: 0, max: 99 });

// Marked and last-column targets are frequent on purpose: they reach the menus, the full columns and the
// columns that a later overtime removal or format change takes away.
const targetArbitrary: Arbitrary<Target> = record({
  mode: constantFrom<TargetMode>(
    "any",
    "any",
    "marked",
    "marked",
    "last",
    "last",
    "missing",
  ),
  row: roll,
  col: roll,
});

const replyArbitrary: Arbitrary<Reply> = record({
  answer: constantFrom<Reply["answer"]>("sub", "starter", "starter", "cancel"),
  pick: roll,
  confirm: boolean(),
});

export const markingActionArbitrary: Arbitrary<MarkingAction> = oneof(
  {
    weight: 3,
    arbitrary: record({
      type: constant("tap" as const),
      target: targetArbitrary,
      reply: replyArbitrary,
    }),
  },
  {
    weight: 2,
    arbitrary: record({
      type: constant("menu" as const),
      target: targetArbitrary,
      choice: constantFrom<MenuChoice>("starter", "sub", "remove"),
      reply: replyArbitrary,
    }),
  },
);

export const undoActionArbitrary: Arbitrary<Action> = constant({
  type: "undo",
});

// Marks, undos and every change of structure, with enough undos and re-creations to meet them often.
export const actionArbitrary: Arbitrary<Action> = oneof(
  { weight: 5, arbitrary: markingActionArbitrary },
  { weight: 3, arbitrary: undoActionArbitrary },
  { weight: 1, arbitrary: constant<Action>({ type: "addOvertime" }) },
  { weight: 1, arbitrary: constant<Action>({ type: "removeOvertime" }) },
  {
    weight: 1,
    arbitrary: formatArbitrary.map((format): Action => ({
      type: "changeFormat",
      format,
    })),
  },
  {
    weight: 1,
    arbitrary: roll.map((row): Action => ({ type: "removePlayer", row })),
  },
  { weight: 1, arbitrary: constant<Action>({ type: "addPlayer" }) },
);

// Marks, and a lot of undos: the Undo button pressed again and again after marking.
export const marksAndUndosArbitrary: Arbitrary<Action> = oneof(
  { weight: 3, arbitrary: markingActionArbitrary },
  { weight: 2, arbitrary: undoActionArbitrary },
);

const MAX_ACTIONS = 40;

export const actionsArbitrary = (
  each: Arbitrary<Action> = actionArbitrary,
): Arbitrary<Action[]> => array(each, { maxLength: MAX_ACTIONS, size: "max" });

// A row or a column removed and created again (RF-086): some setup, marks, the removal, the creation, then
// marks and undos. The removed and re-created thing is the last overtime, the periods above a smaller
// format, or a player (who comes back as a new entry).
const RECREATIONS: readonly (readonly Action[][])[] = [
  [
    [{ type: "addOvertime" }],
    [{ type: "removeOvertime" }],
    [{ type: "addOvertime" }],
  ],
  [
    [{ type: "changeFormat", format: 8 }],
    [{ type: "changeFormat", format: 4 }],
    [{ type: "changeFormat", format: 8 }],
  ],
  [
    [{ type: "changeFormat", format: 6 }],
    [{ type: "changeFormat", format: 4 }],
    [{ type: "changeFormat", format: 6 }],
  ],
  [[], [{ type: "removePlayer", row: 0 }], [{ type: "addPlayer" }]],
  [[], [{ type: "removePlayer", row: 7 }], [{ type: "addPlayer" }]],
];

export const recreationActionsArbitrary: Arbitrary<Action[]> = tuple(
  constantFrom(...RECREATIONS),
  actionsArbitrary(markingActionArbitrary),
  actionsArbitrary(marksAndUndosArbitrary),
).map(([[setup = [], destroy = [], create = []], before, after]) => [
  ...setup,
  ...before,
  ...destroy,
  ...create,
  ...after,
]);
