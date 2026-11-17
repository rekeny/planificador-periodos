import { displayDate, displayTime } from "@/domain/match-date";

// The state layer is the only one the UI may ask for what the domain formats, as with
// format-options.ts: the field shows these strings and computes nothing itself.
export const shownDate = displayDate;
export const shownTime = displayTime;
