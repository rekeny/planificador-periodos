// F-01 (Codex review of 2026-11-18), RF-076: with the keyboard open, the field being typed in stays
// above it. KeyboardAvoidingView alone guessed the overlap from its own position, which is wrong
// under a native header and inside the iOS modal sheet, so on iOS the ScrollView adjusts its insets
// itself and the KeyboardAvoidingView adds no padding; Android keeps `behavior="height"`. Jest has
// no real keyboard: the real proof is the simulator (small-change-form-keyboard-offset.md).
//
// F-A1 (Maestro run on Android, 2026-11-21): on Android the window does not resize, so the field
// that was tapped stayed under the keyboard. When the keyboard has shown, the form scrolls the
// focused field above it (small-change-form-android-keyboard.md). The tests give the form a
// keyboard event and a focused field at a chosen height, and read the scroll it asks for.
//
// The rendered native views do not carry `behavior`, so KeyboardAvoidingView is replaced by a spy
// that renders a plain view and records the props it is given.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Keyboard, Platform, ScrollView, TextInput } from "react-native";
import type { KeyboardEvent } from "react-native";

import { TeamForm } from "@/ui/team-form";

const AVOIDING_MODULE =
  "react-native/Libraries/Components/Keyboard/KeyboardAvoidingView";

jest.mock(
  "react-native/Libraries/Components/Keyboard/KeyboardAvoidingView",
  () => {
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const spy = jest.fn(
      (props: {
        testID?: string;
        style?: import("react-native").StyleProp<
          import("react-native").ViewStyle
        >;
        children?: React.ReactNode;
      }) =>
        createElement(
          View,
          { testID: props.testID, style: props.style },
          props.children,
        ),
    );
    return { __esModule: true, default: spy };
  },
);

const INITIAL = { name: "", category: "", defaultFormat: 6 } as const;

/** The `behavior` the form gave its KeyboardAvoidingView the last time it rendered. */
function avoidingBehavior(): unknown {
  const spy = jest.requireMock<{ default: jest.Mock }>(AVOIDING_MODULE).default;
  const props = spy.mock.calls.at(-1)?.[0] as { behavior?: unknown };
  return props.behavior;
}

function scrollAdjustsInsets(): unknown {
  return screen.getByTestId("form-scroll").props
    .automaticallyAdjustKeyboardInsets;
}

async function renderOn(os: "ios" | "android"): Promise<void> {
  jest.replaceProperty(Platform, "OS", os);
  await render(
    <TeamForm initialValues={INITIAL} onSave={() => ({ kind: "saved" })} />,
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("form keyboard room (F-01, RF-076)", () => {
  it("RF-076 F-01: on iOS the form's ScrollView adjusts its insets for the keyboard", async () => {
    await renderOn("ios");
    expect(scrollAdjustsInsets()).toBe(true);
  });

  it("RF-076 F-01: on iOS the KeyboardAvoidingView adds no padding, so the keyboard is not made room for twice", async () => {
    await renderOn("ios");
    expect(avoidingBehavior()).toBeUndefined();
  });

  it("RF-076 F-01: on Android the KeyboardAvoidingView keeps behavior «height» and the ScrollView does not adjust insets", async () => {
    await renderOn("android");
    expect({
      behavior: avoidingBehavior(),
      adjusts: scrollAdjustsInsets(),
    }).toEqual({ behavior: "height", adjusts: false });
  });
});

const KEYBOARD_TOP = 600;
const MARGIN = 16;

type Handler = (event: KeyboardEvent) => void;

/** Records what the form listens to on `Keyboard`, so a test can send the event itself. */
function recordKeyboard(): {
  show: (screenY?: number) => void;
  listening: () => string[];
  removed: jest.Mock;
} {
  const handlers = new Map<string, Handler>();
  const removed = jest.fn();
  jest.spyOn(Keyboard, "addListener").mockImplementation((name, handler) => {
    handlers.set(name, handler as Handler);
    return { remove: removed };
  });
  return {
    show: (screenY = KEYBOARD_TOP) => {
      handlers.get("keyboardDidShow")?.({
        endCoordinates: { screenY, screenX: 0, width: 1080, height: 400 },
      } as KeyboardEvent);
    },
    listening: () => [...handlers.keys()],
    removed,
  };
}

/** The scroll the form asks for. The ScrollView mock shares one `scrollTo` between tests, so it starts clean. */
function watchScroll(): jest.SpyInstance {
  const spy = jest.spyOn(ScrollView.prototype, "scrollTo");
  spy.mockClear();
  return spy;
}

/** The field the coach is typing in, drawn from `top` down for `height` points. */
function focusFieldAt(top: number, height = 50): void {
  jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
    measureInWindow: (
      done: (x: number, y: number, w: number, h: number) => void,
    ) => {
      done(0, top, 300, height);
    },
  } as never);
}

describe("form scrolls to the focused field on Android (F-A1, RF-076)", () => {
  it("RF-076 F-A1: on Android a field under the keyboard is scrolled up to just above it, with a margin", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await renderOn("android");
    focusFieldAt(700);
    keyboard.show();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({
      y: 700 + 50 + MARGIN - KEYBOARD_TOP,
      animated: true,
    });
  });

  it("RF-076 F-A1: on Android the scroll adds the offset the form already has", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await renderOn("android");
    await fireEvent.scroll(screen.getByTestId("form-scroll"), {
      nativeEvent: { contentOffset: { x: 0, y: 200 } },
    });
    focusFieldAt(700);
    keyboard.show();
    expect(scrollTo).toHaveBeenCalledWith({
      y: 200 + 700 + 50 + MARGIN - KEYBOARD_TOP,
      animated: true,
    });
  });

  it("RF-076 F-A1: on Android a field that is already above the keyboard does not scroll the form", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await renderOn("android");
    focusFieldAt(300);
    keyboard.show();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("RF-076 F-A1: on Android with no field focused the keyboard event scrolls nothing", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await renderOn("android");
    jest
      .spyOn(TextInput.State, "currentlyFocusedInput")
      .mockReturnValue(undefined);
    keyboard.show();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("RF-076 F-A1: on Android the form stops listening to the keyboard when it goes away", async () => {
    const keyboard = recordKeyboard();
    await renderOn("android");
    expect(keyboard.listening()).toEqual(["keyboardDidShow"]);
    await screen.unmount();
    expect(keyboard.removed).toHaveBeenCalledTimes(1);
  });

  it("RF-076 F-A1: on iOS the form does not listen to the keyboard, the system adjusts the insets", async () => {
    const scrollTo = watchScroll();
    const keyboard = recordKeyboard();
    await renderOn("ios");
    focusFieldAt(700);
    keyboard.show();
    expect(keyboard.listening()).toEqual([]);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
