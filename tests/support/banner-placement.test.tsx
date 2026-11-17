// Self-test of tests/support/banner-placement.ts (RF-085): the helper still flags an absolute
// banner, or an absolute wrapper, inside a screen host like the one the native-stack mock draws,
// and does not flag that screen host itself.
import { render, screen } from "@testing-library/react-native";
import { createElement } from "react";
import type { ReactElement } from "react";
import { Text, View } from "react-native";

import { isOverlay } from "./banner-placement";

const FILL = { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 };
const ABSOLUTE = { position: "absolute", bottom: 16 };

function inScreen(banner: ReactElement, wrapperStyle?: object): ReactElement {
  return createElement(
    "RNSScreen",
    { style: FILL },
    <View style={wrapperStyle}>{banner}</View>,
  );
}

const alert = (style?: object) => (
  <Text accessibilityRole="alert" style={style}>
    x
  </Text>
);

async function overlay(tree: ReactElement): Promise<boolean> {
  await render(tree);
  return isOverlay(screen.getByRole("alert"));
}

describe("banner placement helper", () => {
  it("RF-085: a banner in normal flow in a screen host is not an overlay", async () => {
    expect(await overlay(inScreen(alert()))).toBe(false);
  });

  it("RF-085: a banner with an absolute style in a screen host is an overlay", async () => {
    expect(await overlay(inScreen(alert(ABSOLUTE)))).toBe(true);
  });

  it("RF-085: a banner inside an absolute wrapper in a screen host is an overlay", async () => {
    expect(await overlay(inScreen(alert(), ABSOLUTE))).toBe(true);
  });
});
