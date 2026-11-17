import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { NAME_MAX_LENGTH } from "./input-limits";

interface TeamNameFieldsProps {
  readonly home: string;
  readonly away: string;
  readonly onHomeChange: (text: string) => void;
  readonly onAwayChange: (text: string) => void;
  readonly onMyTeamAs: (side: "home" | "away") => void;
}

// Split out of the match form so no component passes 60 lines.
export function TeamNameFields({
  home,
  away,
  onHomeChange,
  onAwayChange,
  onMyTeamAs,
}: TeamNameFieldsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.label}>{t("match.field.home")}</Text>
      <TextInput
        accessibilityLabel={t("match.field.home")}
        value={home}
        onChangeText={onHomeChange}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      <Text style={styles.label}>{t("match.field.away")}</Text>
      <TextInput
        accessibilityLabel={t("match.field.away")}
        value={away}
        onChangeText={onAwayChange}
        maxLength={NAME_MAX_LENGTH}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => onMyTeamAs("home")}
        style={styles.quick}
      >
        <Text>{t("match.quickHome")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onMyTeamAs("away")}
        style={styles.quick}
      >
        <Text>{t("match.quickAway")}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  quick: {
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
});
