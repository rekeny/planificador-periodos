import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { Column } from "@/domain/column";
import type { ColumnView } from "@/state/match-view-grid";

export interface ColumnHeaderProps {
  readonly column: ColumnView;
  readonly cellWidth: number;
  readonly height: number;
}

/** The text of a column header: «P1»… for a period, «PR1»… for an overtime (RF-042). */
export function useColumnTitle(column: Column): string {
  const { t } = useTranslation();
  const key =
    column.kind === "period" ? "grid.header.period" : "grid.header.overtime";
  return t(key, { number: column.number });
}

export function ColumnHeader({
  column,
  cellWidth,
  height,
}: ColumnHeaderProps): ReactElement {
  const title = useColumnTitle(column.column);
  return (
    <View style={[styles.header, { width: cellWidth, height }]}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, fontWeight: "600" },
});
