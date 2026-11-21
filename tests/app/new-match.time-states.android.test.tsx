// T090: the time field of the new-match form on Android, in its two states (RF-012, RF-025, RF-083,
// E-032, E-033, D51, D52). Without a time the field shows the button «Fecha», the label «Hora», «Sin
// hora» and the button «Añadir hora», and no «Hora» button, no dialog and no «Quitar hora»; «Añadir
// hora» puts 12:00 in the draft at once and opens the time dialog on 12:00. In the tests «Aceptar» is
// pickTime (the dialog reports its choice and closes) and «Cancelar» is dismissPicker (the dialog
// calls onDismiss). Real src/app routes and the real draft on the in-memory database; only the
// native picker module is replaced, by the native-equivalent double. Platform.OS is «android».
import { screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  dismissPicker,
  localParts,
  pickDate,
  pickTime,
  pickerProps,
  pickerValue,
} from "../support/date-time-picker-double";
import {
  isPickerOpen,
  openPicker,
  setDialogReportsOnMount,
} from "../support/date-time-picker-native-double";
import {
  freshDraft,
  openFormAlone,
  pressAddTime,
  pressClearTime,
  seedTeams,
  shownTimes,
} from "../support/new-match-form";

jest.mock("expo-sqlite", () => {
  throw new Error("expo-sqlite was loaded in Jest");
});
jest.mock("@/data/database", () =>
  jest
    .requireActual<typeof import("../support/mock-database")>(
      "../support/mock-database",
    )
    .mockDatabaseModule(),
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/database-ready", () => ({
  initializeDatabase: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/state/app-stores", () =>
  jest
    .requireActual<typeof import("../support/mock-app-stores")>(
      "../support/mock-app-stores",
    )
    .mockAppStoresModule(),
);
jest.mock("@expo/ui/community/datetime-picker", () =>
  jest
    .requireActual<typeof import("../support/date-time-picker-native-double")>(
      "../support/date-time-picker-native-double",
    )
    .nativeDateTimePickerModule(),
);

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;
let draft: NewMatchDraft;
let alevin: number;
let platform: ReturnType<typeof jest.replaceProperty>;

beforeEach(() => {
  platform = jest.replaceProperty(Platform, "OS", "android");
  db = resetMockDatabase();
  alevin = seedTeams(db).alevin;
  useMockSquadStore(createSquadStore(db));
  draft = freshDraft(db);
});

afterEach(() => {
  setDialogReportsOnMount(false);
  platform.restore();
});

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });
const timeButton = () => screen.queryByRole("button", { name: /^Hora/ });

/** The state without a time: «Fecha», «Hora», «Sin hora», «Añadir hora»; no «Hora» button, dialog, «Quitar hora» or time. */
function expectWithoutTime(): void {
  expect(screen.getByRole("button", { name: /^Fecha/ })).toBeTruthy();
  expect(screen.getByText("Hora")).toBeTruthy();
  expect(screen.getByText("Sin hora")).toBeTruthy();
  expect(addButton()).toBeTruthy();
  expect(timeButton()).toBeNull();
  expect(isPickerOpen("time")).toBe(false);
  expect(clearButton()).toBeNull();
  expect(shownTimes()).toEqual([]);
}

/** The state with a time: the «Hora» button shows it once, «Quitar hora»; no «Sin hora», no «Añadir hora». */
function expectWithTime(time: string): void {
  expect(timeButton()).toBeTruthy();
  expect(shownTimes()).toEqual([time]);
  expect(clearButton()).toBeTruthy();
  expect(screen.queryByText("Sin hora")).toBeNull();
  expect(addButton()).toBeNull();
}

