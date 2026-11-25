import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { QuestionDialog } from "./choice-dialog-question";
import type { QuestionDialogProps } from "./choice-dialog-question";
import { ALL_ORIENTATIONS } from "./modal-orientations";

export interface ConfirmDialogProps {
  readonly mode: "confirm";
  readonly visible: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export type ChoiceDialogProps = ConfirmDialogProps | QuestionDialogProps;

export function ChoiceDialog(props: ChoiceDialogProps): ReactElement {
  return props.mode === "question" ? (
    <QuestionDialog {...props} />
  ) : (
    <ConfirmDialog {...props} />
  );
}

// Closes only with its own buttons: tapping outside does nothing and `onRequestClose`, which
// `Modal` calls for the Android Back button, is an empty function (D44, D46).
function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  const { t } = useTranslation();
  const { visible, title, message, confirmLabel, onConfirm, onCancel } = props;
  // A ref, not state: two taps can reach the handler before React re-renders.
  const confirmed = useRef(false);
  useEffect(() => {
    // Open again means a new question: confirming works again.
    confirmed.current = false;
  }, [visible]);

  const confirm = (): void => {
    if (confirmed.current) {
      return;
    }
    confirmed.current = true;
    onConfirm();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      supportedOrientations={ALL_ORIENTATIONS}
      onRequestClose={() => undefined}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message === "" ? null : (
            <Text style={styles.message}>{message}</Text>
          )}
          <View style={styles.buttons}>
            <Pressable accessibilityRole="button" onPress={onCancel}>
              <Text style={styles.cancel}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirm}>
              <Text style={styles.confirm}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#111111" },
  message: { marginTop: 8, fontSize: 16, color: "#333333" },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginTop: 20,
  },
  cancel: { padding: 8, fontSize: 16, color: "#333333" },
  confirm: { padding: 8, fontSize: 16, fontWeight: "600", color: "#b00020" },
});
