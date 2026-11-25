// T076, D3 rule 7 (RF-076, F-01, F-A1): the player screen keeps the field being typed in above the
// keyboard, and «Guardar» and «Desactivar» stay reachable by scrolling with the keyboard open. The
// approach is that of form-scroll.keyboard.test.tsx and match-details.keyboard.test.tsx, through the
// real route over the team screen: on iOS the ScrollView adjusts its own insets and the form does
// not listen to the keyboard; on Android the form scrolls the focused field, «Dorsal», the lowest
// one, to just above the keyboard. Jest has no real keyboard: the real proof is the device (T094,
// T079). Same doubles as player-screen.edit.test.tsx.
import { fireEvent, screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import { KEYBOARD_AWARE, inScroll, structure } from "../support/form-scroll";
import {
  KEYBOARD_MARGIN,
  KEYBOARD_TOP,
  focusFieldAt,
  recordKeyboard,
  watchScroll,
} from "../support/keyboard-spies";
import { hosts } from "../support/match-screen-questions";
import { typeNumber } from "../support/team-screen";
import {
  DEACTIVATE,
  actionButton,
  expectOnTeam,
  openPlayerFromTeam,
  savedRows,
  seedPlayerScreen,
} from "../support/player-screen";

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

let s: ReturnType<typeof seedPlayerScreen>;

afterEach(() => {
  jest.restoreAllMocks();
});

async function openOn(os: "ios" | "android"): Promise<void> {
  jest.replaceProperty(Platform, "OS", os);
  s = seedPlayerScreen();
  await openPlayerFromTeam(s.alevin, "Juan");
}

const scrollView = () => screen.getByTestId("form-scroll");

describe("player screen and the keyboard on iOS (RF-076, F-01)", () => {
  it("RF-076 F-01: the ScrollView of the player screen adjusts its insets for the keyboard, keeps taps, and the form does not listen to the keyboard", async () => {
    const keyboard = recordKeyboard();
    await openOn("ios");
    expect(scrollView().props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(structure()).toEqual(KEYBOARD_AWARE);
    expect(keyboard.listening()).toEqual([]);
  });
});

describe("player screen and the keyboard on Android (RF-076, F-A1)", () => {
  it("RF-076 F-A1: with the keyboard open on «Dorsal», the lowest field, the screen scrolls it to just above the keyboard", async () => {
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

  it("RF-076 F-A1: the screen stops listening to the keyboard when it goes away", async () => {
    const keyboard = recordKeyboard();
    await openOn("android");
    expect(keyboard.listening()).toEqual(["keyboardDidShow"]);
    await screen.unmount();
    expect(keyboard.removed).toHaveBeenCalledTimes(1);
  });
});

describe("player screen, «Guardar» and «Desactivar» with the keyboard open (D3 rule 7)", () => {
  it.each(["ios", "android"] as const)(
    "RF-076 RF-022 F-A1: on %s with the keyboard open on «Dorsal», «Guardar» and «Desactivar» are inside the scroll container, and a tap on «Desactivar» opens the confirmation",
    async (os) => {
      const keyboard = recordKeyboard();
      await openOn(os);
      expect(structure()).toEqual(KEYBOARD_AWARE);
      await typeNumber("9");
      focusFieldAt(300);
      keyboard.show();
      expect(inScroll().queryByLabelText("Dorsal")).not.toBeNull();
      expect(
        inScroll().queryByRole("button", { name: "Guardar" }),
      ).not.toBeNull();
      expect(
        inScroll().queryByRole("button", { name: DEACTIVATE }),
      ).not.toBeNull();
      await fireEvent.press(actionButton(DEACTIVATE));
      expect(hosts()).toHaveLength(1);
      expect(screen).toHavePathname(`/teams/${s.alevin}/players/${s.juan}`);
    },
  );

  it.each(["ios", "android"] as const)(
    "RF-076 RF-018 F-A1: on %s with the keyboard open, a tap on «Guardar» saves the typed number",
    async (os) => {
      const keyboard = recordKeyboard();
      await openOn(os);
      await typeNumber("9");
      focusFieldAt(300);
      keyboard.show();
      await fireEvent.press(
        inScroll().getByRole("button", { name: "Guardar" }),
      );
      await expectOnTeam(s.alevin);
      expect(savedRows(s.db, s.alevin)[0]).toMatchObject({ number: "9" });
    },
  );
});
