import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

/** Shown by any screen whose route parameter is malformed or points to something gone. */
export function NotFound(): ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Text style={styles.message}>{t("notFound.message")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: { fontSize: 16, textAlign: "center" },
});
