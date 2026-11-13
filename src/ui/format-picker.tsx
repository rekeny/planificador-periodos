import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Format } from "@/domain/format";
import { formatOptions } from "@/state/format-options";

interface FormatPickerProps {
  readonly value: Format;
  readonly onChange: (format: Format) => void;
}

export function FormatPicker({
  value,
  onChange,
}: FormatPickerProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {formatOptions.map((format) => {
        const label = t("format.option", { count: format });
        const chosen = format === value;
        return (
          <Pressable
            key={format}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: chosen }}
            onPress={() => onChange(format)}
            style={[styles.option, chosen ? styles.chosen : null]}
          >
            <Text style={chosen ? styles.chosenText : null}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 8,
  },
  chosen: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  chosenText: { color: "#ffffff", fontWeight: "600" },
});
