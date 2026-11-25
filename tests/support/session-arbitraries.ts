// fast-check generator of the actions a coach can do on an open match through the session store
// (T098). An action is plain data: it names its target by numbers that tests/support/session-
// interpreter.ts resolves against the view as it is when the action runs, so every generated
// sequence is applicable whatever the earlier actions did. Answers, menu choices and
// chooseReplaced are drawn even when nothing is pending: the store must ignore them (odd data).
import {
  array,
  constant,
  constantFrom,
  integer,
  oneof,
  tuple,
  uniqueArray,
  type Arbitrary,
} from "fast-check";
import type { CellMenuChoice } from "@/domain/cell-menu";
import { FORMATS, type Format } from "@/domain/format";

/**
 * `col` is a position in the drawn columns (it wraps), LAST_COLUMN is the newest column, and
 * MISSING_CELL is a cell that is not in the grid at all.
 */
export const LAST_COLUMN = -1;
export const MISSING_CELL = -2;

/** The entry chooseReplaced is called with: one of the column's X, one without X, or no entry at all. */
export type ReplacedPick = "inColumn" | "outOfColumn" | "missing";

export type SessionAction =
  | { readonly type: "tapCell"; readonly row: number; readonly col: number }
  | {
      readonly type: "openCellMenu";
      readonly row: number;
      readonly col: number;
    }
  | { readonly type: "chooseCellMenuOption"; readonly choice: CellMenuChoice }
  | {
      readonly type: "chooseReplaced";
      readonly pick: ReplacedPick;
      readonly roll: number;
    }
  | { readonly type: "answerSub" }
  | { readonly type: "answerStarter" }
  | { readonly type: "confirmRemove" }
  | { readonly type: "cancelQuestion" }
  | { readonly type: "undo" }
  | { readonly type: "addOvertime" }
  | { readonly type: "removeLastOvertime" }
  | { readonly type: "changeFormat"; readonly format: Format }
  | { readonly type: "reopen" }; // closeMatch, then openMatch of the same match

const rows = integer({ min: 0, max: 12 });

// Few columns come up often, so columns reach 5 X and the questions appear; LAST_COLUMN is the newest
// overtime, so overtimes are marked, removed and created again. The rare MISSING_CELL is odd data.
const columns: Arbitrary<number> = oneof(
  { weight: 4, arbitrary: integer({ min: 0, max: 2 }) },
  { weight: 3, arbitrary: integer({ min: 0, max: 11 }) },
  { weight: 2, arbitrary: constant(LAST_COLUMN) },
  { weight: 1, arbitrary: constant(MISSING_CELL) },
);

const cellActions = (type: "tapCell" | "openCellMenu") =>
  tuple(rows, columns).map(([row, col]): SessionAction => ({ type, row, col }));

const alone = (type: SessionAction["type"]) =>
  constant({ type } as SessionAction);

/** One action of a session. Marks and their questions dominate, with enough undos and structure changes. */
export const sessionActionArbitrary: Arbitrary<SessionAction> = oneof(
  { weight: 14, arbitrary: cellActions("tapCell") },
  { weight: 4, arbitrary: cellActions("openCellMenu") },
  {
    weight: 4,
    arbitrary: constantFrom<CellMenuChoice>("starter", "sub", "remove").map(
      (choice): SessionAction => ({ type: "chooseCellMenuOption", choice }),
    ),
  },
  {
    weight: 4,
    arbitrary: tuple(
      constantFrom<ReplacedPick>(
        "inColumn",
        "inColumn",
        "outOfColumn",
        "missing",
      ),
      integer({ min: 0, max: 99 }),
    ).map(([pick, roll]): SessionAction => ({
      type: "chooseReplaced",
      pick,
      roll,
    })),
  },
  { weight: 3, arbitrary: alone("answerSub") },
  { weight: 3, arbitrary: alone("answerStarter") },
  { weight: 3, arbitrary: alone("confirmRemove") },
  { weight: 3, arbitrary: alone("cancelQuestion") },
  { weight: 6, arbitrary: alone("undo") },
  { weight: 2, arbitrary: alone("addOvertime") },
  { weight: 2, arbitrary: alone("removeLastOvertime") },
  {
    weight: 3,
    arbitrary: constantFrom(...FORMATS).map((format): SessionAction => ({
      type: "changeFormat",
      format,
    })),
  },
  { weight: 2, arbitrary: alone("reopen") },
);

