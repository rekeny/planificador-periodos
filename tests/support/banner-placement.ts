// Where the save-error banner is drawn (fourth Codex review, finding 4, RF-085, RF-076). This file
// holds no test calls. The banner is the element with the role «alert». It overlaps what is under
// it when it, or any wrapper above it, is positioned absolutely: then it is out of the layout flow
// and nothing reserves its space. Normal flow, above or below the toolbar, never overlaps.
import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SAVE_FAILED } from "./call-up-screen";

type Element = ReturnType<typeof screen.getByRole>;

// The native-stack mock wraps every screen in an `RNSScreen` host that is absolutely positioned to
// fill the window: that is the screen itself, not an overlay, so the walk stops before it.
const SCREEN_HOST = "RNSScreen";

/** Whether the element or a wrapper inside its screen is positioned absolutely. */
export function isOverlay(element: Element): boolean {
  let node: Element | null = element;
  while (node !== null && node.type !== SCREEN_HOST) {
    if (StyleSheet.flatten(node.props.style)?.position === "absolute") {
      return true;
    }
    node = node.parent;
  }
  return false;
}

/** After a failed action: the banner shows its text and is drawn in normal flow (no overlay). */
export function expectBannerNotOverlay(): void {
  const banner = screen.getByRole("alert");
  expect(banner).toHaveTextContent(SAVE_FAILED);
  expect(isOverlay(banner)).toBe(false);
}
