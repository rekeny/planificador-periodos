import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TextInput, View } from "react-native";

import { SCORE_MAX_LENGTH } from "./input-limits";

interface ScoreFieldsProps {
  readonly home: string;
  readonly away: string;
  readonly onHomeChange: (text: string) => void;
  readonly onAwayChange: (text: string) => void;
}

// Only digits reach the draft: the keyboard hint is not enough, a paste or a hardware keyboard
// can still type anything.
function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

export function ScoreFields({
  home,
  away,
  onHomeChange,
  onAwayChange,
}: ScoreFieldsProps): ReactElement {
  const { t } = useTranslation();
  const label = t("match.field.score");
  return (
    <View style={styles.row}>
      <TextInput
        accessibilityLabel={label}
        value={home}
        onChangeText={(text) => onHomeChange(digitsOnly(text))}
        keyboardType="number-pad"
        maxLength={SCORE_MAX_LENGTH}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel={label}
        value={away}
        onChangeText={(text) => onAwayChange(digitsOnly(text))}
        keyboardType="number-pad"
        maxLength={SCORE_MAX_LENGTH}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
