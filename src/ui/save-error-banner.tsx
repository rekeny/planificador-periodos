import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

// Always in normal flow, so nothing under it is covered and the buttons stay tappable (RF-085).
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#b00020",
    color: "#ffffff",
    fontSize: 16,
  },
});
