// Helpers for the tests of the confirmation dialog (T045). This file holds no test calls.
// Assumption (the component does not exist yet): `src/ui/choice-dialog.tsx` exports `ChoiceDialog`,
// which in its confirmation mode takes `mode="confirm"`, `visible`, `title`, `message`,
// `confirmLabel`, `onConfirm` and `onCancel`. The texts arrive already translated from the caller;
// only «Cancelar» (`common.cancel`) is written by the dialog. If the Implementer picks other names
// the change is only in this file. Only the dialog is the real thing; nothing is mocked.
import "@/i18n";
import { fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";
import type { ReactElement } from "react";
import { Pressable, Text, View } from "react-native";

import { ChoiceDialog } from "@/ui/choice-dialog";

export interface Spies {
  readonly onConfirm: jest.Mock;
  readonly onCancel: jest.Mock;
}

export interface DialogTexts {
  readonly title?: string;
  readonly message?: string;
  readonly confirmLabel?: string;
}

export function spies(): Spies {
  return { onConfirm: jest.fn(), onCancel: jest.fn() };
}

/** The dialog alone, controlled by `visible`, with plain spies as callbacks. */
export function confirmation(
  { onConfirm, onCancel }: Spies,
  texts: DialogTexts = {},
  visible = true,
): ReactElement {
  return (
    <ChoiceDialog
      mode="confirm"
      visible={visible}
      title={texts.title ?? "¿Quitar a Ana de la convocatoria?"}
      message={texts.message ?? "Tiene marcas en este partido y se borrarán."}
      confirmLabel={texts.confirmLabel ?? "Quitar"}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/**
 * A screen like the ones that will use the dialog: «Abrir» shows it, «Cancelar» closes it, and
 * confirming closes it only when `closeOnConfirm` is true (to prove a double press by itself).
 */
export function Screen({
  onConfirm,
  onCancel,
  closeOnConfirm = false,
}: Spies & { readonly closeOnConfirm?: boolean }): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Abrir</Text>
      </Pressable>
      {confirmation(
        {
          onConfirm: jest.fn(() => {
            onConfirm();
            setOpen(!closeOnConfirm);
          }),
          onCancel: jest.fn(() => {
            onCancel();
            setOpen(false);
          }),
        } as Spies,
        {},
        open,
      )}
    </View>
  );
}

export async function pressCancel(): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
}

type Host = ReturnType<typeof screen.getByText>;

function modalHost(): Host {
  const [modal] = screen.container.queryAll((node) => node.type === "Modal");
  if (modal === undefined) {
    throw new Error("The dialog renders no Modal");
  }
  return modal;
}

/** What the Android Back button does: React Native's `Modal` calls its `onRequestClose` prop. */
export function pressBack(): void {
  const { onRequestClose } = modalHost().props as {
    onRequestClose?: () => void;
  };
  expect(typeof onRequestClose).toBe("function");
  onRequestClose?.();
}

/**
 * Taps outside the card. React Native's `Modal` has no backdrop of its own, so this presses the
 * `Modal` and every touchable of the dialog that is not a button (a backdrop would be one).
 */
export async function tapOutside(): Promise<void> {
  const modal = modalHost();
  const touchables = modal.queryAll(
    (node) =>
      node.type === "View" &&
      (node.props.onClick !== undefined ||
        node.props.onStartShouldSetResponder !== undefined) &&
      node.props.accessibilityRole !== "button" &&
      node.props.role !== "button",
  );
  await fireEvent.press(modal);
  for (const node of touchables) {
    await fireEvent.press(node);
  }
}