// A random action rarely answers the question the one before opened, and a column rarely reaches 5 X
// by chance, so a session also has pieces that go together: a column filled with 5 X, and a tap or a
// long press followed by the answers that fit it (still plain actions, and the random ones are mixed in).
const fillCol: Arbitrary<number> = oneof(
  integer({ min: 0, max: 2 }),
  integer({ min: 0, max: 11 }),
);

const fillOf = (col: number, picked: readonly number[]) =>
  picked.map((row) => tapAt(row, col));

const fillsOfAColumn: Arbitrary<readonly SessionAction[]> = tuple(
  fillCol,
  uniqueArray(rows, { minLength: 5, maxLength: 5 }),
).map(([col, picked]) => fillOf(col, picked));

const tapAt = (row: number, col: number): SessionAction => ({
  type: "tapCell",
  row,
  col,
});

const replaced = (roll: number): SessionAction => ({
  type: "chooseReplaced",
  pick: "inColumn",
  roll,
});

const questionsThatFit: Arbitrary<readonly SessionAction[]> = oneof(
  tuple(rows, columns, integer({ min: 0, max: 99 })).map(([row, col, roll]) => [
    tapAt(row, col),
    { type: "answerStarter" } as const,
    replaced(roll),
  ]),
  tuple(rows, columns).map(([row, col]) => [
    tapAt(row, col),
    { type: "answerSub" } as const,
  ]),
  tuple(rows, columns).map(([row, col]) => [
    tapAt(row, col),
    { type: "confirmRemove" } as const,
  ]),
  tuple(
    rows,
    columns,
    constantFrom<CellMenuChoice>("starter", "sub", "remove"),
    integer({ min: 0, max: 99 }),
  ).map(([row, col, choice, roll]) => [
    { type: "openCellMenu", row, col } as const,
    { type: "chooseCellMenuOption", choice } as const,
    replaced(roll),
  ]),
);

// A column filled with 5 X and straight away a tap on another cell of it, with the answers to the question.
const questionOfAFullColumn: Arbitrary<readonly SessionAction[]> = tuple(
  fillCol,
  uniqueArray(rows, { minLength: 5, maxLength: 5 }),
  rows,
  integer({ min: 0, max: 99 }),
  constantFrom<"starter" | "sub" | "cancel">(
    "starter",
    "starter",
    "sub",
    "cancel",
  ),
).map(([col, picked, row, roll, answer]) => [
  ...fillOf(col, picked),
  tapAt(row, col),
  ...(answer === "starter"
    ? [{ type: "answerStarter" } as const, replaced(roll)]
    : [{ type: answer === "sub" ? "answerSub" : "cancelQuestion" } as const]),
]);

// Marks, then a column that goes away and may come back (a format change and back, or an overtime
// removed and added again), then undos: where RF-086 is at stake.
const marks = array(tuple(rows, integer({ min: 0, max: 11 })), {
  minLength: 1,
  maxLength: 4,
}).map((taps) => taps.map(([row, col]) => tapAt(row, col)));

const formats = array(constantFrom(...FORMATS), { minLength: 1, maxLength: 3 });

const restructured: Arbitrary<readonly SessionAction[]> = tuple(
  marks,
  oneof(
    formats.map((list) =>
      list.map((format): SessionAction => ({ type: "changeFormat", format })),
    ),
    constant<SessionAction[]>([
      { type: "addOvertime" },
      tapAt(0, LAST_COLUMN),
      { type: "removeLastOvertime" },
      { type: "addOvertime" },
    ]),
  ),
  array(alone("undo"), { minLength: 1, maxLength: 4 }),
).map(([taps, change, undos]) => [...taps, ...change, ...undos]);

/** A whole session: the format the match starts in, the call-up size (8 to 13) and its actions. */
export interface SessionPlan {
  readonly format: Format;
  readonly players: number;
  readonly actions: readonly SessionAction[];
}

const MAX_PIECES = 14;

const pieces: Arbitrary<readonly SessionAction[]> = oneof(
  { weight: 3, arbitrary: sessionActionArbitrary.map((action) => [action]) },
  { weight: 2, arbitrary: questionsThatFit },
  { weight: 2, arbitrary: questionOfAFullColumn },
  { weight: 2, arbitrary: restructured },
);

export const sessionPlanArbitrary: Arbitrary<SessionPlan> = tuple(
  constantFrom(...FORMATS),
  integer({ min: 8, max: 13 }),
  array(fillsOfAColumn, { maxLength: 3 }),
  array(pieces, { maxLength: MAX_PIECES, size: "max" }),
).map(([format, players, fills, rest]) => ({
  format,
  players,
  actions: [...fills.flat(), ...rest.flat()],
}));
