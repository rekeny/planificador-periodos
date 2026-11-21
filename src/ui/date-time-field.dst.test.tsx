// F-02 (Codex review of 2026-11-18): the time picker was given a Date built from the draft's date
// and time, and on the day the clocks go forward a time that does not exist (02:30 in Spain on
// 29 March 2026) became 03:30, so the picker disagreed with the draft, the text and what is saved.
// The time picker now gets its Date on a fixed reference day (small-change-form-picker-dst-drift.md).
// Jest sets the time zone at run time and restores it after each test.
import "@/i18n";
import { render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { DateTimeField } from "@/ui/date-time-field";
import { toLocalDate, toLocalTime } from "@/ui/date-time-field-shared";
import {
  localParts,
  pickDate,
  pickerValue,
} from "../../tests/support/date-time-picker-double";

jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<{ dateTimePickerModule: () => object }>(
      "../../tests/support/date-time-picker-double",
    )
    .dateTimePickerModule(),
);

const ZONES = [
  "Europe/Madrid",
  "America/New_York",
  "Australia/Sydney",
  "Australia/Lord_Howe",
  "UTC",
];

let zone: string | undefined;

beforeEach(() => {
  zone = process.env.TZ;
});

afterEach(() => {
  if (zone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = zone;
  }
  jest.restoreAllMocks();
});

function field(date: string, time: string | null) {
  return (
    <DateTimeField
      date={date}
      time={time}
      onDateChange={jest.fn()}
      onTimeChange={jest.fn()}
      onClearTime={jest.fn()}
    />
  );
}

describe("the time picker on a daylight-saving day (F-02, RF-083)", () => {
  it("RF-083 F-02: with TZ Europe/Madrid, the Date built from 29 March 2026 and 02:30 is still shifted for the date picker (the reason the time picker has its own)", () => {
    process.env.TZ = "Europe/Madrid";
    expect(toLocalDate("2026-03-29", "02:30").getHours()).toBe(3);
  });

  it.each(ZONES)(
    "RF-083 F-02: in %s every time from 00:00 to 23:59 comes back from toLocalTime unchanged",
    (name) => {
      process.env.TZ = name;
      const wrong: string[] = [];
      for (let hour = 0; hour < 24; hour += 1) {
        for (let minute = 0; minute < 60; minute += 1) {
          const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
          const picked = toLocalTime(time);
          if (picked.getHours() !== hour || picked.getMinutes() !== minute) {
            wrong.push(time);
          }
        }
      }
      expect(wrong).toEqual([]);
    },
  );

  it("RF-083 F-02: toLocalTime keeps the noon fallback when there is no time", () => {
    process.env.TZ = "Europe/Madrid";
    const picked = toLocalTime(null);
    expect([picked.getHours(), picked.getMinutes()]).toEqual([12, 0]);
  });

  it("RF-083 F-02: on iOS, with TZ Europe/Madrid, a draft of 29 March 2026 at 02:30 gives the time picker 02:30", async () => {
    process.env.TZ = "Europe/Madrid";
    await render(field("2026-03-29", "02:30"));
    const value = await pickerValue("time");
    expect([value.getHours(), value.getMinutes()]).toEqual([2, 30]);
  });

  it("RF-083 F-02: on Android, with TZ Europe/Madrid, the time dialog of a draft of 29 March 2026 at 02:30 opens on 02:30", async () => {
    process.env.TZ = "Europe/Madrid";
    jest.replaceProperty(Platform, "OS", "android");
    await render(field("2026-03-29", "02:30"));
    const value = await pickerValue("time");
    expect([value.getHours(), value.getMinutes()]).toEqual([2, 30]);
  });

  it("RF-083 F-02: the date picker still receives the draft's day on that date", async () => {
    process.env.TZ = "Europe/Madrid";
    await render(field("2026-03-29", "02:30"));
    const value = await pickerValue("date");
    expect(localParts(value).slice(0, 3)).toEqual([2026, 3, 29]);
  });

  it("RF-083 F-02: after the date picker moves to another day the time picker still shows the draft's time", async () => {
    process.env.TZ = "Europe/Madrid";
    await render(field("2026-03-28", "02:30"));
    await pickDate(2026, 3, 29);
    const value = await pickerValue("time");
    expect([value.getHours(), value.getMinutes()]).toEqual([2, 30]);
  });
});
