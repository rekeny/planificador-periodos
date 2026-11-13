import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

// Drawn over the screen (absolute), so showing it never moves the form (RF-085).
export function SaveErrorBanner(): ReactElement {
  const { t } = useTranslation();
  return (
    <Text accessibilityRole="alert" style={styles.banner}>
      {t("error.saveFailed")}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#b00020",
    color: "#ffffff",
    fontSize: 16,
  },
});
