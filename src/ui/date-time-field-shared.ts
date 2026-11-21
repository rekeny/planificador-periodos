export interface DateTimeFieldProps {
  // "YYYY-MM-DD" and "HH:MM" as the draft keeps them; no time is null.
  readonly date: string;
  readonly time: string | null;
  readonly onDateChange: (parts: {
    year: number;
    month: number;
    day: number;
  }) => void;
  readonly onTimeChange: (parts: { hour: number; minute: number }) => void;
  readonly onClearTime: () => void;
}

// What «Añadir hora» puts in the draft: always noon, never a time chosen earlier (D51).
export const ADDED_TIME: Parameters<DateTimeFieldProps["onTimeChange"]>[0] = {
  hour: 12,
  minute: 0,
};

// The native picker works with a Date; the draft's strings are turned into one in local time.
// This is plumbing, not a rule: what is shown comes from displayDate and displayTime.
export function toLocalDate(date: string, time: string | null): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 12, minute = 0] =
    time === null ? [] : time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

// The time picker needs only the time of day, so its Date is built on a fixed reference day and not
// on the match's date (F-02). On the day the clocks go forward a local time that does not exist (02:30
// in Spain on 29 March 2026) is moved by JavaScript to the next valid one, and the picker then shows
// 03:30 while the draft keeps 02:30. 15 January has no clock change in any time zone in use. The
// draft's time stays a plain "HH:MM": this is plumbing, not a rule.
const REFERENCE_DAY = { year: 2001, monthIndex: 0, day: 15 };

export function toLocalTime(time: string | null): Date {
  const [hour = 12, minute = 0] =
    time === null ? [] : time.split(":").map(Number);
  return new Date(
    REFERENCE_DAY.year,
    REFERENCE_DAY.monthIndex,
    REFERENCE_DAY.day,
    hour,
    minute,
  );
}
