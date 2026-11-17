import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface GridButtonsProps {
  readonly canUndo: boolean;
  readonly canRemoveOvertime: boolean;
  readonly onUndo: () => void;
  readonly onAddOvertime: () => void;
  readonly onRemoveOvertime: () => void;
}

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}

function ToolbarButton({
  label,
  onPress,
  disabled,
}: ButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <Text
        numberOfLines={2}
        style={[styles.text, disabled === true && styles.disabled]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The three grid buttons; the screen puts them in the header or under the grid (RF-055, RF-058, RF-059). */
export function GridButtons(props: GridButtonsProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <ToolbarButton
        label={t("grid.undo")}
        onPress={props.onUndo}
        disabled={!props.canUndo}
      />
      <ToolbarButton
        label={t("grid.addOvertime")}
        onPress={props.onAddOvertime}
      />
      {props.canRemoveOvertime ? (
        <ToolbarButton
          label={t("grid.removeOvertime")}
          onPress={props.onRemoveOvertime}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Wraps onto a second line: three buttons with an overtime were wider than a 375 pt phone.
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: { fontSize: 16, fontWeight: "600", color: "#1d4ed8" },
  disabled: { color: "#9ca3af" },
});
