// Native-equivalent double of the date and time pickers (T082, Codex re-run finding «Android assigns
// a time without user selection»). This file holds no test calls. Use it like the older double,
// `jest.mock("@expo/ui/community/datetime-picker", () =>
// jest.requireActual("../support/date-time-picker-native-double").nativeDateTimePickerModule())`,
// and keep using pickDate, pickTime, dismissPicker and pickerValue of date-time-picker-double.ts:
// the rendered View has the same testID and keeps the same props.
//
// What the older double hides is modelled here from the installed @expo/ui 58 sources:
// - Android inline (`presentation="inline"`): node_modules/@expo/ui/android/src/main/java/expo/
//   modules/ui/DatePickerView.kt, lines 518-520 (date) and 580-588 (time), a `LaunchedEffect` calls
//   `onDateSelected` with the picker's INITIAL value as soon as it composes, and again each time `value` changes, because `remember(initialDate, ...)` (lines 508
//   and 567) builds a new state. DateTimePicker.android.tsx (lines 82-90) turns it into `onValueChange(event, date)`.
// - Android dialog (`presentation="dialog"`, the default of the Android component): the dialogs only
//   report from the confirm button (DatePickerView.kt lines 397 and 461) and call `onDismiss` when
//   cancelled; nothing is reported on mount.
// - iOS (DatePickerView.swift lines 19-21): `onDateChange` fires only when the date differs from the
//   `selection` prop, so mounting the picker reports nothing.
import { createElement, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { Platform } from "react-native";
import { fireEvent, screen } from "expo-router/testing-library";

import { dateTimePickerModule } from "./date-time-picker-double";
import type { PickerMode } from "./date-time-picker-double";

const Base = dateTimePickerModule().default;
type NativeProps = Parameters<typeof Base>[0] & {
  readonly presentation?: "inline" | "dialog";
};

function reportsOnMount(
  presentation: "inline" | "dialog" | undefined,
): boolean {
  return Platform.OS === "android" && presentation === "inline";
}

// `remember(initialDate)` of the Android picker builds a new state when `value` changes (time mode:
// the instant; date mode: the calendar day), and the new state reports its initial value again.
function stateKey(props: NativeProps): string {
  const { value, mode } = props;
  return mode === "time"
    ? String(value.getTime())
    : `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function NativePickerDouble(props: NativeProps): ReactElement {
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const key = stateKey(props);
  const presentation = props.presentation;
  useEffect(() => {
    const { value, onValueChange } = latest.current;
    if (reportsOnMount(presentation)) {
      onValueChange?.(
        {
          nativeEvent: {
            timestamp: value.getTime(),
            utcOffset: -value.getTimezoneOffset(),
          },
        },
        value,
      );
    }
  }, [key, presentation]);
  return createElement(Base, props);
}

/** What `jest.mock("@expo/ui/community/datetime-picker", factory)` returns. */
export function nativeDateTimePickerModule(): {
  __esModule: true;
  default: typeof NativePickerDouble;
  DateTimePicker: typeof NativePickerDouble;
} {
  return {
    __esModule: true,
    default: NativePickerDouble,
    DateTimePicker: NativePickerDouble,
  };
}

/** The coach presses the button «Fecha» or «Hora» that opens the Android dialog. */
export async function openPicker(mode: PickerMode): Promise<void> {
  const name = mode === "date" ? /^Fecha/ : /^Hora/;
  await fireEvent.press(screen.getByRole("button", { name }));
}

/** Whether a picker of the mode is mounted (an Android dialog is open). */
export function isPickerOpen(mode: PickerMode): boolean {
  return screen.queryByTestId(`date-time-picker-${mode}`) !== null;
}
