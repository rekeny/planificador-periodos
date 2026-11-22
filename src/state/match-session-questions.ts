import { markSub, removeMark, replaceStarter } from "@/domain/marking";
import { openMatchOf, type CallUpHost } from "@/state/match-session-call-up";
import { commitMarkChange } from "@/state/match-session-commit";
import { ask, drop } from "@/state/match-session-pending";
import type {
  MatchSessionState,
  PendingQuestion,
} from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  | "answerSub"
  | "answerStarter"
  | "chooseReplaced"
  | "confirmRemove"
  | "cancelQuestion"
>;

// An answer acts only when the pending question is its own kind, and asks the domain again.
function answer(
  host: CallUpHost,
  kind: PendingQuestion["kind"],
  change: typeof markSub,
): SaveResult {
  const current = openMatchOf(host);
  const pending = host.get().pending;
  if (current === null || pending === null || pending.kind !== kind) {
    return { kind: "unchanged" };
  }
  return commitMarkChange(host, current, change(current.grid, pending.cell));
}

// «Starter» opens the choice of the replaced X: nothing is read or written yet (RF-047).
function answerStarter(host: CallUpHost): SaveResult {
  const pending = host.get().pending;
  if (pending === null || pending.kind !== "subOrStarter") {
    return { kind: "unchanged" };
  }
  return ask(host, { kind: "chooseReplaced", cell: pending.cell });
}

// The chosen X must be one of the column's Xs; anything else keeps the choice open.
function chooseReplaced(host: CallUpHost, entryId: number): SaveResult {
  const current = openMatchOf(host);
  const pending = host.get().pending;
  if (
    current === null ||
    pending === null ||
    pending.kind !== "chooseReplaced"
  ) {
    return { kind: "unchanged" };
  }
  const after = replaceStarter(current.grid, pending.cell, entryId);
  if (after === current.grid) {
    return { kind: "unchanged" };
  }
  return commitMarkChange(host, current, after);
}

export function createQuestionsActions(host: CallUpHost): Actions {
  return {
    answerSub: () => answer(host, "subOrStarter", markSub),
    answerStarter: () => answerStarter(host),
    chooseReplaced: (entryId) => chooseReplaced(host, entryId),
    confirmRemove: () => answer(host, "confirmRemoveStarter", removeMark),
    cancelQuestion: () => drop(host),
  };
}
