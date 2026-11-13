import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Cell } from "@/domain/grid";
import type { CellView } from "@/state/match-view-grid";
import { LIGHT_RED } from "@/ui/theme/warning-colors";
import { useColumnTitle } from "./column-header";

export interface GridCellProps {
  readonly cell: CellView;
  readonly playerName: string;
  readonly cellWidth: number;
  readonly rowHeight: number;
  readonly onTapCell: (cell: Cell) => void;
}

// The basketball mark itself, not a user text: it is the same in every language.
const MARK = "X";

/** One cell in one of three states; the accessible label always matches what is drawn (RF-043). */
export function GridCell({
  cell,
  playerName,
  cellWidth,
  rowHeight,
  onTapCell,
}: GridCellProps): ReactElement {
  const { t } = useTranslation();
  const period = useColumnTitle(cell.cell.column);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`grid.cell.${cell.state}`, {
        name: playerName,
        period,
      })}
      onPress={() => onTapCell(cell.cell)}
      style={[
        styles.cell,
        { width: cellWidth, height: rowHeight },
        cell.isLightRed ? styles.lightRed : null,
      ]}
    >
      {cell.state === "empty" ? null : (
        <View style={cell.state === "sub" ? styles.circle : undefined}>
          <Text style={styles.mark}>{MARK}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: "center", justifyContent: "center" },
  lightRed: { backgroundColor: LIGHT_RED },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { fontSize: 20, fontWeight: "700" },
});
