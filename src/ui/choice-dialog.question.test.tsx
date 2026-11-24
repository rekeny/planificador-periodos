// T093: the question mode of the choice dialog (RF-045, RF-050, RF-052). Options come first and
// «Cancelar» is drawn apart under them; «Cancelar», a tap on the backdrop and the Android Back
// button (`onRequestClose`) each call `onCancel` once; a tap inside the card does not. The mode
// does not exist yet in `src/ui/choice-dialog.tsx`. Texts arrive already translated from the caller;
// only «Cancelar» (`common.cancel`) is written by the dialog. The stage, double-tap and content
// changes are in choice-dialog.question.stage.test.tsx, the layout in ...question.layout.test.tsx.
import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ChoiceDialog } from "@/ui/choice-dialog";
import {
  confirmation,
  pressBack,
  pressCancel,
  spies as confirmSpies,
  tapOutside,
} from "../../tests/support/choice-dialog-harness";

interface Option {
  readonly key: string;
  readonly label: string;
  readonly secondLine?: string;
}

interface Callbacks {
  readonly onChoose: jest.Mock;
  readonly onCancel: jest.Mock;
}

const TITLE = "¿Entra de cambio o es titular en lugar de otro?";
const OPTIONS: readonly Option[] = [
  { key: "sub", label: "Entra de cambio" },
  { key: "starter", label: "Titular en lugar de otro" },
];

const callbacks = (): Callbacks => ({
  onChoose: jest.fn(),
  onCancel: jest.fn(),
});

function question(
  { onChoose, onCancel }: Callbacks,
  shown: {
    readonly message?: string;
    readonly options?: readonly Option[];
    readonly visible?: boolean;
  } = {},
): ReactElement {
  return (
    <ChoiceDialog
      mode="question"
      visible={shown.visible ?? true}
      title={TITLE}
      message={shown.message}
      options={shown.options ?? OPTIONS}
      stage="subOrStarter:0:P2"
      onChoose={onChoose}
      onCancel={onCancel}
    />
  );
}

/** Every text the dialog draws, in tree order. */
const texts = (): string[] =>
  screen.queryAllByText(/./).map((node) => String(node.props.children));

describe("question dialog", () => {
  it("RF-045 E-011: shows the title, every option and «Cancelar», found by role and text", async () => {
    await render(question(callbacks()));
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Entra de cambio" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Titular en lugar de otro" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it("RF-045: shows nothing while it is not visible, options included, and shows it again when it becomes visible", async () => {
    const view = await render(question(callbacks(), { visible: false }));
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    await view.rerender(question(callbacks()));
    expect(
      screen.getByRole("button", { name: "Entra de cambio" }),
    ).toBeOnTheScreen();
    await view.rerender(question(callbacks(), { visible: false }));
    expect(
      screen.queryByRole("button", { name: "Entra de cambio" }),
    ).toBeNull();
  });

  it.each([
    ["sub", "Entra de cambio"],
    ["starter", "Titular en lugar de otro"],
  ])(
    "RF-045 RF-046 RF-047 E-011: pressing the option %s calls onChoose once with its key and never onCancel",
    async (key, label) => {
      const { onChoose, onCancel } = callbacks();
      await render(question({ onChoose, onCancel }));
      await fireEvent.press(screen.getByRole("button", { name: label }));
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(key);
      expect(onCancel).not.toHaveBeenCalled();
    },
  );

  it("RF-052: «Cancelar» is drawn apart after the three options of the menu and is never one of them", async () => {
    const { onChoose, onCancel } = callbacks();
    const menu: readonly Option[] = [
      { key: "starter", label: "Titular" },
      { key: "sub", label: "Entró de cambio" },
      { key: "remove", label: "Quitar" },
    ];
    await render(question({ onChoose, onCancel }, { options: menu }));
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    ["Titular", "Entró de cambio", "Quitar", "Cancelar"].forEach(
      (text, index) => expect(buttons[index]).toHaveTextContent(text),
    );
    await pressCancel();
    expect(onChoose).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an empty message", ""],
    ["no message", undefined],
  ])(
    "RF-045 RF-050: with %s it draws only the title, the options and «Cancelar»",
    async (_kind, message) => {
      await render(question(callbacks(), { message }));
      expect(texts()).toEqual([
        TITLE,
        "Entra de cambio",
        "Titular en lugar de otro",
        "Cancelar",
      ]);
    },
  );

  it("RF-050: a message is drawn between the title and the options", async () => {
    await render(
      question(callbacks(), {
        message: "Si ha salido por un cambio, déjala marcada",
      }),
    );
    expect(texts()).toEqual([
      TITLE,
      "Si ha salido por un cambio, déjala marcada",
      "Entra de cambio",
      "Titular en lugar de otro",
      "Cancelar",
    ]);
  });

  it("RF-047: an option with a second line shows both lines, as a starter's number and name", async () => {
    const starters: readonly Option[] = [
      { key: "eva", label: "7", secondLine: "Eva Ríos" },
    ];
    await render(question(callbacks(), { options: starters }));
    expect(texts()).toEqual([TITLE, "7", "Eva Ríos", "Cancelar"]);
  });

  it.each([
    ["Ana López", "ana"],
    ["Eva Ríos", "eva"],
  ])(
    "RF-047: of two options with the same label, pressing the one whose second line is %s calls onChoose with %s",
    async (secondLine, key) => {
      const { onChoose, onCancel } = callbacks();
      const twins: readonly Option[] = [
        { key: "ana", label: "7", secondLine: "Ana López" },
        { key: "eva", label: "7", secondLine: "Eva Ríos" },
      ];
      await render(question({ onChoose, onCancel }, { options: twins }));
      expect(screen.getAllByText("7")).toHaveLength(2);
      await fireEvent.press(screen.getByText(secondLine));
      expect(onChoose.mock.calls).toEqual([[key]]);
    },
  );

  it("RF-045: «Cancelar» calls onCancel once and onChoose never", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(question({ onChoose, onCancel }));
    expect(
      screen.getByRole("button", { name: "Entra de cambio" }),
    ).toBeOnTheScreen();
    await pressCancel();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-045 RF-050: a tap on the backdrop outside the card calls onCancel once and onChoose never", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(question({ onChoose, onCancel }));
    await tapOutside();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-045 RF-050: the Android Back button (onRequestClose) calls onCancel once and onChoose never", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(question({ onChoose, onCancel }));
    pressBack();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-045: a tap inside the card, on the card, the title or the message, does not call onCancel", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(
      question({ onChoose, onCancel }, { message: "Elige una opción" }),
    );
    await fireEvent.press(screen.getByTestId("choice-dialog-card"));
    await fireEvent.press(screen.getByText(TITLE));
    await fireEvent.press(screen.getByText("Elige una opción"));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
  });

  it("RF-045: the screen closing while the dialog is open runs no callback and does not fail", async () => {
    const { onChoose, onCancel } = callbacks();
    await render(question({ onChoose, onCancel }));
    expect(
      screen.getByRole("button", { name: "Entra de cambio" }),
    ).toBeOnTheScreen();
    await screen.unmount();
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("RF-034 RF-045: the confirm mode still ignores a tap outside and the Back button, next to the question mode", async () => {
    const { onConfirm, onCancel } = confirmSpies();
    await render(confirmation({ onConfirm, onCancel }));
    await tapOutside();
    pressBack();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Quitar" })).toBeOnTheScreen();
  });
});
