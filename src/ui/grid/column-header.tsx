import type { TFunction } from "i18next";
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
export function columnTitle(column: Column, t: TFunction): string {
  const key =
    column.kind === "period" ? "grid.header.period" : "grid.header.overtime";
  return t(key, { number: column.number });
}

export function useColumnTitle(column: Column): string {
  const { t } = useTranslation();
  return columnTitle(column, t);
}

// Only «≠» when a header is both incomplete and inconsistent: the state already gives one kind (RF-066).
function HeaderMark({
  column,
}: {
  readonly column: ColumnView;
}): ReactElement | null {
  const { t } = useTranslation();
  if (column.headerMark === null) return null;
  return (
    <Text testID={`column-mark-${column.key}`} style={styles.mark}>
      {t(
        column.headerMark === "incomplete"
          ? "grid.header.incompleteMark"
          : "grid.header.inconsistentMark",
      )}
    </Text>
  );
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
      <HeaderMark column={column} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", justifyContent: "center" },
  mark: { fontSize: 14, fontWeight: "700" },
  text: { fontSize: 16, fontWeight: "600" },
});
