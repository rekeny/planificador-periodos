// Jest environment of the grid's gestures (T065), loaded once for every test through jest.config.js.
// Gesture-handler 3 needs its own Jest setup (native module and detector mocks), and, under
// `expo-router/testing-library`, a Reanimated mock that has `isSharedValue` (see the second file).
import "react-native-gesture-handler/jestSetup";
import "../support/gesture-environment";

// The detector throws without a `GestureHandlerRootView` above it. The screens have the one of the
// root layout, but a component test renders a bare cell or grid, so the context that the detector
// checks starts as "present" everywhere. `GestureHandlerRootView` still provides it, as before.
jest.mock(
  "react-native-gesture-handler/lib/module/GestureHandlerRootViewContext",
  () => ({
    __esModule: true,
    default: jest
      .requireActual<typeof import("react")>("react")
      .createContext(true),
  }),
);

// The host view of the detector gets the number of its handler (`handlerTags`) as a prop, and the
// numbers only go up in one test run. A render tree would then differ between two draws of the same
// view for that number alone, so the host view drops it: nothing here reads it.

const hostWithoutTags = () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({ handlerTags: _tags, ...rest }: { handlerTags?: unknown }) =>
      createElement(View, rest),
  };
};
// The package has a source and a built copy and Jest loads one of them: both get the same mock.
// `doMock` is not hoisted above the imports, so these run after the ones of `jestSetup`, which
// mock the same modules, and replace them.
jest.doMock(
  "react-native-gesture-handler/lib/module/v3/detectors/HostGestureDetector",
  hostWithoutTags,
);
jest.doMock(
  "react-native-gesture-handler/src/v3/detectors/HostGestureDetector",
  hostWithoutTags,
);
