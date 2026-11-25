import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActionButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly inHeader: boolean;
}

/** One of the match screen's own buttons, in the native header or in the body. */
export function ActionButton({
  label,
  onPress,
  inHeader,
}: ActionButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={inHeader ? styles.headerAction : styles.action}
    >
      <Text style={inHeader ? styles.headerActionText : styles.actionText}>
        {label}
      </Text>
    </Pressable>
  );
}

/** «Convocatoria» and «Editar» side by side above the grid, when the header has no room (RF-076). */
export function MatchBodyActions({
  id,
}: {
  readonly id: number;
}): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <ActionButton
        label={t("callUp.title")}
        onPress={() => router.push(`/matches/${id}/call-up`)}
        inHeader={false}
      />
      <ActionButton
        label={t("common.edit")}
        onPress={() => router.push(`/matches/${id}/edit`)}
        inHeader={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, margin: 16 },
  action: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  actionText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  headerAction: { paddingHorizontal: 12, paddingVertical: 10 },
  headerActionText: { color: "#1d4ed8", fontSize: 16, fontWeight: "600" },
});
