// Match session side of the "read fails after a committed write" tests (Codex F3, RF-085). This
// file holds no test calls. It builds on match-session-fixtures.ts, match-session-marks.ts and
// match-session-call-up.ts without changing them. Expected API of the session store as in those
// files: openMatch(id), tapCell, undo, addOvertime, removeLastOvertime, addToCallUp,
// removeFromCallUp and createPlayerInMatch.
import type { AppDatabase } from "@/data/database-types";
import { createMatchSessionStore } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";
import { savedCallUp, savedTeam } from "./match-session-call-up";
import { snapshotOf } from "./match-session-marks";
import type { MatchSessionStore } from "./match-session-fixtures";
import {
  answerOf,
  type Answer,
  guardReadsAfterWrites,
  outcomeOf,
  type Picture,
  type ReadGuard,
  type Write,
} from "./read-after-write";

interface Base {
  readonly db: AppDatabase;
  readonly matchId: number;
  readonly teamId: number;
  readonly entryIds: number[];
}

export type Session = Base & {
  readonly store: MatchSessionStore;
  readonly guard: ReadGuard;
};

/** The published state and everything the database holds about the match, side by side. */
export function sessionPicture(session: Session): Picture {
  const { db, store, matchId, teamId } = session;
  return {
    state: {
      ...snapshotOf(store, db, matchId),
      callUp: savedCallUp(db, matchId),
      team: savedTeam(db, teamId),
    },
    saveFailed: store.getState().saveFailed,
  };
}

/** The same match, opened by a store whose reads fail right after one of the watched writes. */
export function guarded(base: Base, writes: readonly Write[]): Session {
  const guard = guardReadsAfterWrites(base.db, writes);
  const store = createMatchSessionStore(guard.db);
  store.getState().openMatch(base.matchId);
  return { ...base, store, guard };
}

/** The same match opened by a store on the healthy database (the twin). */
export function healthy(base: Base): Session {
  return guarded(base, []);
}

export interface Steps {
  /** Done on both stores before the failing action, with working reads (e.g. a tap to undo). */
  readonly prepare?: (session: Session) => void;
  readonly act: (session: Session) => SaveResult;
}

/**
 * Runs the steps on a failing session and on a healthy twin built the same way, and says what
 * RF-085 sees: "rolledBack", "published" or "inconsistent: ...". `make` builds one fresh match.
 */
export function judgedSession(
  make: () => Base,
  writes: readonly Write[],
  steps: Steps,
) {
  const twin = healthy(make());
  const session = guarded(make(), writes);
  steps.prepare?.(twin);
  session.guard.watch(false);
  steps.prepare?.(session);
  session.guard.watch(true);
  const before = sessionPicture(session);
  steps.act(twin);
  const result = answerOf(() => steps.act(session));
  const outcome = outcomeOf(
    result,
    before,
    sessionPicture(session),
    sessionPicture(twin),
  );
  // The coach taps again once the device works: only when the first try did not save.
  const retry = (): Answer => {
    if (result.kind === "saved") {
      return result;
    }
    session.guard.heal();
    return answerOf(() => steps.act(session));
  };
  return { session, result, outcome, retry };
}
