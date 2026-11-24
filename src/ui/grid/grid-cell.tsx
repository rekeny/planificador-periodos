import { useRef } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import {
  GestureDetector,
  useLongPressGesture,
} from "react-native-gesture-handler";
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
  readonly onLongPressCell: (cell: Cell) => void;
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
  onLongPressCell,
}: GridCellProps): ReactElement {
  const { t } = useTranslation();
  const period = useColumnTitle(cell.cell.column);
  // The release that ends a long press still reaches `onPress`: the flag, reset when a finger goes
  // down, makes that tap not count (RF-052). The callback runs on the JavaScript thread, no worklet.
  const longPressed = useRef(false);
  const longPress = useLongPressGesture({
    testID: `cell-long-press:${cell.key}`,
    runOnJS: true,
    enabled: cell.state !== "empty",
    onActivate: () => {
      longPressed.current = true;
      onLongPressCell(cell.cell);
    },
  });
  return (
    <GestureDetector gesture={longPress}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`grid.cell.${cell.state}`, {
          name: playerName,
          period,
        })}
        onPressIn={() => {
          longPressed.current = false;
        }}
        onPress={() => {
          if (!longPressed.current) onTapCell(cell.cell);
        }}
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
    </GestureDetector>
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
