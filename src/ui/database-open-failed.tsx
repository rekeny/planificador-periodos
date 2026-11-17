import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Loaded here as well as in the root layout: this message must read right even if it is the first
// thing drawn, before any screen has loaded the texts.
import "@/i18n";

interface DatabaseOpenFailedProps {
  retrying: boolean;
  onRetry: () => void;
}

/** Start-up message when the data cannot be opened; it never shows the error itself (RF-085). */
export function DatabaseOpenFailed({
  retrying,
  onRetry,
}: DatabaseOpenFailedProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Text style={styles.message}>{t("db.openFailed")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: retrying }}
        disabled={retrying}
        onPress={onRetry}
        style={[styles.button, retrying && styles.disabled]}
      >
        <Text style={styles.label}>{t("db.retry")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  message: { fontSize: 16, textAlign: "center" },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 24,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#1f6feb",
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, color: "#ffffff", textAlign: "center" },
});
