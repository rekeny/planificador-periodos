import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { LegendItem } from "@/domain/legend";

interface WarningLegendProps {
  readonly items: readonly LegendItem[];
  // The screen measures the legend to size the grid (T083).
  readonly onLayout?: (event: LayoutChangeEvent) => void;
}

/** One line per kind of warning on the grid, only the kinds present (RF-087). */
export function WarningLegend({
  items,
  onLayout,
}: WarningLegendProps): ReactElement | null {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <View testID="warning-legend" onLayout={onLayout} style={styles.legend}>
      {items.map((item) => (
        <Text key={item} style={styles.line}>
          {t(`warning.${item}`)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { marginHorizontal: 16, marginBottom: 8, gap: 2 },
  line: { fontSize: 13 },
});
