import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface NoTimeProps {
  readonly onAdd: () => void;
}

// The time field when the match has no time: the text «Sin hora» and the way to add one.
export function NoTime({ onAdd }: NoTimeProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.box}>
      <Text>{t("match.noTime")}</Text>
      <Pressable accessibilityRole="button" onPress={onAdd} style={styles.add}>
        <Text>{t("match.addTime")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  add: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
});
