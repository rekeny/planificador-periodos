import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import { ALL_ORIENTATIONS } from "./modal-orientations";

// The backdrop's padding on every side; the card's maximum height leaves room for it.
const BACKDROP_PADDING = 24;

export interface QuestionOption {
  readonly key: string;
  readonly label: string;
  readonly secondLine?: string;
}

export interface QuestionDialogProps {
  readonly mode: "question";
  readonly visible: boolean;
  readonly title: string;
  readonly message?: string;
  readonly options: readonly QuestionOption[];
  // Names the question being shown; when it changes, the next one can be answered.
  readonly stage: string;
  readonly onChoose: (key: string) => void;
  readonly onCancel: () => void;
}

// Closes with «Cancelar», a tap outside the card or the Android Back button, always through
// `onCancel`. The options scroll inside the card when they do not fit the window (RF-076).
export function QuestionDialog(props: QuestionDialogProps): ReactElement {
  const { t } = useTranslation();
  const { visible, title, message, options, stage, onChoose, onCancel } = props;
  const { height } = useWindowDimensions();
  // A ref, not state: two taps can reach the handler before React re-renders.
  const chosen = useRef(false);
  useEffect(() => {
    // Open again, or the next question of the same open dialog: choosing works again.
    chosen.current = false;
  }, [visible, stage]);

  const choose = (key: string): void => {
    if (chosen.current) {
      return;
    }
    chosen.current = true;
    onChoose(key);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      supportedOrientations={ALL_ORIENTATIONS}
      onRequestClose={onCancel}
    >
      <Pressable accessible={false} style={styles.backdrop} onPress={onCancel}>
        <Pressable
          accessible={false}
          testID="choice-dialog-card"
          style={[
            styles.card,
            { maxHeight: Math.max(0, height - 2 * BACKDROP_PADDING) },
          ]}
          onPress={() => undefined}
        >
          <Text style={styles.title}>{title}</Text>
          {message === undefined || message === "" ? null : (
            <Text style={styles.message}>{message}</Text>
          )}
          <ScrollView testID="choice-dialog-scroll" style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                style={styles.option}
                onPress={() => choose(option.key)}
              >
                <Text style={styles.label}>{option.label}</Text>
                {option.secondLine === undefined ? null : (
                  <Text style={styles.secondLine}>{option.secondLine}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onCancel}>
            <Text style={styles.cancel}>{t("common.cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: BACKDROP_PADDING,
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
  options: { flexGrow: 0, marginTop: 12 },
  option: { paddingVertical: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#111111" },
  secondLine: { fontSize: 14, color: "#333333" },
  cancel: {
    padding: 8,
    marginTop: 8,
    alignSelf: "flex-end",
    fontSize: 16,
    color: "#333333",
  },
});
