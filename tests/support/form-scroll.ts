// Steps of the tests of the scrollable, keyboard-aware forms (Codex re-run, RF-076). This file holds
// no test calls. Assumed structure of the team form, the player form and the new-match form: a
// KeyboardAvoidingView with testID "form-keyboard-avoiding" that holds a ScrollView with testID
// "form-scroll" and `keyboardShouldPersistTaps="handled"`; the fields, the validation messages, the
// save-error banner and «Guardar» are all descendants of that ScrollView, so a short landscape
// viewport or an open keyboard never leaves one of them out of reach.
import { screen, within } from "@testing-library/react-native";

export const SCROLL_ID = "form-scroll";
export const AVOIDING_ID = "form-keyboard-avoiding";

/** What is inside the scroll container of the form on the screen, to query only there. */
export function inScroll(): ReturnType<typeof within> {
  return within(screen.getByTestId(SCROLL_ID));
}

/** The scroll container sits inside the keyboard-avoiding view and keeps a tap on «Guardar». */
export function structure(): {
  scrollInsideAvoiding: boolean;
  persistTaps: unknown;
} {
  const avoiding = screen.getByTestId(AVOIDING_ID);
  return {
    scrollInsideAvoiding: within(avoiding).queryByTestId(SCROLL_ID) !== null,
    persistTaps: screen.getByTestId(SCROLL_ID).props.keyboardShouldPersistTaps,
  };
}

/** The labels of the controls that must be inside the scroll container, as the coach sees them. */
export function reachable(
  labels: readonly string[],
): { label: string; inside: boolean }[] {
  const scroll = inScroll();
  return labels.map((label) => ({
    label,
    inside:
      scroll.queryByLabelText(label) !== null ||
      scroll.queryByText(label) !== null ||
      scroll.queryByRole("button", { name: label }) !== null,
  }));
}

/** The expected result of `structure()`. */
export const KEYBOARD_AWARE = {
  scrollInsideAvoiding: true,
  persistTaps: "handled",
} as const;
