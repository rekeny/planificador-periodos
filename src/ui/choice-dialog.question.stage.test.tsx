// T093: the question mode when its content changes while it stays open, and its double-tap guard
// (RF-045, RF-047, RF-050, RF-052). The guard is the `useRef` of the confirm mode, now re-armed
// whenever `stage` changes (Codex review of 2026-11-21), not only when `visible` changes, so the
// next question shown in the same open dialog can be answered. The mode does not exist yet.
import "@/i18n";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { ChoiceDialog } from "@/ui/choice-dialog";
import { pressCancel } from "../../tests/support/choice-dialog-harness";

interface Shown {
  readonly stage: string;
  readonly title: string;
  readonly message?: string;
  readonly options: readonly { readonly key: string; readonly label: string }[];
  readonly visible?: boolean;
}

const QUESTION: Shown = {
  stage: "subOrStarter:0:P2",
  title: "¿Entra de cambio o es titular en lugar de otro?",
  options: [
    { key: "sub", label: "Entra de cambio" },
    { key: "starter", label: "Titular en lugar de otro" },
  ],
};
const CHOICE: Shown = {
  stage: "chooseReplaced:0:P2",
  title: "¿A quién sustituye como titular?",
  options: [
    { key: "eva", label: "Eva" },
    { key: "luis", label: "Luis" },
  ],
};
const REMINDER: Shown = {
  stage: "confirmRemoveStarter:4:P3",
  title: "Si ha salido por un cambio, déjala marcada",
  options: [{ key: "remove", label: "Quitar de todos modos" }],
};

interface Spies {
  readonly onChoose: jest.Mock;
  readonly onCancel: jest.Mock;
}

const spies = (): Spies => ({ onChoose: jest.fn(), onCancel: jest.fn() });

function dialog(shown: Shown, { onChoose, onCancel }: Spies): ReactElement {
  return (
    <ChoiceDialog
      mode="question"
      visible={shown.visible ?? true}
      title={shown.title}
      message={shown.message}
      options={shown.options}
      stage={shown.stage}
      onChoose={onChoose}
      onCancel={onCancel}
    />
  );
}

const press = (label: string): Promise<void> =>
  fireEvent.press(screen.getByRole("button", { name: label }));

/** The host `Modal`s drawn now: the dialog must always be exactly one, and open. */
const modals = (): { visible: unknown }[] =>
  screen.container
    .queryAll((node) => node.type === "Modal")
    .map((node) => ({ visible: node.props.visible }));

describe("question dialog, content that changes while it stays open", () => {
  it("RF-045 RF-047: new props while visible show the new title and options, drop the old ones, and the one Modal stays visible", async () => {
    const view = await render(dialog(QUESTION, spies()));
    const [before] = screen.container.queryAll((node) => node.type === "Modal");
    expect(modals()).toEqual([{ visible: true }]);
    await view.rerender(dialog(CHOICE, spies()));
    expect(screen.getByText(CHOICE.title)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Eva" })).toBeOnTheScreen();
    expect(screen.queryByText(QUESTION.title)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Entra de cambio" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    expect(modals()).toEqual([{ visible: true }]);
    // The same native window, not a new one: closing and opening another fails on iOS.
    const [after] = screen.container.queryAll((node) => node.type === "Modal");
    expect(after).toBe(before);
  });

  it("RF-050 RF-052: a message that appears or disappears with the new props is followed, and the dialog stays visible", async () => {
    const view = await render(dialog(QUESTION, spies()));
    await view.rerender(
      dialog(
        { ...REMINDER, message: "No se borra la marca del cambio" },
        spies(),
      ),
    );
    expect(
      screen.getByText("No se borra la marca del cambio"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Quitar de todos modos" }),
    ).toBeOnTheScreen();
    await view.rerender(dialog(CHOICE, spies()));
    expect(screen.queryByText("No se borra la marca del cambio")).toBeNull();
    expect(modals()).toEqual([{ visible: true }]);
  });

  it("RF-045 RF-047: «Cancelar» of the new content calls onCancel once, like the first one", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await view.rerender(dialog(CHOICE, { onChoose, onCancel }));
    expect(screen.getByRole("button", { name: "Eva" })).toBeOnTheScreen();
    await pressCancel();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe("question dialog, double-tap guard keyed by stage", () => {
  it("RF-045: a double tap on an option within a stage calls onChoose once", async () => {
    const { onChoose, onCancel } = spies();
    await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Entra de cambio");
    await press("Entra de cambio");
    await press("Titular en lugar de otro");
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("sub");
  });

  it("RF-045: two taps that reach the handler before React re-renders call onChoose once", async () => {
    const { onChoose, onCancel } = spies();
    await render(dialog(QUESTION, { onChoose, onCancel }));
    const tap = screen.getByRole("button", { name: "Entra de cambio" }).props
      .onClick as (event: object) => void;
    await act(() => {
      tap({});
      tap({});
    });
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it("RF-047 (Codex 2026-11-21): choose, the stage changes with the dialog still open, choose again: onChoose is called once more, with the new key", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Titular en lugar de otro");
    await view.rerender(dialog(CHOICE, { onChoose, onCancel }));
    await press("Eva");
    expect(onChoose.mock.calls).toEqual([["starter"], ["eva"]]);
  });

  it("RF-047: a double tap within the new stage still calls onChoose once", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Titular en lugar de otro");
    await view.rerender(dialog(CHOICE, { onChoose, onCancel }));
    await press("Eva");
    await press("Eva");
    await press("Luis");
    expect(onChoose.mock.calls).toEqual([["starter"], ["eva"]]);
  });

  it("RF-045 RF-047: the same stage with new props does not re-arm the guard", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Entra de cambio");
    await view.rerender(
      dialog(
        { ...QUESTION, title: "Otro título", options: CHOICE.options },
        {
          onChoose,
          onCancel,
        },
      ),
    );
    await press("Eva");
    expect(onChoose.mock.calls).toEqual([["sub"]]);
  });

  it("RF-045 RF-050 RF-052: three stages in a row, question, choice and question again, each answered once even if tapped twice", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Titular en lugar de otro");
    await press("Titular en lugar de otro");
    await view.rerender(dialog(CHOICE, { onChoose, onCancel }));
    await press("Luis");
    await press("Luis");
    await view.rerender(dialog(REMINDER, { onChoose, onCancel }));
    await press("Quitar de todos modos");
    await press("Quitar de todos modos");
    expect(onChoose.mock.calls).toEqual([["starter"], ["luis"], ["remove"]]);
  });

  it("RF-045: closing the dialog and opening it again on the same stage still re-arms the guard, as in the confirm mode", async () => {
    const { onChoose, onCancel } = spies();
    const view = await render(dialog(QUESTION, { onChoose, onCancel }));
    await press("Entra de cambio");
    await view.rerender(
      dialog({ ...QUESTION, visible: false }, { onChoose, onCancel }),
    );
    await view.rerender(dialog(QUESTION, { onChoose, onCancel }));
    await press("Entra de cambio");
    expect(onChoose.mock.calls).toEqual([["sub"], ["sub"]]);
  });
});
