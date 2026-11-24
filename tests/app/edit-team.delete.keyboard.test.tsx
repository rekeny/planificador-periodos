// T077, D3 rule 7 (RF-076, F-01, F-A1): with the keyboard open on the lowest field of the edit-team
// form, «Guardar» and «Borrar equipo» stay inside the scroll container and a tap on «Borrar equipo»
// opens the confirmation; confirming then deletes. The approach is that of
// player-screen.keyboard.test.tsx: on iOS the ScrollView adjusts its own insets and the form does
// not listen to the keyboard; on Android the form scrolls the focused field. Jest has no real
// keyboard: the real proof is the device (T094, T079). Same doubles as edit-team.delete.test.tsx.
import { fireEvent, screen } from "expo-router/testing-library";
import { Platform } from "react-native";

import {
  DELETE_BUTTON,
  deleteButton,
  expectOnList,
  hosts,
  openFormFromList,
  pressConfirm,
  seedDeletable,
  teamIds,
} from "../support/edit-team-delete";
import { KEYBOARD_AWARE, inScroll, structure } from "../support/form-scroll";
import {
  focusFieldAt,
  recordKeyboard,
  watchScroll,
} from "../support/keyboard-spies";
import { typeCategory } from "../support/new-team-form";

// The KeyboardAvoidingView of react-native listens to the keyboard too, so it is replaced by a plain
// view, as player-screen.keyboard.test.tsx does: what is left is what the form itself listens to.
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

afterEach(() => {
  jest.restoreAllMocks();
});

async function openOn(
  os: "ios" | "android",
): Promise<ReturnType<typeof seedDeletable>> {
  jest.replaceProperty(Platform, "OS", os);
  const seeded = seedDeletable(10, 3);
  await openFormFromList();
  return seeded;
}

describe("edit-team form, «Borrar equipo» with the keyboard open (D3 rule 7)", () => {
  it.each(["ios", "android"] as const)(
    "RF-076 RF-015 F-A1: on %s with the keyboard open on «Categoría», «Guardar» and «Borrar equipo» are inside the scroll container, and a tap on «Borrar equipo» opens the confirmation",
    async (os) => {
      const keyboard = recordKeyboard();
      await openOn(os);
      expect(structure()).toEqual(KEYBOARD_AWARE);
      await typeCategory("2016");
      focusFieldAt(300);
      keyboard.show();
      expect(
        inScroll().queryByRole("button", { name: "Guardar" }),
      ).not.toBeNull();
      expect(
        inScroll().queryByRole("button", { name: DELETE_BUTTON }),
      ).not.toBeNull();
      await fireEvent.press(deleteButton());
      expect(hosts()).toHaveLength(1);
      expect(screen).toHavePathname("/teams/1/edit");
    },
  );

  it.each(["ios", "android"] as const)(
    "RF-076 RF-015 F-A1: on %s the confirmation opened with the keyboard open deletes the team when confirmed",
    async (os) => {
      const keyboard = recordKeyboard();
      const { db } = await openOn(os);
      focusFieldAt(300);
      keyboard.show();
      await fireEvent.press(deleteButton());
      await pressConfirm();
      await expectOnList();
      expect(teamIds(db)).toEqual([2]);
    },
  );

  it("RF-076 F-A1: on Android the form still scrolls the focused field to just above the keyboard once", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await openOn("android");
    focusFieldAt(700);
    keyboard.show();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("RF-076 F-01: on iOS the ScrollView adjusts its insets for the keyboard and the form does not listen to it", async () => {
    const keyboard = recordKeyboard();
    await openOn("ios");
    expect(
      screen.getByTestId("form-scroll").props.automaticallyAdjustKeyboardInsets,
    ).toBe(true);
    expect(keyboard.listening()).toEqual([]);
  });
});
