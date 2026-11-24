// The Jest environment of the gesture tests (T065). This file holds no test calls; importing it is
// the whole effect. `expo-router/testing-library` registers a mock of `react-native-reanimated`
// whose own `require('react-native-reanimated/mock')` fails in this project (`setCSSEventHandler is
// not available in JSReanimated`), so the mock falls back to `{}`. Gesture-handler 3 then finds a
// Reanimated without `isSharedValue` and every gesture hook crashes with "Reanimated.isSharedValue
// is not a function". The cell does not use Reanimated (no worklets, JavaScript-thread callbacks),
// so no value is ever shared, and the missing function is added to that mock, always answering no.
// The import comes first so the mock exists; the real module, when it is the one loaded, already
// has the function and is left alone.
import "expo-router/testing-library";

const reanimated: { isSharedValue?: (value: unknown) => boolean } =
  jest.requireMock("react-native-reanimated");

if (typeof reanimated.isSharedValue !== "function") {
  reanimated.isSharedValue = () => false;
}
