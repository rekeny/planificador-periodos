// T090: sequences, interruptions, mistakes and what is saved for the Android time field (RF-025,
// RF-083, RF-084, E-033, D51, D52). Same setup as new-match.time-states.android.test.tsx. After
// every step what the screen shows and what «Guardar» would save must agree (the bug of the iPhone
// of 2026-11-17, on the other platform). «Aceptar» is pickTime, «Cancelar» is dismissPicker.
import { act, screen } from "expo-router/testing-library";
import { Dimensions, Platform } from "react-native";

import { createSquadStore } from "@/state/squad-store";
import { resetMockDatabase } from "../support/mock-database";
import { useMockSquadStore } from "../support/mock-app-stores";
import { savedMatches } from "../support/new-match-fixtures";
import type { NewMatchDraft } from "../support/new-match-fixtures";
import {
  dismissPicker,
  localParts,
  pickDate,
  pickTime,
  pickerValue,
} from "../support/date-time-picker-double";
import {
  isPickerOpen,
  openPicker,
} from "../support/date-time-picker-native-double";
import {
  chooseFormatInForm,
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
  platform.restore();
});

const addButton = () => screen.queryByRole("button", { name: "Añadir hora" });
const clearButton = () => screen.queryByRole("button", { name: "Quitar hora" });
const timeButton = () => screen.queryByRole("button", { name: /^Hora/ });

/** The screen agrees with the draft: no time if and only if «Sin hora» is on screen. */
function expectScreenAgreesWithDraft(dialogOpen: boolean): void {
  const time = draft.getState().time;
  const without = time === null;
  expect(screen.queryByText("Sin hora") !== null).toBe(without);
  expect(addButton() !== null).toBe(without);
  expect(clearButton() === null).toBe(without);
  expect(timeButton() === null).toBe(without);
  expect(shownTimes()).toEqual(without ? [] : [time]);
  expect(isPickerOpen("time")).toBe(dialogOpen);
  expect(isPickerOpen("date")).toBe(false);
}

const STEPS: Record<string, () => Promise<void>> = {
  add: pressAddTime,
  cancel: () => dismissPicker("time"),
  "accept 18:30": () => pickTime(18, 30),
  "accept 09:05": () => pickTime(9, 5),
  "open Hora": () => openPicker("time"),
  clear: pressClearTime,
};
// The dialog is open right after «Añadir hora» or «Hora», until «Cancelar» or «Aceptar».
const OPENING = new Set(["add", "open Hora"]);
const SEQUENCES: [string][] = [
  ["add"],
  ["add, cancel"],
  ["add, accept 18:30, clear"],
  ["add, cancel, clear, add, cancel"],
  ["add, accept 09:05, open Hora, cancel, clear"],
];

describe("Android time field, sequences (RF-083, E-033)", () => {
  it.each(SEQUENCES)(
    "RF-083 E-033: after each step of «%s» the screen and the draft agree",
    async (sequence) => {
      await openFormAlone(alevin);
      expectScreenAgreesWithDraft(false);
      for (const name of sequence.split(", ")) {
        await STEPS[name]?.();
        expectScreenAgreesWithDraft(OPENING.has(name));
      }
    },
  );

  it("RF-083 E-033: choosing a date and then pressing «Añadir hora» gives 12:00 and keeps the date", async () => {
    await openFormAlone(alevin);
    await pickDate(2026, 11, 14);
    expect(isPickerOpen("date")).toBe(false);
    expect(screen.getByText("Sin hora")).toBeTruthy();
    await pressAddTime();
    expect(draft.getState()).toMatchObject({
      date: "2026-11-14",
      time: "12:00",
    });
  });
});

async function rotate(): Promise<void> {
  await act(() => {
    Dimensions.set({
      window: { width: 800, height: 400, scale: 2, fontScale: 1 },
    });
  });
}

describe("Android time field, interruptions and mistakes (RF-083, RF-084)", () => {
  it.each([
    "without a time",
    "with a time and the dialog closed",
    "with the dialog open after «Añadir hora»",
  ])(
    "RF-083: rotating the device keeps the state %s of the time field",
    async (state) => {
      await openFormAlone(alevin);
      if (!state.startsWith("without")) {
        await pressAddTime();
      }
      if (state.includes("closed")) {
        await dismissPicker("time");
      }
      const before = draft.getState().time;
      const dialogOpen = state.includes("open");
      await rotate();
      expect(draft.getState().time).toBe(before);
      expectScreenAgreesWithDraft(dialogOpen);
      expect(before === null).toBe(state.startsWith("without"));
      if (dialogOpen) {
        expect(localParts(await pickerValue("time")).slice(3)).toEqual([12, 0]);
      }
    },
  );

  it("RF-084 RF-083: changing the format with no time chosen keeps «Sin hora» and «Añadir hora»", async () => {
    await openFormAlone(alevin);
    await chooseFormatInForm(8);
    expect(screen.getByText("Sin hora")).toBeTruthy();
    expect(addButton()).toBeTruthy();
    expect(timeButton()).toBeNull();
    expect(draft.getState().time).toBeNull();
  });

  it("RF-083 E-033: opening the time dialog from «Hora» and cancelling it again and again keeps 12:00", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await dismissPicker("time");
    for (let round = 0; round < 2; round += 1) {
      await openPicker("time");
      expect(isPickerOpen("time")).toBe(true);
      await dismissPicker("time");
      expect(isPickerOpen("time")).toBe(false);
      expect(draft.getState().time).toBe("12:00");
    }
    expect(shownTimes()).toEqual(["12:00"]);
  });

  it("RF-083: each button exists only in its state: no «Añadir hora» after pressing it and no «Quitar hora» after pressing it", async () => {
    await openFormAlone(alevin);
    await pressAddTime();
    await dismissPicker("time");
    expect(addButton()).toBeNull();
    await pressClearTime();
    expect(clearButton()).toBeNull();
    expect(timeButton()).toBeNull();
  });
});

const SAVED_CASES: [string, string | null][] = [
  ["«Añadir hora» and «Cancelar»", "12:00"],
  ["«Añadir hora» and «Quitar hora»", null],
  ["«Añadir hora» and 18:30", "18:30"],
];

describe("Android time field, what is saved and what is typed (RF-025, RF-083, E-033)", () => {
  it.each(SAVED_CASES)(
    "RF-025 RF-083 E-033: the match created after %s is saved with the time %s",
    async (steps, time) => {
      await openFormAlone(alevin);
      await pressAddTime();
      if (steps.includes("Cancelar")) {
        await dismissPicker("time");
      } else if (steps.includes("Quitar")) {
        await dismissPicker("time");
        await pressClearTime();
      } else {
        await pickTime(18, 30);
      }
      expect(draft.getState().create().kind).toBe("saved");
      expect(savedMatches(db)).toMatchObject([{ time }]);
    },
  );

  it("RF-083: no editable text field is labelled «Fecha» or «Hora» on Android either, with or without a time", async () => {
    await openFormAlone(alevin);
    const looksLikeInput = () => [
      screen
        .queryAllByLabelText(/^(Fecha|Hora)/)
        .filter((node) => node.type === "TextInput"),
      screen.queryAllByDisplayValue(/\d{2}\/\d{2}\/\d{4}|\d{2}:\d{2}/),
    ];
    expect(looksLikeInput()).toEqual([[], []]);
    await pressAddTime();
    await dismissPicker("time");
    expect(looksLikeInput()).toEqual([[], []]);
  });
});
