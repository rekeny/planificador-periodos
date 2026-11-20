// F-01 (Codex review of 2026-11-18), RF-076: with the keyboard open, the field being typed in stays
// above it. KeyboardAvoidingView alone guessed the overlap from its own position, which is wrong
// under a native header and inside the iOS modal sheet, so on iOS the ScrollView adjusts its insets
// itself and the KeyboardAvoidingView adds no padding; Android keeps `behavior="height"`. Jest has
// no real keyboard: the real proof is the simulator (small-change-form-keyboard-offset.md).
//
// The rendered native views do not carry `behavior`, so KeyboardAvoidingView is replaced by a spy
// that renders a plain view and records the props it is given.
import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

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
