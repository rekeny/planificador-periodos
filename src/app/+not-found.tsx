import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Expo Router shows this route for an address that matches no screen. `replace` leaves nothing
// behind to go back to: the unknown address is not worth keeping in the history.
export default function NotFoundRoute(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <Text style={styles.message}>{t("notFound.screenMessage")}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/")}
        style={styles.back}
      >
        <Text style={styles.backText}>{t("notFound.back")}</Text>
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
  },
  message: { fontSize: 16, textAlign: "center" },
  back: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  backText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});
