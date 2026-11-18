// T090: the date and time field alone, on Android (RF-083, E-032, E-033, D52). It is driven only by
// its props: with `time` null it shows the button «Fecha», the label «Hora», «Sin hora» and «Añadir
// hora», and no «Hora» button, no dialog and no «Quitar hora»; with a time it shows the «Hora» button
// and «Quitar hora». «Añadir hora» asks the parent for 12:00 and opens the time dialog. Platform.OS is
// «android». The native picker module is replaced by the native-equivalent double of tests/support.
import "@/i18n";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { DateTimeFieldAndroid } from "@/ui/date-time-field-android";
import {
  dismissPicker,
  localParts,
  pickerValue,
} from "../../tests/support/date-time-picker-double";
import {
  isPickerOpen,
  setDialogReportsOnMount,
} from "../../tests/support/date-time-picker-native-double";

jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<{ nativeDateTimePickerModule: () => object }>(
      "../../tests/support/date-time-picker-native-double",
    )
    .nativeDateTimePickerModule(),
);

let platform: ReturnType<typeof jest.replaceProperty>;

beforeEach(() => {
  platform = jest.replaceProperty(Platform, "OS", "android");
});

afterEach(() => {
  setDialogReportsOnMount(false);
  platform.restore();
});

function spies() {
  return {
    onDateChange: jest.fn(),
    onTimeChange: jest.fn(),
    onClearTime: jest.fn(),
  };
}

function field(time: string | null, handlers = spies()) {
  return <DateTimeFieldAndroid date="2026-11-11" time={time} {...handlers} />;
}

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });
const timeButton = () => screen.queryByRole("button", { name: /^Hora/ });
const pressed = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));

function expectWithoutTime(): void {
  expect(screen.getByRole("button", { name: /^Fecha/ })).toBeOnTheScreen();
  expect(screen.getByText("Hora")).toBeOnTheScreen();
  expect(screen.getByText("Sin hora")).toBeOnTheScreen();
  expect(addButton()).toBeOnTheScreen();
  expect(timeButton()).toBeNull();
  expect(isPickerOpen("time")).toBe(false);
  expect(isPickerOpen("date")).toBe(false);
  expect(clearButton()).toBeNull();
}

describe("DateTimeFieldAndroid, driven by its props", () => {
  it.each(["00:00", "12:00", "18:30", "23:59"])(
    "RF-083 E-032: with the time %s the field shows the «Hora» button with the time and «Quitar hora», and neither «Sin hora» nor «Añadir hora»",
    async (time) => {
      await render(field(time));
      expect(timeButton()).toBeOnTheScreen();
      expect(screen.getAllByText(time)).toHaveLength(1);
      expect(clearButton()).toBeOnTheScreen();
      expect(screen.queryByText("Sin hora")).toBeNull();
      expect(addButton()).toBeNull();
      expect(isPickerOpen("time")).toBe(false);
    },
  );

  it("RF-083: with time null the field shows «Sin hora» and «Añadir hora», no «Hora» button and no dialog, and mounting calls neither onTimeChange nor onClearTime", async () => {
    setDialogReportsOnMount(true);
    const handlers = spies();
    const view = await render(field(null, handlers));
    expectWithoutTime();
    await view.rerender(field("18:30", handlers));
    expect(timeButton()).toBeOnTheScreen();
    expect(isPickerOpen("time")).toBe(false);
    await view.unmount();
    await render(field("18:30", handlers));
    expect(handlers.onTimeChange).not.toHaveBeenCalled();
    expect(handlers.onClearTime).not.toHaveBeenCalled();
    expect(handlers.onDateChange).not.toHaveBeenCalled();
  });

  it("RF-083 E-033: «Añadir hora» calls onTimeChange once with 12:00 and opens the dialog, «Cancelar» calls nothing more, and «Quitar hora» calls onClearTime once", async () => {
    const handlers = spies();
    const view = await render(field(null, handlers));
    await pressed("Añadir hora");
    expect(handlers.onTimeChange).toHaveBeenCalledTimes(1);
    expect(handlers.onTimeChange).toHaveBeenCalledWith({ hour: 12, minute: 0 });
    expect(isPickerOpen("time")).toBe(true);
    expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
    await dismissPicker("time");
    expect(isPickerOpen("time")).toBe(false);
    expect(handlers.onTimeChange).toHaveBeenCalledTimes(1);
    // The parent owns `time`: it was not updated here, so the field still shows no time.
    expect(timeButton()).toBeNull();
    await act(() => view.rerender(field("12:00", handlers)));
    expect(timeButton()).toBeOnTheScreen();
    await pressed("Quitar hora");
    expect(handlers.onClearTime).toHaveBeenCalledTimes(1);
    expect(handlers.onClearTime).toHaveBeenCalledWith();
    expect(handlers.onTimeChange).toHaveBeenCalledTimes(1);
  });
});
