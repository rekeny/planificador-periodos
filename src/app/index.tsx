import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen(): ReactElement {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("app.title")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600" },
});
