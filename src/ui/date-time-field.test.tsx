// T089: the date and time field alone, on iOS (RF-083, E-032, E-033). It is driven only by its props:
// with `time` null it shows «Hora», «Sin hora» and «Añadir hora» and no time picker or «Quitar hora»;
// with a time it shows the time picker and «Quitar hora». Platform.OS is jest-expo's default, «ios».
// The native picker module is replaced by the native-equivalent double of tests/support.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { DateTimeField } from "@/ui/date-time-field";
import { pickTime } from "../../tests/support/date-time-picker-double";
import { isPickerOpen } from "../../tests/support/date-time-picker-native-double";

jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<{ nativeDateTimePickerModule: () => object }>(
      "../../tests/support/date-time-picker-native-double",
    )
    .nativeDateTimePickerModule(),
);

function spies() {
  return {
    onDateChange: jest.fn(),
    onTimeChange: jest.fn(),
    onClearTime: jest.fn(),
  };
}

function field(time: string | null, handlers = spies()) {
  return <DateTimeField date="2026-11-11" time={time} {...handlers} />;
}

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });
const pressed = (name: string) =>
  fireEvent.press(screen.getByRole("button", { name }));

function expectWithoutTime(): void {
  expect(screen.getByText("Hora")).toBeOnTheScreen();
  expect(screen.getByText("Sin hora")).toBeOnTheScreen();
  expect(addButton()).toBeOnTheScreen();
  expect(isPickerOpen("time")).toBe(false);
  expect(clearButton()).toBeNull();
}

function expectWithTime(): void {
  expect(isPickerOpen("time")).toBe(true);
  expect(clearButton()).toBeOnTheScreen();
  expect(screen.queryByText("Sin hora")).toBeNull();
  expect(addButton()).toBeNull();
}

describe("DateTimeField on iOS, driven by its props", () => {
  it.each(["00:00", "12:00", "18:30", "23:59"])(
    "RF-083 E-032: with the time %s the field shows the time picker and «Quitar hora», and neither «Sin hora» nor «Añadir hora»",
    async (time) => {
      await render(field(time));
      expectWithTime();
      expect(screen.getByText(time)).toBeOnTheScreen();
    },
  );

  it("RF-083 E-032: with time null the field shows «Sin hora» and «Añadir hora», and rerendered with a time and then with null it follows its props", async () => {
    const handlers = spies();
    const view = await render(field(null, handlers));
    expectWithoutTime();
    await view.rerender(field("18:30", handlers));
    expectWithTime();
    await view.rerender(field(null, handlers));
    expectWithoutTime();
  });

  it("RF-083: mounting the field calls neither onTimeChange nor onClearTime, with a time or without", async () => {
    const handlers = spies();
    const view = await render(field(null, handlers));
    await view.rerender(field("18:30", handlers));
    await view.unmount();
    await render(field("18:30", handlers));
    expect(handlers.onTimeChange).not.toHaveBeenCalled();
    expect(handlers.onClearTime).not.toHaveBeenCalled();
  });

  it("RF-083 E-033: «Añadir hora» calls onTimeChange once with 12:00, «Quitar hora» calls onClearTime once, and a picker choice calls onTimeChange with its hour and minute", async () => {
    const withoutTime = spies();
    const first = await render(field(null, withoutTime));
    await pressed("Añadir hora");
    expect(withoutTime.onTimeChange).toHaveBeenCalledTimes(1);
    expect(withoutTime.onTimeChange).toHaveBeenCalledWith({
      hour: 12,
      minute: 0,
    });
    await first.unmount();
    const withTime = spies();
    await render(field("12:00", withTime));
    await pressed("Quitar hora");
    expect(withTime.onClearTime).toHaveBeenCalledTimes(1);
    expect(withTime.onClearTime).toHaveBeenCalledWith();
    await pickTime(18, 30);
    expect(withTime.onTimeChange).toHaveBeenCalledTimes(1);
    expect(withTime.onTimeChange).toHaveBeenCalledWith({
      hour: 18,
      minute: 30,
    });
  });
});
