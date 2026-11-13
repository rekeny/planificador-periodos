import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { RowView } from "@/state/match-view";

export interface PlayerColumnProps {
  readonly rows: readonly RowView[];
  readonly rowHeight: number;
}

/** The fixed column of the grid: number, name and «J n · D n» of each row, in the order given (RF-077). */
export function PlayerColumn({
  rows,
  rowHeight,
}: PlayerColumnProps): ReactElement {
  const { t } = useTranslation();
  return (
    <View>
      {rows.map((row) => (
        <View key={row.entryId} style={[styles.row, { height: rowHeight }]}>
          <View style={styles.identity}>
            <Text style={styles.number}>{row.number}</Text>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {row.name}
            </Text>
          </View>
          <Text style={styles.counter}>
            {t("grid.counter", {
              played: row.counter.played,
              rested: row.counter.rested,
            })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: "center", paddingHorizontal: 8 },
  identity: { flexDirection: "row", alignItems: "center", gap: 6 },
  number: { fontSize: 16, fontWeight: "700" },
  name: { fontSize: 14, flexShrink: 1 },
  counter: { fontSize: 12 },
});
