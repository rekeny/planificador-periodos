import { replaceableStarters } from "@/domain/marking";
import type { CallUpHost } from "@/state/match-session-call-up";
import type { PendingQuestion } from "@/state/match-session-store";
import type { SaveResult } from "@/state/save-result";

/**
 * Opens a question. A question is not a write: nothing is read or saved, no undo entry is pushed
 * and nothing is published, so a previous failure flag stays as it was.
 */
export function ask(host: CallUpHost, pending: PendingQuestion): SaveResult {
  const { grid, view } = host.get();
  if (pending.kind === "chooseReplaced" && grid !== null && view !== null) {
    const ids = replaceableStarters(grid, pending.cell.column);
    const rows = view.rows.filter((row) => ids.includes(row.entryId));
    host.set({ pending, view: { ...view, replaceableStarters: rows } });
    return { kind: "unchanged" };
  }
  host.set({ pending });
  return { kind: "unchanged" };
}

/** While a question is open, nothing else acts on the match (D3-7). */
export function hasPendingQuestion(host: CallUpHost): boolean {
  return host.get().pending !== null;
}

/** Closes the open question and leaves everything else as it was. */
export function drop(host: CallUpHost): void {
  const { view } = host.get();
  host.set({
    pending: null,
    view: view === null ? null : { ...view, replaceableStarters: [] },
  });
}