describe("Android time field, without a time and with one (RF-012, RF-083, E-032, E-033)", () => {
  it("RF-083 E-033: a new form shows the button «Fecha», the label «Hora», «Sin hora» and «Añadir hora», and no «Hora» button, no open dialog, no «Quitar hora» and no time", async () => {
    await openFormAlone(alevin);
    expectWithoutTime();
    expect(isPickerOpen("date")).toBe(false);
    expect(draft.getState().time).toBeNull();
  });

  it("RF-012 RF-083 E-033: «Añadir hora» puts 12:00 in the draft at once and opens the time dialog on 12:00, with «Aceptar» and «Cancelar», and «Sin hora» and «Añadir hora» are gone", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    expect(draft.getState()).toMatchObject({
      date: "2026-11-11",
      time: "12:00",
    });
    expect(isPickerOpen("time")).toBe(true);
    expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
    const props = (await pickerProps("time")) as unknown as {
      presentation?: string;
      positiveButton?: { label?: string };
      negativeButton?: { label?: string };
    };
    expect(props.presentation).toBe("dialog");
    expect(props.positiveButton?.label).toBe("Aceptar");
    expect(props.negativeButton?.label).toBe("Cancelar");
    expectWithTime("12:00");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-083 E-033: «Cancelar» closes the dialog and keeps 12:00, and the «Hora» button shows «12:00» with «Quitar hora» reachable (D52)", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await dismissPicker("time");
    expect(isPickerOpen("time")).toBe(false);
    expect(draft.getState().time).toBe("12:00");
    expectWithTime("12:00");
    expect(screen.getByRole("button", { name: /^Hora/ })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-083 E-032: «Aceptar» with 18:30 shows 18:30 on the «Hora» button, closes the dialog and the draft keeps it", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    expect(shownTimes()).toEqual(["18:30"]);
    expect(isPickerOpen("time")).toBe(false);
    expect(draft.getState().time).toBe("18:30");
    expectWithTime("18:30");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-083 E-032 E-033: «Quitar hora» goes back to «Sin hora» and «Añadir hora», with no «Hora» button, no dialog and no «Quitar hora», and keeps the date", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    await pressClearTime();
    expectWithoutTime();
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(draft.getState()).toMatchObject({ date: "2026-03-01", time: null });
  });

  it("RF-083: the «Hora» button with a time opens the dialog on that time, «Cancelar» keeps it and «Aceptar» with 10:00 changes it", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    await openPicker("time");
    expect(localParts(await pickerValue("time")).slice(3)).toEqual([18, 30]);
    await dismissPicker("time");
    expect(isPickerOpen("time")).toBe(false);
    expect(draft.getState().time).toBe("18:30");
    await pickTime(10, 0);
    expect(draft.getState().time).toBe("10:00");
    expect(shownTimes()).toEqual(["10:00"]);
  });
});

describe("Android time field, boundaries (RF-083, E-033)", () => {
  it.each(["18:30", "00:00", "23:59", "09:05"])(
    "RF-083 E-033: «Añadir hora» after «Quitar hora» with %s chosen before gives 12:00 again, never the earlier time (D51)",
    async (earlier) => {
      const [hour = 0, minute = 0] = earlier.split(":").map(Number);
      await openFormAlone(alevin);
      await pressAddTime();
      await pickTime(hour, minute);
      await pressClearTime();
      await pressAddTime();
      expect(draft.getState().time).toBe("12:00");
      expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
      await dismissPicker("time");
      expect(shownTimes()).toEqual(["12:00"]);
    },
  );

  it("RF-083 E-033: «Añadir hora» after choosing 1 March 2026 keeps the date and opens the dialog on 12:00 of that day", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pressAddTime();
    expect(draft.getState()).toMatchObject({
      date: "2026-03-01",
      time: "12:00",
    });
    expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
  });

  it.each(["00:00", "23:59", "09:05", "12:00"])(
    "RF-083: «Aceptar» with the time %s shows it with two digits and the draft keeps it",
    async (chosen) => {
      const [hour = 0, minute = 0] = chosen.split(":").map(Number);
      await openFormAlone(alevin);
      await pressAddTime();
      await pickTime(hour, minute);
      expect(shownTimes()).toEqual([chosen]);
      expect(draft.getState().time).toBe(chosen);
      expect(isPickerOpen("time")).toBe(false);
    },
  );
});

describe("Android time field, a dialog that reports on mount (RF-083)", () => {
  it("RF-083: a time dialog that reports on mount saves nothing by itself: after «Añadir hora» the time stays 12:00, and only «Aceptar» with 10:00 changes it", async () => {
    setDialogReportsOnMount(true);
    await openFormAlone(alevin);
    await pressAddTime();
    expect(isPickerOpen("time")).toBe(true);
    expect(draft.getState().time).toBe("12:00");
    expect(shownTimes()).toEqual(["12:00"]);
    await pickTime(10, 0);
    expect(draft.getState().time).toBe("10:00");
    expect(shownTimes()).toEqual(["10:00"]);
    expect(isPickerOpen("time")).toBe(false);
  });

  it("RF-083: a dialog that reports on mount stays open and changes nothing, for «Hora» with 18:30 and for «Fecha»", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await pickTime(18, 30);
    setDialogReportsOnMount(true);
    await openPicker("time");
    expect(isPickerOpen("time")).toBe(true);
    expect(draft.getState().time).toBe("18:30");
    await dismissPicker("time");
    expect(draft.getState().time).toBe("18:30");
    await openPicker("date");
    expect(isPickerOpen("date")).toBe(true);
    expect(draft.getState()).toMatchObject({
      date: "2026-11-11",
      time: "18:30",
    });
  });
});
