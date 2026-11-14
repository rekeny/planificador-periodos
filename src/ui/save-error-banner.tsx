import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";

// In normal flow by default, so «Guardar» stays visible and tappable after a failed save (RF-085).
// `floating` draws it over the screen (absolute) for the screens that have no form to push down.
export function SaveErrorBanner({
  floating = false,
}: {
  readonly floating?: boolean;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <Text
      accessibilityRole="alert"
      style={floating ? [styles.banner, styles.floating] : styles.banner}
    >
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
  floating: { position: "absolute", left: 16, right: 16, bottom: 16 },
});
