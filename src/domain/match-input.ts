// Defaults and validation of the new-match form (RF-025, RF-026, RF-036).
// Returns the normalised value, the only one the state layer saves.

import type { Format } from "@/domain/format";
import type { Validation, ValidationError } from "@/domain/squad-validation";

// Whole number from 0 to 999, ASCII digits only, never trimmed.
const VALID_SCORE = /^[0-9]{1,3}$/;

export function newMatchDefaults(
  defaultFormat: Format,
  today: string,
): { readonly format: Format; readonly date: string; readonly time: null } {
  return { format: defaultFormat, date: today, time: null };
}

// Trimmed text, with an empty or spaces-only one saved as null.
function textOrNull(text: string | null): string | null {
  const trimmed = text === null ? "" : text.trim();
  return trimmed === "" ? null : trimmed;
}

type Score = { readonly ok: boolean; readonly value: number | null };

function parseScore(typed: string): Score {
  if (typed === "") {
    return { ok: true, value: null };
  }
  return VALID_SCORE.test(typed)
    ? { ok: true, value: Number(typed) }
    : { ok: false, value: null };
}

// An invalid score is reported alone: the incomplete check looks only at
// scores that parsed.
function scoreErrors(home: Score, away: Score): ValidationError[] {
  if (!home.ok || !away.ok) {
    return ["scoreInvalid"];
  }
  return (home.value === null) !== (away.value === null)
    ? ["scoreIncomplete"]
    : [];
}

export function validateMatchInput(input: {
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly notes: string | null;
  readonly homeScore: string;
  readonly awayScore: string;
}): Validation<{
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly notes: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}> {
  const home = parseScore(input.homeScore);
  const away = parseScore(input.awayScore);
  const errors = scoreErrors(home, away);
  if (errors.length > 0) {
    return { kind: "invalid", errors };
  }
  return {
    kind: "valid",
    value: {
      homeName: textOrNull(input.homeName),
      awayName: textOrNull(input.awayName),
      notes: textOrNull(input.notes),
      homeScore: home.value,
      awayScore: away.value,
    },
  };
}
