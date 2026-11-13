// Dates and times of a match as text (RF-083). The state layer stores
// "YYYY-MM-DD" and "HH:MM"; the screen shows the date as DD/MM/YYYY.
// Nothing here reads the clock: the parts always come from the caller.

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

export function isoDate(parts: {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}): string {
  return `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}`;
}

export function isoTime(parts: {
  readonly hour: number;
  readonly minute: number;
}): string {
  return `${pad(parts.hour, 2)}:${pad(parts.minute, 2)}`;
}

export function displayDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// "HH:MM" is already what the coach reads; no time stays no time.
export function displayTime(time: string | null): string | null {
  return time;
}
