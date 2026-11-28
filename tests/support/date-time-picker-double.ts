// Test double of the native date and time pickers of the new-match form (T082). This file holds no
// test calls. The native pickers cannot render in Jest, so a test replaces the module the form
// imports them from, at the boundary, with `jest.mock("@expo/ui/community/datetime-picker", () =>
// jest.requireActual("../support/date-time-picker-double").dateTimePickerModule())`. The module is
// the SDK 58 drop-in `DateTimePicker` of `@expo/ui` (default export, API of
// `@react-native-community/datetimepicker`: `value`, `mode`, `onValueChange(event, date)` and
// `onDismiss()`, or the deprecated `onChange(event, date)`).
//
// The double renders a plain View with the testID `date-time-picker-<mode>` and keeps every prop the
// form gave it, so the helpers below can read `value` and call the callbacks the way the native
// picker does: «the user picked this date» and «the user dismissed the picker». Only the picker is
// replaced: the form, the draft and the domain are the real ones.
//
// Assumption: the form mounts one picker with `mode="date"` and one with `mode="time"`. If a picker
// is not mounted (an Android dialog opens on a press), the helpers press the button of its field,
// named «Fecha» or «Hora», first.
import { act, fireEvent, screen } from "expo-router/testing-library";
import { createElement } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import type { ViewProps } from "react-native";

export type PickerMode = "date" | "time";

interface PickerEvent {
  readonly nativeEvent: { timestamp: number; utcOffset: number };
}

interface PickerProps {
  readonly value: Date;
  readonly mode?: PickerMode | "datetime";
  readonly is24Hour?: boolean;
  readonly onValueChange?: (event: PickerEvent, date: Date) => void;
  readonly onChange?: (
    event: PickerEvent & { type: "set" | "dismissed" },
    date?: Date,
  ) => void;
  readonly onDismiss?: () => void;
}

function testIdOf(mode: string): string {
  return `date-time-picker-${mode}`;
}

function PickerDouble(props: PickerProps): ReactElement {
  const viewProps = {
    ...props,
    testID: testIdOf(props.mode ?? "date"),
  } as ViewProps;
  return createElement(View, viewProps);
}

/** What `jest.mock("@expo/ui/community/datetime-picker", factory)` returns. */
export function dateTimePickerModule(): {
  __esModule: true;
  default: typeof PickerDouble;
  DateTimePicker: typeof PickerDouble;
} {
  return {
    __esModule: true,
    default: PickerDouble,
    DateTimePicker: PickerDouble,
  };
}

function eventOf(date: Date): PickerEvent {
  return {
    nativeEvent: {
      timestamp: date.getTime(),
      utcOffset: -date.getTimezoneOffset(),
    },
  };
}

/** The picker of the mode, opening it first when the form shows it only after a press. */
export async function pickerProps(mode: PickerMode): Promise<PickerProps> {
  if (screen.queryByTestId(testIdOf(mode)) === null) {
    const field = mode === "date" ? /^Fecha/ : /^Hora/;
    await fireEvent.press(screen.getByRole("button", { name: field }));
  }
  return screen.getByTestId(testIdOf(mode)).props as PickerProps;
}

/** The `value` the form gave the picker of the mode. */
export async function pickerValue(mode: PickerMode): Promise<Date> {
  return (await pickerProps(mode)).value;
}

/** Year, month (1 to 12), day, hour and minute of a Date, in local time. */
export function localParts(date: Date): number[] {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

async function emit(props: PickerProps, picked: Date): Promise<void> {
  await act(() => {
    if (props.onValueChange !== undefined) {
      props.onValueChange(eventOf(picked), picked);
    } else {
      props.onChange?.({ type: "set", ...eventOf(picked) }, picked);
    }
  });
}

/** The user picks a day: the picker reports its own value moved to that day (as the native one does). */
export async function pickDate(
  year: number,
  month: number,
  day: number,
): Promise<void> {
  const props = await pickerProps("date");
  const picked = new Date(props.value);
  picked.setFullYear(year, month - 1, day);
  await emit(props, picked);
}

/** The user picks a time of day: the picker reports its own value moved to that hour and minute. */
export async function pickTime(hour: number, minute: number): Promise<void> {
  const props = await pickerProps("time");
  const picked = new Date(props.value);
  picked.setHours(hour, minute, 0, 0);
  await emit(props, picked);
}

/** The user closes the picker without choosing (Android cancel, or a tap outside). */
export async function dismissPicker(mode: PickerMode): Promise<void> {
  const props = await pickerProps(mode);
  await act(() => {
    if (props.onDismiss !== undefined) {
      props.onDismiss();
    } else {
      props.onChange?.(
        { type: "dismissed", ...eventOf(props.value) },
        props.value,
      );
    }
  });
}
