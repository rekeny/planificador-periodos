import type { ReactElement } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import type { MatchView } from "@/state/match-view";
import { TABLET_STRIP_MAX_HEIGHT } from "@/ui/grid/tablet-budget";
import { CallUpRangeBanner } from "./call-up-range-banner";
import { RuleImpossibleBanner } from "./rule-impossible-banner";
import { WarningLegend } from "./warning-legend";

interface WarningStripProps {
  readonly view: MatchView;
  // On a tablet the strip is bounded so the 12 rows keep their room (RF-081).
  readonly compact: boolean;
  readonly onBannersLayout: (event: LayoutChangeEvent) => void;
  readonly onLegendLayout: (event: LayoutChangeEvent) => void;
}

/** The banners and the legend above the grid; their heights go to the grid's layout (T083). */
export function WarningStrip({
  view,
  compact,
  onBannersLayout,
  onLegendLayout,
}: WarningStripProps): ReactElement {
  const hasBanners = view.ruleImpossible || view.callUpRange !== null;
  const content = (
    <>
      {hasBanners ? (
        <View
          testID="warning-banners"
          onLayout={onBannersLayout}
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
        onLayout={onLegendLayout}
        compact={compact}
      />
    </>
  );
  if (!compact) return content;
  return (
    <View testID="warning-strip" style={styles.strip}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { maxHeight: TABLET_STRIP_MAX_HEIGHT, overflow: "hidden" },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
