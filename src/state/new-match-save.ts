import type { AppDatabase } from "@/data/database-types";
import { createMatch } from "@/data/match-repository";
import { callUpEntryFor } from "@/domain/call-up";
import type { Format } from "@/domain/format";
import { validateMatchInput } from "@/domain/match-input";
import type { Player } from "@/domain/squad";
import type { SaveResult } from "@/state/save-result";

/** `matchId` is present only when the match was saved. */
export type CreateResult = SaveResult & { readonly matchId?: number };

/** The part of the new-match draft that is saved; the draft's state satisfies it. */
export interface DraftToSave {
  readonly format: Format;
  readonly date: string;
  readonly time: string | null;
  readonly homeName: string;
  readonly awayName: string;
  readonly homeScore: string;
  readonly awayScore: string;
  readonly notes: string;
  readonly callUpSelection: readonly {
    readonly player: Player;
    readonly selected: boolean;
  }[];
}

/** Validates the typed text and saves the match with the selected players (RF-025, RF-085). */
export function saveDraft(
  db: AppDatabase,
  teamId: number,
  draft: DraftToSave,
): CreateResult {
  const checked = validateMatchInput(draft);
  if (checked.kind === "invalid") {
    return { kind: "invalid", errors: checked.errors };
  }
  const entries = draft.callUpSelection
    .filter((row) => row.selected)
    .map((row) => callUpEntryFor(row.player));
  try {
    const match = createMatch(
      db,
      {
        teamId,
        format: draft.format,
        date: draft.date,
        time: draft.time,
        ...checked.value,
      },
      entries,
    );
    return { kind: "saved", matchId: match.id };
  } catch {
    // createMatch is one transaction, so nothing is half saved and the caller may retry.
    return { kind: "saveFailed" };
  }
}
