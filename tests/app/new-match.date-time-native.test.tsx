// T082 (Codex re-run, blocking finding «Android assigns a time without user selection»): on Android
// the date and time pickers are dialogs the coach opens with the buttons «Fecha» and «Hora», only a
// CONFIRMED choice reaches the draft and the dialog is gone afterwards (RF-025, RF-026, RF-083,
// E-023, E-032). The double of tests/support/date-time-picker-native-double.ts reports the initial
// value on mount of an inline picker, as the installed Android component does. Platform.OS is
// «android». Real src/app routes and the real draft on the in-memory database.
import { act, screen } from "expo-router/testing-library";
import { Dimensions, Platform } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  dismissPicker,
  pickDate,
  pickTime,
} from "../support/date-time-picker-double";
import {
  isPickerOpen,
  openPicker,
} from "../support/date-time-picker-native-double";
import {
  chooseFormatInForm,
  freshDraft,
  openFormAlone,
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
  platform.restore();
});

async function rotate(): Promise<void> {
  await act(() => {
    Dimensions.set({
      window: { width: 800, height: 400, scale: 2, fontScale: 1 },
    });
  });
}

describe("Android, nothing chosen (RF-025, RF-026, RF-083, E-023)", () => {
  it("RF-025 RF-083 E-023: an untouched form has no time and today, and creating saves 2026-11-11 with no time", async () => {
    await openFormAlone(alevin);
    expect(shownTimes()).toEqual([]);
    expect(draft.getState()).toMatchObject({ date: "2026-11-11", time: null });
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-11", time: null },
    ]);
  });

  it("RF-083: both fields show a button «Fecha» and a button «Hora», and no dialog is open until one is pressed", async () => {
    await openFormAlone(alevin);
    expect(screen.getByRole("button", { name: /^Fecha/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Hora/ })).toBeTruthy();
    expect(isPickerOpen("date")).toBe(false);
    expect(isPickerOpen("time")).toBe(false);
  });

  it("RF-025 RF-083: opening «Hora» and «Fecha» only opens the dialogs and changes nothing in the draft", async () => {
    await openFormAlone(alevin);
    await openPicker("time");
    expect(isPickerOpen("time")).toBe(true);
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().time).toBeNull();
    await openPicker("date");
    expect(isPickerOpen("date")).toBe(true);
    expect(draft.getState()).toMatchObject({ date: "2026-11-11", time: null });
  });

  it("RF-083: no editable text field is labelled «Fecha» or «Hora» on Android either", async () => {
    await openFormAlone(alevin);
    const typed = screen
      .queryAllByLabelText(/^(Fecha|Hora)/)
      .filter((node) => node.type === "TextInput");
    expect(typed).toEqual([]);
    expect(
      screen.queryAllByDisplayValue(/\d{2}\/\d{2}\/\d{4}|\d{2}:\d{2}/),
    ).toEqual([]);
  });
});

describe("Android, confirming a choice (RF-025, RF-026, RF-083)", () => {
  it("RF-025 RF-083: opening «Hora» and confirming 09:05 shows 09:05, closes the dialog and saves 09:05", async () => {
    await openFormAlone(alevin);
    await pickTime(9, 5);
    expect(shownTimes()).toEqual(["09:05"]);
    expect(draft.getState().time).toBe("09:05");
    expect(isPickerOpen("time")).toBe(false);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-11-11", time: "09:05" },
    ]);
  });

  it("RF-026 RF-083: opening «Fecha» and confirming 14 November 2026 shows «14/11/2026», closes the dialog and adds no time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 11, 14);
    expect(screen.getByText("14/11/2026")).toBeTruthy();
    expect(isPickerOpen("date")).toBe(false);
    expect(draft.getState()).toMatchObject({ date: "2026-11-14", time: null });
    expect(shownTimes()).toEqual([]);
  });

  it("RF-026 RF-083: confirming a date and then a time keeps both, and the match is saved with them", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(shownTimes()).toEqual(["18:30"]);
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-03-01", time: "18:30" },
    ]);
  });
});

describe("Android, dismissing a dialog (RF-025, RF-026, RF-083)", () => {
  it("RF-025 RF-083: opening «Hora» and dismissing it keeps no time, closes the dialog and saves no time", async () => {
    await openFormAlone(alevin);
    await dismissPicker("time");
    expect(isPickerOpen("time")).toBe(false);
    expect(shownTimes()).toEqual([]);
    expect(draft.getState().time).toBeNull();
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([{ time: null }]);
  });

  it("RF-083: dismissing «Hora» after confirming 18:30 keeps 18:30", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await dismissPicker("time");
    expect(isPickerOpen("time")).toBe(false);
    expect(shownTimes()).toEqual(["18:30"]);
    expect(draft.getState().time).toBe("18:30");
  });

  it("RF-026 RF-083: opening «Fecha» and dismissing it keeps today, and after confirming 1 March 2026 keeps that date", async () => {
    await openFormAlone(alevin);
    await dismissPicker("date");
    expect(isPickerOpen("date")).toBe(false);
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(draft.getState().date).toBe("2026-11-11");
    await pickDate(2026, 3, 1);
    await dismissPicker("date");
    expect(screen.getByText("01/03/2026")).toBeTruthy();
    expect(draft.getState().date).toBe("2026-03-01");
  });
});

describe("Android, «Quitar hora» (RF-083, E-032)", () => {
  it("RF-083 E-032: «Quitar hora» after confirming 18:30 leaves no time, the date stays and the match is saved with no time", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 3, 1);
    await pickTime(18, 30);
    await pressClearTime();
    expect(shownTimes()).toEqual([]);
    expect(draft.getState()).toMatchObject({ date: "2026-03-01", time: null });
    expect(draft.getState().create().kind).toBe("saved");
    expect(savedMatches(db)).toMatchObject([
      { date: "2026-03-01", time: null },
    ]);
  });

  it("RF-083 E-032: after «Quitar hora» a format change, a rotation and a date choice do not bring a time back", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await pressClearTime();
    await chooseFormatInForm(8);
    expect(draft.getState().time).toBeNull();
    await rotate();
    expect(draft.getState().time).toBeNull();
    await pickDate(2026, 11, 14);
    expect(shownTimes()).toEqual([]);
    expect(draft.getState()).toMatchObject({ date: "2026-11-14", time: null });
  });

  it("RF-083 E-032: after «Quitar hora» the dialog of «Hora» can be opened, dismissed and confirmed again", async () => {
    await openFormAlone(alevin);
    await pickTime(18, 30);
    await pressClearTime();
    await dismissPicker("time");
    expect(draft.getState().time).toBeNull();
    await pickTime(10, 0);
    expect(shownTimes()).toEqual(["10:00"]);
    expect(draft.getState().time).toBe("10:00");
  });
});
