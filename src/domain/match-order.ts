// Order of the list of matches: latest date first, then latest time first (RF-074, RF-075).
import type { Match } from "@/domain/squad";

type MatchSlot = Pick<Match, "date" | "time">;

// ISO dates and 24-hour times compare correctly as text. A match without a time goes last on
// its date; the same date and time give 0, so the stable sort keeps the matches' order.
function compareDescending(a: string, b: string): number {
  if (a < b) return 1;
  return a > b ? -1 : 0;
}

export function compareMatches(a: MatchSlot, b: MatchSlot): number {
  const byDate = compareDescending(a.date, b.date);
  if (byDate !== 0) return byDate;
  if (a.time === b.time) return 0;
  if (a.time === null) return 1;
  if (b.time === null) return -1;
  return compareDescending(a.time, b.time);
}
