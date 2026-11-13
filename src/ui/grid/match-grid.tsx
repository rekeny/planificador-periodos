import { useState, type ReactElement } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import type { Cell } from "@/domain/grid";
import type { MatchView } from "@/state/match-view";
import { ColumnHeader } from "./column-header";
import { GridCell } from "./grid-cell";
import { gridLayout, type GridLayout } from "./grid-layout";
import { PlayerColumn } from "./player-column";

export interface MatchGridProps {
  readonly view: MatchView;
  readonly onTapCell: (cell: Cell) => void;
  // What the screen measures above the rows, in points.
  readonly chromeHeight?: number;
  readonly bannersHeight?: number;
  readonly legendHeight?: number;
}

const PLAYER_COLUMN_WIDTH = 100;
const HEADER_HEIGHT = 44;

function useLayout(props: MatchGridProps, headerRowHeight: number): GridLayout {
  const { width, height } = useWindowDimensions();
  const { view } = props;
  const overtimes = view.columns.filter(
    (column) => column.column.kind === "overtime",
  ).length;
  return gridLayout({
    windowWidth: width,
    windowHeight: height,
    periods: view.columns.length - overtimes,
    overtimes,
    players: view.rows.length,
    playerColumnWidth: PLAYER_COLUMN_WIDTH,
    chromeHeight: props.chromeHeight ?? 0,
    bannersHeight: props.bannersHeight ?? 0,
    legendHeight: props.legendHeight ?? 0,
    headerRowHeight,
  });
}

function Rows({
  view,
  layout,
  onTapCell,
}: {
  readonly view: MatchView;
  readonly layout: GridLayout;
  readonly onTapCell: (cell: Cell) => void;
}): ReactElement {
  return (
    <>
      {view.rows.map((row) => (
        <View key={row.entryId} style={styles.line}>
          {row.cells.map((cell) => (
            <GridCell
              key={cell.key}
              cell={cell}
              playerName={row.name}
              cellWidth={layout.cellWidth}
              rowHeight={layout.rowHeight}
              onTapCell={onTapCell}
            />
          ))}
        </View>
      ))}
    </>
  );
}

/** The grid: the player column stays fixed while the headers and cells scroll sideways (RF-076, RF-077). */
export function MatchGrid(props: MatchGridProps): ReactElement {
  const { view, onTapCell } = props;
  const [headerRowHeight, setHeaderRowHeight] = useState(0);
  const layout = useLayout(props, headerRowHeight);
  return (
    <ScrollView
      testID="grid-vertical-scroll"
      scrollEnabled={layout.verticalScroll}
    >
      <View style={styles.line}>
        <View style={{ width: PLAYER_COLUMN_WIDTH }}>
          {/* Same height as the header row, so the rows of both sides line up. */}
          <View style={{ height: headerRowHeight }} />
          <PlayerColumn rows={view.rows} rowHeight={layout.rowHeight} />
        </View>
        <ScrollView
          testID="grid-horizontal-scroll"
          horizontal
          scrollEnabled={layout.horizontalScroll}
        >
          <View>
            <View
              testID="grid-header-row"
              style={styles.line}
              onLayout={(event) =>
                setHeaderRowHeight(event.nativeEvent.layout.height)
              }
            >
              {view.columns.map((column) => (
                <ColumnHeader
                  key={column.key}
                  column={column}
                  cellWidth={layout.cellWidth}
                  height={HEADER_HEIGHT}
                />
              ))}
            </View>
            <Rows view={view} layout={layout} onTapCell={onTapCell} />
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row" },
});
