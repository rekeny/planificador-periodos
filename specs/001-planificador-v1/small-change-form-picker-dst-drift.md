# Small change form · The time picker no longer drifts on a daylight-saving day (F-02)

- **Date:** 2026-11-21
- **Branch:** `fix/picker-dst-drift`
- **Approved by:** Fernando, 2026-11-21 (chat)

## What

The time picker of the new-match form (the inline one on iOS and the dialog on Android) shows the time the draft holds, on every date. Today, on the day the clocks go forward, a time that does not exist that day is shown shifted by an hour: in Spain, with 02:30 chosen and the date changed to Sunday 29 March 2026, the picker shows 03:30 while the draft, the text under «Hora» and what is saved stay at 02:30. The change is in `src/ui/date-time-field-shared.ts` and in the two files that call it, `date-time-field.tsx` and `date-time-field-android.tsx`.

## Why

Finding F-02 of the Codex review of 2026-11-18, accepted by Fernando as pending (`review.md`). It was reproduced on 2026-11-21 in Jest by setting the time zone: with `TZ=Europe/Madrid`, `toLocalDate("2026-03-29", "02:30")` is Sunday 29 March 2026 03:30 (`getHours()` is 3). The picker is given a single `Date` built from the draft's date and time, and JavaScript moves a local time that falls in the skipped hour to the next valid one. The time picker only needs the time of day, but it inherits the date and its daylight-saving quirks. Two things can go wrong on that day: the coach sees a picker that disagrees with the text, and if they touch the picker it reports 03:30 and saves it, although they meant to keep 02:30. The match time is a plain «HH:MM» in this app, with no time zone, so a date can never change a time.

Approach, and what is discarded:

- **Chosen:** a new function `toLocalTime(time)` that builds the `Date` for the time picker on a fixed reference day, 15 January 2001, which has no clock change in any time zone in use today, and the existing `toLocalDate(date, time)` stays for the date picker, which reads only the day. The time picker then reads and reports hours and minutes from a day that cannot move them. No new dependency and no change in what the draft or the database hold.
- **Discarded:** the date picker value at noon only (`toLocalDate(date, null)`). The date picker never shows the time, and it reads only year, month and day, so it is not what drifts; changing it adds risk for nothing. Also discarded: detecting the daylight-saving gap by hand and adjusting the time: it needs the time zone rules, which is exactly what the reference day avoids.

## How

- `src/ui/date-time-field-shared.ts`: add `toLocalTime(time: string | null): Date` (noon when there is no time, as `toLocalDate` does), with a comment of why the reference day is in January.
- `src/ui/date-time-field.tsx`: the time picker gets `toLocalTime(time)`; the date picker keeps `toLocalDate(date, time)`.
- `src/ui/date-time-field-android.tsx`: the dialog gets `toLocalTime(time)` in time mode and `toLocalDate(date, time)` in date mode.
- `src/ui/date-time-field-shared.test.ts` and a new `src/ui/date-time-field.dst.test.tsx`: tests under several time zones.

No change in `src/domain/`, `src/state/`, `es.json`, dependencies, the spec or what any form saves or validates.

## Why it is small

It changes no specified behaviour (the time the coach chose stays the time that is saved) and does not touch `src/domain/`: it changes the date the interface hands to the native time picker.

## Tests

Jest sets the time zone at run time (`process.env.TZ`), restores it after each test, and reads the `value` the form gives the picker (the double of `tests/support/date-time-picker-double.ts`). Fail before the change: with `Europe/Madrid`, a draft of 2026-03-29 at 02:30 gives the iOS time picker 02:30 and the Android time dialog 02:30 (today 03:30); picking a day with the date picker on 29 March does not change the time picker's value; every time from 00:00 to 23:59 comes back unchanged from `toLocalTime` in Europe/Madrid, America/New_York, Australia/Sydney, Australia/Lord_Howe (a half-hour change) and UTC. Pass before and after: the date picker still receives the draft's date, and a time that exists keeps working. The real proof is the device: this one cannot be reproduced on the emulator without changing its time zone and date; it is checked there by setting the emulator to Madrid time and a draft on 29 March 2026. **Not covered:** a real phone, and any time zone not in that list; the fixed day is chosen because daylight-saving changes are in spring and autumn (the Southern Hemisphere ones in April and October as well).
