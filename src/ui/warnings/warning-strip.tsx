import { useState, type ReactElement } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import type { MatchView } from "@/state/match-view";
import {
  PHONE_PORTRAIT_STRIP_MAX_HEIGHT,
  PHONE_STRIP_MAX_HEIGHT,
  TABLET_STRIP_MAX_HEIGHT,
} from "@/ui/grid/tablet-budget";
import { CallUpRangeBanner } from "./call-up-range-banner";
import { RuleImpossibleBanner } from "./rule-impossible-banner";
import { WarningLegend } from "./warning-legend";

interface WarningStripProps {
  readonly view: MatchView;
  // Chips and short legend, as on a tablet or a phone in landscape (RF-076).
  readonly compact: boolean;
  // The strip is bounded on every device so the grid keeps its room (RF-081); phones in landscape get less.
  readonly tablet: boolean;
  readonly onBannersLayout: (event: LayoutChangeEvent) => void;
  readonly onLegendLayout: (event: LayoutChangeEvent) => void;
}

/** The banners and the legend above the grid; their heights go to the grid's layout (T083). */
export function WarningStrip({
  view,
  compact,
  tablet,
  onBannersLayout,
  onLegendLayout,
}: WarningStripProps): ReactElement {
  const hasBanners = view.ruleImpossible || view.callUpRange !== null;
  // The strip scrolls inside its bound only when its content is taller than the bound; an unreported
  // part counts 0, and before any report nothing scrolls.
  const [bannersHeight, setBannersHeight] = useState(0);
  const [legendHeight, setLegendHeight] = useState(0);
  // A tablet, a phone in landscape (`compact`) and a phone in portrait each have their own bound.
  const maxHeight = tablet
    ? TABLET_STRIP_MAX_HEIGHT
    : compact
      ? PHONE_STRIP_MAX_HEIGHT
      : PHONE_PORTRAIT_STRIP_MAX_HEIGHT;
  const scrollEnabled = bannersHeight + legendHeight > maxHeight;
  const handleBannersLayout = (event: LayoutChangeEvent): void => {
    setBannersHeight(event.nativeEvent.layout.height);
    onBannersLayout(event);
  };
  const handleLegendLayout = (event: LayoutChangeEvent): void => {
    setLegendHeight(event.nativeEvent.layout.height);
    onLegendLayout(event);
  };
  const content = (
    <>
      {hasBanners ? (
        <View
          testID="warning-banners"
          onLayout={handleBannersLayout}
          style={compact ? styles.chips : undefined}
        >
          <RuleImpossibleBanner
            ruleImpossible={view.ruleImpossible}
            compact={compact}
          />
          <CallUpRangeBanner warning={view.callUpRange} compact={compact} />
        </View>
      ) : null}
      <WarningLegend
        items={view.legend}
        onLayout={handleLegendLayout}
        compact={compact}
      />
    </>
  );
  return (
    <View testID="warning-strip" style={{ maxHeight }}>
      <ScrollView
        testID="warning-strip-scroll"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        scrollEnabled={scrollEnabled}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
