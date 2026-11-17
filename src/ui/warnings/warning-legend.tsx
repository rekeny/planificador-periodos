import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { LegendItem } from "@/domain/legend";

interface WarningLegendProps {
  readonly items: readonly LegendItem[];
  // The screen measures the legend to size the grid (T083).
  readonly onLayout?: (event: LayoutChangeEvent) => void;
  // One wrapping row on tablets, to save height (RF-081).
  readonly compact?: boolean;
}

/** One line per kind of warning on the grid, only the kinds present (RF-087). */
export function WarningLegend({
  items,
  onLayout,
  compact = false,
}: WarningLegendProps): ReactElement | null {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <View
      testID="warning-legend"
      onLayout={onLayout}
      style={[styles.legend, compact && styles.row]}
    >
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
  row: { flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
  line: { fontSize: 13 },
});
