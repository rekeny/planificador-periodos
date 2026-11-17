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

// The native picker works with a Date; the draft's strings are turned into one in local time.
// This is plumbing, not a rule: what is shown comes from displayDate and displayTime.
export function toLocalDate(date: string, time: string | null): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 12, minute = 0] =
    time === null ? [] : time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}
