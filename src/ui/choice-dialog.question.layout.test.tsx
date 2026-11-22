// T093: the question mode on small windows (RF-045, RF-052, RF-076). Jest has no layout engine, so
// these tests check the configuration; the geometry is checked on a device (T094, T079). CONTRACT
// the Implementer must meet in the question mode of src/ui/choice-dialog.tsx:
//   - the card has testID `choice-dialog-card` and a numeric flattened `maxHeight`, no larger than
//     the window height from `useWindowDimensions`, so it follows a rotation;
//   - the options are inside a vertical ScrollView with testID `choice-dialog-scroll`, which is
//     inside the card and is not disabled (`scrollEnabled` is not false, no `horizontal`);
//   - «Cancelar» is inside the card, apart from the options.
import "@/i18n";
import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ReactElement } from "react";

import { ChoiceDialog } from "@/ui/choice-dialog";
import { restoreWindow, setWindow } from "../../tests/support/window-size";

const STARTERS = ["Ana", "Eva", "Luis", "Marta", "Pau"].map((name, index) => ({
  key: name.toLowerCase(),
  label: String(index + 4),
  secondLine: `${name} Fernández Rodríguez-Ñúñez`,
}));

const TITLE = "¿A quién sustituye como titular?";

function choice(): ReactElement {
  return (
    <ChoiceDialog
      mode="question"
      visible
      title={TITLE}
      options={STARTERS}
      stage="chooseReplaced:0:P2"
      onChoose={jest.fn()}
      onCancel={jest.fn()}
    />
  );
}

const cardHeight = (): unknown =>
  StyleSheet.flatten(screen.getByTestId("choice-dialog-card").props.style)
    ?.maxHeight;

afterEach(restoreWindow);

describe("question dialog, small windows", () => {
  it.each([
    ["a phone in portrait", 375, 667],
    ["a phone in landscape", 667, 375],
    ["a tablet in landscape", 1024, 768],
    ["a tablet in portrait", 768, 1024],
  ])(
    "RF-045 RF-052 RF-076: on %s five options with a second line each and «Cancelar» are rendered inside a card that scrolls and is no taller than the window",
    async (_kind, width, height) => {
      await setWindow(width, height);
      await render(choice());
      const card = within(screen.getByTestId("choice-dialog-card"));
      const scroll = screen.getByTestId("choice-dialog-scroll");
      expect(card.getByTestId("choice-dialog-scroll")).toBe(scroll);
      expect(scroll.props.scrollEnabled).not.toBe(false);
      expect(scroll.props.horizontal).toBeFalsy();
      for (const { secondLine } of STARTERS) {
        expect(within(scroll).getByText(secondLine)).toBeOnTheScreen();
      }
      expect(within(scroll).getAllByRole("button")).toHaveLength(5);
      expect(card.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
      expect(typeof cardHeight()).toBe("number");
      expect(cardHeight() as number).toBeLessThanOrEqual(height);
    },
  );

  it("RF-052 RF-076: «Cancelar» is not one of the options inside the scroll", async () => {
    await setWindow(667, 375);
    await render(choice());
    const scroll = within(screen.getByTestId("choice-dialog-scroll"));
    expect(scroll.getAllByRole("button")).toHaveLength(5);
    expect(scroll.queryByText("Cancelar")).toBeNull();
  });

  it("RF-076: rotating from 375 × 667 to 667 × 375 with the dialog open keeps it, with the same options, and the card follows the new height", async () => {
    await setWindow(375, 667);
    await render(choice());
    expect(cardHeight() as number).toBeLessThanOrEqual(667);
    await setWindow(667, 375);
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    expect(typeof cardHeight()).toBe("number");
    expect(cardHeight() as number).toBeLessThanOrEqual(375);
  });
});
