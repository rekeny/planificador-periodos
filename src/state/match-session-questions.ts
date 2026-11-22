import { markSub, removeMark } from "@/domain/marking";
import { openMatchOf, type CallUpHost } from "@/state/match-session-call-up";
import { commitMarkChange } from "@/state/match-session-commit";
import { drop } from "@/state/match-session-pending";
import type {
  MatchSessionState,
  PendingQuestion,
} from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

type Actions = Pick<
  MatchSessionState,
  "answerSub" | "confirmRemove" | "cancelQuestion"
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

export function createQuestionsActions(host: CallUpHost): Actions {
  return {
    answerSub: () => answer(host, "subOrStarter", markSub),
    confirmRemove: () => answer(host, "confirmRemoveStarter", removeMark),
    cancelQuestion: () => drop(host),
  };
}
