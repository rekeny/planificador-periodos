// T072, D3 rule 7 (RF-076, F-01, F-A1): the details form on its route keeps the field being typed in
// above the keyboard and «Guardar» reachable. The approach is that of form-scroll.keyboard.test.tsx,
// here through the real route over the grid: on iOS the ScrollView adjusts its own insets and the
// form does not listen to the keyboard; on Android the form scrolls the focused field, the lowest
// one («Notas»), to just above the keyboard. Jest has no real keyboard: the real proof is the device
// (T094, T079). Same doubles as match-details.form.test.tsx.
import { fireEvent, screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import { resetMockDatabase } from "../support/mock-database";
import {
  openDetailsFromGrid,
  savedMatch,
  seedDetails,
} from "../support/match-details";
import { KEYBOARD_AWARE, inScroll, structure } from "../support/form-scroll";
import {
  KEYBOARD_MARGIN,
  KEYBOARD_TOP,
  focusFieldAt,
  recordKeyboard,
  watchScroll,
} from "../support/keyboard-spies";
import { notesField, typeIn } from "../support/new-match-form";
import { waitForPathname } from "../support/new-match-save";

// The KeyboardAvoidingView of react-native listens to the keyboard too, so it is replaced by a plain
// view, as form-scroll.keyboard.test.tsx does: what is left is what the form itself listens to.
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

type Db = ReturnType<typeof resetMockDatabase>;
let db: Db;

afterEach(() => {
  jest.restoreAllMocks();
});

async function openOn(os: "ios" | "android"): Promise<void> {
  jest.replaceProperty(Platform, "OS", os);
  ({ db } = seedDetails());
  await openDetailsFromGrid(1);
}

const scrollView = () => screen.getByTestId("form-scroll");

describe("match details and the keyboard on iOS (RF-076, F-01)", () => {
  it("RF-076 F-01: the ScrollView of the details adjusts its insets for the keyboard, keeps taps, and the form does not listen to the keyboard", async () => {
    const keyboard = recordKeyboard();
    await openOn("ios");
    expect(scrollView().props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(structure()).toEqual(KEYBOARD_AWARE);
    expect(keyboard.listening()).toEqual([]);
  });
});

describe("match details and the keyboard on Android (RF-076, F-A1)", () => {
  it("RF-076 F-A1: with the keyboard open on «Notas», the lowest field, the details scroll it to just above the keyboard", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await openOn("android");
    expect(scrollView().props.automaticallyAdjustKeyboardInsets).toBe(false);
    focusFieldAt(700);
    keyboard.show();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({
      y: 700 + 50 + KEYBOARD_MARGIN - KEYBOARD_TOP,
      animated: true,
    });
  });

  it("RF-076 F-A1: «Notas» and «Guardar» are inside the scroll container, so «Guardar» is reached by scrolling with the keyboard open, and a tap on it saves", async () => {
    const keyboard = recordKeyboard();
    await openOn("android");
    expect(structure()).toEqual(KEYBOARD_AWARE);
    await typeIn(notesField(), "Nota larga");
    focusFieldAt(300);
    keyboard.show();
    expect(inScroll().queryByLabelText("Notas")).not.toBeNull();
    await fireEvent.press(inScroll().getByRole("button", { name: "Guardar" }));
    await waitForPathname("/matches/1");
    expect(savedMatch(db, 1)).toMatchObject({ notes: "Nota larga" });
  });

  it("RF-076 F-A1: the details stop listening to the keyboard when they go away", async () => {
    const keyboard = recordKeyboard();
    await openOn("android");
    expect(keyboard.listening()).toEqual(["keyboardDidShow"]);
    await screen.unmount();
    expect(keyboard.removed).toHaveBeenCalledTimes(1);
  });
});
