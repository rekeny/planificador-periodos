// Helpers of the question tests of the match session (T062). This file holds no test calls. It adds
// to match-session-marks.ts without changing it. Expected API of the session store, on top of the
// D2 one: the state field `pending` (null, or { kind, cell } with kind "subOrStarter",
// "chooseReplaced", "confirmRemoveStarter" or "cellMenu") and the actions answerSub(),
// confirmRemove() and cancelQuestion(). Rows are positions of the call-up: 0 is Ana, 4 is Eva.
import type { AppDatabase } from "@/data/database-types";
import { createMatchSessionStore } from "@/state/match-session-store";
import { fillColumn, type SeedMark } from "./match-session-marks";

/** 6 periods: P2 has 5 X (rows 1 to 5), so Ana's empty P2 asks the question (E-011, RF-045). */
export const FULL_P2: readonly SeedMark[] = fillColumn("P2", [1, 2, 3, 4, 5]);

/** 6 periods: P3 has 5 X (rows 0 to 4, Eva is row 4) and a sub (row 5), so an X asks the reminder (E-013). */
export const P3_WITH_SUB: readonly SeedMark[] = [
  ...fillColumn("P3", [0, 1, 2, 3, 4]),
  ...fillColumn("P3", [5], "sub"),
];

/** A new store on the same database with the match opened: what the device holds after a restart. */
export function reopened(db: AppDatabase, matchId: number) {
  const store = createMatchSessionStore(db);
  store.getState().openMatch(matchId);
  return store;
}
