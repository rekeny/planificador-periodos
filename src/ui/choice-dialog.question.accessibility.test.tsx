// F-D3-02 (found by the T066 Maestro run on iOS): the backdrop and the card of the question
// dialog are plain Pressables, so they are accessibility elements by default. On iOS and for
// VoiceOver they merge the text of everything inside them into ONE element, and «Cancelar»,
// which sits outside the ScrollView, can be neither found nor tapped as its own button. Both
// must have `accessible={false}`; the options and «Cancelar» stay buttons, and a tap outside
// the card still closes while a tap inside does nothing.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ChoiceDialog } from "@/ui/choice-dialog";
import {
  pressCancel,
  tapOutside,
} from "../../tests/support/choice-dialog-harness";

const TITLE = "Ana, P3: X, titular";
const MENU = [
  { key: "starter", label: "Titular" },
  { key: "sub", label: "Entró de cambio" },
  { key: "remove", label: "Quitar" },
];

interface Callbacks {
  readonly onChoose: jest.Mock;
  readonly onCancel: jest.Mock;
}

const callbacks = (): Callbacks => ({
  onChoose: jest.fn(),
  onCancel: jest.fn(),
});

function menu({ onChoose, onCancel }: Callbacks): ReactElement {
  return (
    <ChoiceDialog
      mode="question"
      visible
      title={TITLE}
      options={MENU}
      stage="cellMenu:0:P3"
      onChoose={onChoose}
      onCancel={onCancel}
    />
  );
}

/** The host element of the card, the one with testID `choice-dialog-card`. */
const card = (): ReturnType<typeof screen.getByTestId> =>
  screen.getByTestId("choice-dialog-card");

/** The host element of the backdrop: the one that wraps the card. */
function backdrop(): NonNullable<ReturnType<typeof card>["parent"]> {
  const parent = card().parent;
  if (parent === null) {
    throw new Error("The card has no backdrop around it");
  }
  return parent;
}

describe("question dialog, accessibility", () => {
  it("RF-045 RF-050 RF-052 RF-076 F-D3-02: the card is not an accessibility element, so its content is not merged into one", async () => {
    await render(menu(callbacks()));
    expect(card().props.accessible).toBe(false);
  });

  it("RF-045 RF-050 RF-052 RF-076 F-D3-02: the backdrop is not an accessibility element either", async () => {
    await render(menu(callbacks()));
    expect(
      backdrop().props.onClick ?? backdrop().props.onResponderRelease,
    ).toBeDefined();
    expect(backdrop().props.accessible).toBe(false);
  });

  it("RF-052 F-D3-02: every option and «Cancelar» are accessibility elements of their own, found by role and name", async () => {
    await render(menu(callbacks()));
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    ["Titular", "Entró de cambio", "Quitar", "Cancelar"].forEach((name) => {
      const button = screen.getByRole("button", { name });
      expect(button).toBeOnTheScreen();
      expect(button.props.accessible).not.toBe(false);
    });
  });

  it("RF-045 RF-052 F-D3-02: pressing «Cancelar» still calls onCancel once and onChoose never", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(menu({ onChoose, onCancel }));
    await pressCancel();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-052 F-D3-02: pressing an option still calls onChoose once with its key", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(menu({ onChoose, onCancel }));
    await fireEvent.press(screen.getByRole("button", { name: "Quitar" }));
    expect(onChoose.mock.calls).toEqual([["remove"]]);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("RF-045 RF-050 F-D3-02: a tap outside the card still calls onCancel once and onChoose never", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(menu({ onChoose, onCancel }));
    await tapOutside();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-045 F-D3-02: a tap inside the card, on the card or the title, still does nothing", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(menu({ onChoose, onCancel }));
    await fireEvent.press(card());
    await fireEvent.press(screen.getByText(TITLE));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
  });
});
