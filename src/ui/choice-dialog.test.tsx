// T045: the confirmation dialog (RF-034). It closes only with its own buttons: tapping outside and
// the Android Back button (React Native's `Modal` calls `onRequestClose`) do nothing (D44, D46).
// The component `src/ui/choice-dialog.tsx` does not exist yet; helpers in tests/support.
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import es from "@/i18n/es.json";
import {
  Screen,
  confirmation,
  pressBack,
  pressCancel,
  spies,
  tapOutside,
} from "../../tests/support/choice-dialog-harness";

const confirmButton = () => screen.getByRole("button", { name: "Quitar" });

describe("confirmation dialog", () => {
  it("RF-034: the cancel text lives in es.json as common.cancel, «Cancelar»", () => {
    expect(es.common).toHaveProperty("cancel", "Cancelar");
  });

  it("RF-034: shows the title, the message, the confirm button and «Cancelar», found by role and text", async () => {
    await render(confirmation(spies()));
    expect(
      screen.getByText("¿Quitar a Ana de la convocatoria?"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Tiene marcas en este partido y se borrarán."),
    ).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it("RF-034: shows nothing while it is not visible", async () => {
    await render(confirmation(spies(), {}, false));
    expect(screen.queryByText("¿Quitar a Ana de la convocatoria?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("RF-034: pressing the confirm button runs the confirm callback once and never the cancel one", async () => {
    const { onConfirm, onCancel } = spies();
    await render(confirmation({ onConfirm, onCancel }));
    await fireEvent.press(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("RF-034: «Cancelar» runs the cancel callback once and the confirm callback never", async () => {
    const { onConfirm, onCancel } = spies();
    await render(confirmation({ onConfirm, onCancel }));
    await pressCancel();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("RF-034: two quick presses on the confirm button, with the dialog still open, run the callback once", async () => {
    const { onConfirm, onCancel } = spies();
    await render(<Screen onConfirm={onConfirm} onCancel={onCancel} />);
    await fireEvent.press(confirmButton());
    await fireEvent.press(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("RF-034: two quick presses on the confirm button, in the same turn before the screen closes it, run the callback once", async () => {
    const { onConfirm, onCancel } = spies();
    await render(
      <Screen onConfirm={onConfirm} onCancel={onCancel} closeOnConfirm />,
    );
    const button = confirmButton();
    // Both taps reach the handler before React re-renders, as two fast taps on a phone can.
    const tap = button.props.onClick as (event: object) => void;
    await act(() => {
      tap({});
      tap({});
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("RF-034: the Android Back button (onRequestClose) neither closes the dialog nor runs any callback", async () => {
    const { onConfirm, onCancel } = spies();
    await render(confirmation({ onConfirm, onCancel }));
    pressBack();
    pressBack();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("¿Quitar a Ana de la convocatoria?"),
    ).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
  });

  it("RF-034: tapping outside the dialog neither closes it nor runs any callback", async () => {
    const { onConfirm, onCancel } = spies();
    await render(confirmation({ onConfirm, onCancel }));
    await tapOutside();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
  });

  it("RF-034: open, «Cancelar», open again and confirm: each callback runs once, and the second opening works", async () => {
    const { onConfirm, onCancel } = spies();
    await render(
      <Screen onConfirm={onConfirm} onCancel={onCancel} closeOnConfirm />,
    );
    await pressCancel();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Abrir" }));
    await fireEvent.press(confirmButton());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("RF-034: after confirming and opening it again, confirming a second time runs the callback again", async () => {
    const { onConfirm, onCancel } = spies();
    await render(
      <Screen onConfirm={onConfirm} onCancel={onCancel} closeOnConfirm />,
    );
    await fireEvent.press(confirmButton());
    await fireEvent.press(screen.getByRole("button", { name: "Abrir" }));
    await fireEvent.press(confirmButton());
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("RF-034: an empty message still shows the title and both buttons", async () => {
    await render(confirmation(spies(), { message: "" }));
    expect(
      screen.getByText("¿Quitar a Ana de la convocatoria?"),
    ).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it.each([
    ["accents and an eñe", "¿Quitar a María José Ñúñez de la convocatoria?"],
    ["a 40-character name", `¿Quitar a ${"Á".repeat(40)} de la convocatoria?`],
  ])(
    "RF-034: a title with %s is shown whole and the buttons stay",
    async (_kind, title) => {
      await render(confirmation(spies(), { title }));
      expect(screen.getByText(title)).toBeOnTheScreen();
      expect(confirmButton()).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Cancelar" }),
      ).toBeOnTheScreen();
    },
  );

  it("RF-034: rotating the device with the dialog open keeps it and its buttons", async () => {
    await render(confirmation(spies()));
    await act(() => {
      Dimensions.set({
        window: { width: 800, height: 400, scale: 2, fontScale: 1 },
      });
    });
    expect(
      screen.getByText("¿Quitar a Ana de la convocatoria?"),
    ).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeOnTheScreen();
  });

  it("RF-034: the screen closing while the dialog is open runs no callback and does not fail", async () => {
    const { onConfirm, onCancel } = spies();
    await render(confirmation({ onConfirm, onCancel }));
    await screen.unmount();
    expect(screen.queryByText("¿Quitar a Ana de la convocatoria?")).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
