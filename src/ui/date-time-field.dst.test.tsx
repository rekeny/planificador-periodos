// F-02 (Codex review of 2026-11-18): the time picker was given a Date built from the draft's date
// and time, and on the day the clocks go forward a time that does not exist (02:30 in Spain on
// 29 March 2026) became 03:30, so the picker disagreed with the draft, the text and what is saved.
// The time picker now gets its Date on a fixed reference day (small-change-form-picker-dst-drift.md).
// The suite runs in Europe/Madrid (tests/setup/time-zone.js); the other zones are in
// date-time-field.zones.test.ts. The field is driven by a parent that keeps the draft, as the form does.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import { useState } from "react";
import type { ReactElement } from "react";
import { Platform } from "react-native";

import { DateTimeField } from "@/ui/date-time-field";
import { toLocalDate, toLocalTime } from "@/ui/date-time-field-shared";
import {
  localParts,
  pickDate,
  pickTime,
  pickerValue,
} from "../../tests/support/date-time-picker-double";

jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<{ dateTimePickerModule: () => object }>(
      "../../tests/support/date-time-picker-double",
    )
    .dateTimePickerModule(),
);

const two = (value: number): string => String(value).padStart(2, "0");

/** The draft of the form: the field reports changes and this parent keeps them. */
function Draft({
  date: first,
  time: firstTime,
}: {
  readonly date: string;
  readonly time: string | null;
}): ReactElement {
  const [date, setDate] = useState(first);
  const [time, setTime] = useState(firstTime);
  return (
    <DateTimeField
      date={date}
      time={time}
      onDateChange={({ year, month, day }) =>
        setDate(`${year}-${two(month)}-${two(day)}`)
      }
      onTimeChange={({ hour, minute }) =>
        setTime(`${two(hour)}:${two(minute)}`)
      }
      onClearTime={() => setTime(null)}
    />
  );
}

const platforms: [string, "ios" | "android"][] = [
  ["iOS", "ios"],
  ["Android", "android"],
];

async function timeOfDay(): Promise<number[]> {
  return localParts(await pickerValue("time")).slice(3);
}

describe("the time picker on a daylight-saving day (F-02, RF-083)", () => {
  it("RF-083 F-02: the Date built from 29 March 2026 and 02:30 is shifted to 03:30 in Spain, the reason the time picker has its own Date", () => {
    expect(toLocalDate("2026-03-29", "02:30").getHours()).toBe(3);
    expect(toLocalTime("02:30").getHours()).toBe(2);
  });

  it.each(platforms)(
    "RF-083 F-02: on %s a draft of 29 March 2026 at 02:30 gives the time picker 02:30",
    async (_name, os) => {
      jest.replaceProperty(Platform, "OS", os);
      await render(<Draft date="2026-03-29" time="02:30" />);
      expect(await timeOfDay()).toEqual([2, 30]);
    },
  );

  it.each(platforms)(
    "RF-083 F-02: on %s the date picker still receives the draft's day on that date",
    async (_name, os) => {
      jest.replaceProperty(Platform, "OS", os);
      await render(<Draft date="2026-03-29" time="02:30" />);
      const value = await pickerValue("date");
      expect(localParts(value).slice(0, 3)).toEqual([2026, 3, 29]);
    },
  );

  it.each(platforms)(
    "RF-083 F-02: on %s, after the date picker moves the draft to 29 March 2026, the draft, the text and the time picker all keep 02:30",
    async (_name, os) => {
      jest.replaceProperty(Platform, "OS", os);
      await render(<Draft date="2026-03-28" time="02:30" />);
      await pickDate(2026, 3, 29);
      expect(screen.getByText("29/03/2026")).toBeOnTheScreen();
      expect(screen.getByText("02:30")).toBeOnTheScreen();
      expect(await timeOfDay()).toEqual([2, 30]);
    },
  );

  it.each(platforms)(
    "RF-083 F-02: on %s, picking 02:30 with the time picker on 29 March 2026 saves 02:30 and not 03:30",
    async (_name, os) => {
      jest.replaceProperty(Platform, "OS", os);
      await render(<Draft date="2026-03-29" time="12:00" />);
      await pickTime(2, 30);
      expect(screen.getByText("02:30")).toBeOnTheScreen();
      expect(screen.queryByText("03:30")).toBeNull();
      expect(await timeOfDay()).toEqual([2, 30]);
    },
  );
});
