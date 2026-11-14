// Steps of the tests of the save-error banner in normal flow (third Codex review, finding 2,
// RF-085, RF-076). This file holds no test calls. The banner is the element with the role «alert»;
// it must not be drawn over «Guardar»: its flattened style has no `position: "absolute"`, so it
// takes its own place in the scroll content of the form.
import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";

import { inScroll } from "./form-scroll";

export const SAVE_FAILED =
  "No se ha podido guardar el cambio. Inténtalo de nuevo.";

/** The `position` of the banner on screen: undefined or «relative» when it is in normal flow. */
export function bannerPosition(): unknown {
  const banner = screen.getByRole("alert");
  return StyleSheet.flatten(banner.props.style)?.position;
}

/** After a failed save: the banner shows its text, in normal flow, and «Guardar» is still there. */
export function expectBannerInFlow(): void {
  expect(screen.getByRole("alert")).toHaveTextContent(SAVE_FAILED);
  expect(bannerPosition()).not.toBe("absolute");
  expect(inScroll().queryByRole("alert")).not.toBeNull();
  expect(inScroll().queryByRole("button", { name: "Guardar" })).not.toBeNull();
}
