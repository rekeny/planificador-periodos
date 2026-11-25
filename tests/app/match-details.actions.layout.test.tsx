// T096, D3 rules 6 and 7 (RF-029, RF-039, RF-076): «Borrar partido» and the two confirmations in the
// assembled match details, with an overtime, at 375 × 667 and 667 × 375 (phone) and 1024 × 768 and
// 768 × 1024 (tablet), and «Borrar partido» reachable by scrolling with the keyboard open. Jest has
// no layout engine, so these tests check the configuration; the geometry is checked on a device
// (T094, T079). The keyboard approach is that of match-details.keyboard.test.tsx.
import { fireEvent, screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import { openDetailsFromGrid, seedDetails } from "../support/match-details";
import {
  DELETE_CONFIRM,
  DELETE_TITLE,
  FORMAT_CONFIRM,
  FORMAT_TITLE,
  deleteButton,
  dialog,
  hosts,
  pickFormat,
  pressDelete,
  pressInDialog,
} from "../support/match-details-actions";
import { KEYBOARD_AWARE, inScroll, structure } from "../support/form-scroll";
import { focusFieldAt, recordKeyboard } from "../support/keyboard-spies";
import { notesField, typeIn } from "../support/new-match-form";
import { restoreWindow, setWindow } from "../support/window-size";

// The KeyboardAvoidingView of react-native listens to the keyboard too, so it is replaced by a plain
// view, as match-details.keyboard.test.tsx does: what is left is what the form itself listens to.
jest.mock(
  "react-native/Libraries/Components/Keyboard/KeyboardAvoidingView",
  () => {
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    return {
      __esModule: true,
      default: (props: { testID?: string; children?: React.ReactNode }) =>
        createElement(View, { testID: props.testID }, props.children),
    };
  },
);
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

afterEach(async () => {
  jest.restoreAllMocks();
  await restoreWindow();
});

const SIZES = [
  ["a phone in portrait", { width: 375, height: 667 }],
  ["a phone in landscape", { width: 667, height: 375 }],
  ["a tablet in landscape", { width: 1024, height: 768 }],
  ["a tablet in portrait", { width: 768, height: 1024 }],
] as const;

async function openAt(window: { width: number; height: number }) {
  seedDetails({ overtimeCount: 1 });
  await setWindow(window.width, window.height);
  await openDetailsFromGrid(1);
}

describe("match details, «Borrar partido» and the two confirmations in the assembled screen (D3 rule 6)", () => {
  it.each(SIZES)(
    "RF-029 RF-076: on %s «Borrar partido» is drawn once, inside the scroll container, and opens a dialog with its title, «Cancelar» and the confirm button",
    async (_name, window) => {
      await openAt(window);
      expect(
        inScroll().queryAllByRole("button", { name: "Borrar partido" }),
      ).toHaveLength(1);
      await pressDelete();
      expect(hosts()).toHaveLength(1);
      expect(dialog().getByText(DELETE_TITLE)).toBeTruthy();
      expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(
        dialog().getByRole("button", { name: DELETE_CONFIRM }),
      ).toBeTruthy();
    },
  );

  it.each(SIZES)(
    "RF-039 RF-076: on %s choosing another format opens a dialog with its title, «Cancelar» and the confirm button",
    async (_name, window) => {
      await openAt(window);
      await pickFormat(8);
      expect(hosts()).toHaveLength(1);
      expect(dialog().getByText(FORMAT_TITLE)).toBeTruthy();
      expect(dialog().getByRole("button", { name: "Cancelar" })).toBeTruthy();
      expect(
        dialog().getByRole("button", { name: FORMAT_CONFIRM }),
      ).toBeTruthy();
      await pressInDialog("Cancelar");
      expect(hosts()).toHaveLength(0);
    },
  );
});

describe("match details, the destructive button and the keyboard (D3 rule 7, RF-076, F-A1)", () => {
  it.each(["ios", "android"] as const)(
    "RF-029 RF-076 F-A1: on %s «Borrar partido» is inside the scroll container that keeps taps, so it is reached by scrolling with the keyboard open, and a tap on it opens the confirmation",
    async (os) => {
      jest.replaceProperty(Platform, "OS", os);
      const keyboard = recordKeyboard();
      seedDetails();
      await openDetailsFromGrid(1);
      expect(structure()).toEqual(KEYBOARD_AWARE);
      await typeIn(notesField(), "Nota larga");
      focusFieldAt(300);
      keyboard.show();
      expect(
        inScroll().queryByRole("button", { name: "Borrar partido" }),
      ).not.toBeNull();
      await fireEvent.press(deleteButton());
      expect(dialog().getByText(DELETE_TITLE)).toBeTruthy();
      expect(screen).toHavePathname("/matches/1/edit");
    },
  );
});
