import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from "react-native";

import type { Cell } from "@/domain/grid";
import type { MatchView } from "@/state/match-view";
import { ColumnHeader } from "./column-header";
import { GridCell } from "./grid-cell";
import { gridLayout, viewportLayout, type ViewportLayout } from "./grid-layout";
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

type Size = { readonly width: number; readonly height: number };

function useLayout(
  props: MatchGridProps,
  headerRowHeight: number,
  viewport: Size | null,
): ViewportLayout {
  const { width, height } = useWindowDimensions();
  const { view } = props;
  const overtimes = view.columns.filter(
    (column) => column.column.kind === "overtime",
  ).length;
  if (viewport !== null) {
    // Measured: what the container really has wins over every guess (Codex F2).
    return viewportLayout({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      periods: view.columns.length - overtimes,
      overtimes,
      players: view.rows.length,
      playerColumnWidth: PLAYER_COLUMN_WIDTH,
      headerRowHeight,
    });
  }
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

// F-A2. When the columns get narrower (the last overtime is removed) Android keeps the old horizontal
// offset, and with the columns fitting the scroll is off, so the first columns stayed behind the
// player column with no way back. The grid keeps its offset and, when the largest one shrinks below
// it, scrolls back to that. It does nothing while the offset is in range.
function useOffsetInRange(
  columns: number,
  cellWidth: number,
  viewport: Size | null,
): {
  scrollRef: RefObject<ScrollViewInstance | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const largest =
    viewport === null
      ? null
      : Math.max(
          0,
          columns * cellWidth - (viewport.width - PLAYER_COLUMN_WIDTH),
        );
  useEffect(() => {
    if (largest !== null && offset.current > largest) {
      scrollRef.current?.scrollTo({ x: largest, animated: false });
      offset.current = largest;
    }
  }, [largest]);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    offset.current = event.nativeEvent.contentOffset.x;
  };
  return { scrollRef, onScroll };
}

function Rows({
  view,
  layout,
  onTapCell,
}: {
  readonly view: MatchView;
  readonly layout: ViewportLayout;
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

function HeaderRow({
  view,
  cellWidth,
  onMeasured,
}: {
  readonly view: MatchView;
  readonly cellWidth: number;
  readonly onMeasured: (height: number) => void;
}): ReactElement {
  return (
    <View
      testID="grid-header-row"
      style={styles.line}
      onLayout={(event) => onMeasured(event.nativeEvent.layout.height)}
    >
      {view.columns.map((column) => (
        <ColumnHeader
          key={column.key}
          column={column}
          cellWidth={cellWidth}
          height={HEADER_HEIGHT}
        />
      ))}
    </View>
  );
}

/** The grid: the player column stays fixed while the headers and cells scroll sideways (RF-076, RF-077). */
export function MatchGrid(props: MatchGridProps): ReactElement {
  const { view, onTapCell } = props;
  const [headerRowHeight, setHeaderRowHeight] = useState(0);
  const [viewport, setViewport] = useState<Size | null>(null);
  const layout = useLayout(props, headerRowHeight, viewport);
  const { scrollRef, onScroll } = useOffsetInRange(
    view.columns.length,
    layout.cellWidth,
    viewport,
  );
  return (
    <View
      testID="grid-viewport"
      style={styles.viewport}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
      }}
    >
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
            ref={scrollRef}
            testID="grid-horizontal-scroll"
            horizontal
            scrollEnabled={layout.horizontalScroll}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View>
              <HeaderRow
                view={view}
                cellWidth={layout.cellWidth}
                onMeasured={setHeaderRowHeight}
              />
              <Rows view={view} layout={layout} onTapCell={onTapCell} />
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  line: { flexDirection: "row" },
});
